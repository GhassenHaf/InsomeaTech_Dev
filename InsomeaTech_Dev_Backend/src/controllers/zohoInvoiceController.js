const ZohoInvoice = require('../models/zohoInvoice');
const AuditLog = require('../models/auditLog');
const SystemSetting = require('../models/systemSetting');
const winston = require('winston');
const path = require('path');
const { log } = require('console');

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/zohoInvoice.log' })
    ]
});

class ZohoInvoiceController {
    // Get all invoices
    static async getAllInvoices(req, res) {
        try {
            logger.info('Get all invoices request', { 
                user: req.currentUser?.email,
                ip: req.ip 
            });

            const invoices = await ZohoInvoice.findAll();
            
            res.json({
                success: true,
                data: invoices,
                count: invoices.length
            });
        } catch (error) {
            logger.error('Get all invoices error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get invoice by ID
    static async getInvoiceById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get invoice by ID request', { 
                invoiceId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const invoice = await ZohoInvoice.findById(id);
            
            if (!invoice) {
                return res.status(404).json({ 
                    error: 'Invoice not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                data: invoice
            });
        } catch (error) {
            logger.error('Get invoice by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create invoice
    static async createInvoice(req, res) {
        try {
            const invoiceData = req.body;
            
            logger.info('Create invoice request', { 
                creator: req.currentUser?.email,
                ip: req.ip,
                data: invoiceData 
            });

            // Extract zoho specific fields from json_zoho if they exist
            if (invoiceData.json_zoho) {
                invoiceData.zoho_invoice_id = invoiceData.zoho_invoice_id || invoiceData.json_zoho.invoice?.invoice_id || invoiceData.json_zoho.invoice_id;
                invoiceData.zoho_invoice_number = invoiceData.zoho_invoice_number || invoiceData.json_zoho.invoice?.invoice_number || invoiceData.json_zoho.invoice_number;
            }

            // Set user_id from current user if not provided
            if (!invoiceData.user_id && req.currentUser) {
                invoiceData.user_id = req.currentUser.id;
            }

            const newInvoice = await ZohoInvoice.create(invoiceData);

            // Log the change
            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: newInvoice.id,
                action: 'Create',
                changes: {
                    new: newInvoice
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            logger.info('Invoice created successfully', { 
                invoiceId: newInvoice.id,
                createdBy: req.currentUser?.email 
            });

            res.status(201).json({
                success: true,
                data: newInvoice
            });
        } catch (error) {
            logger.error('Create invoice error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update invoice (Partial Update)
    static async updateInvoice(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            logger.info('Update invoice request', { 
                invoiceId: id,
                updater: req.currentUser?.email,
                ip: req.ip,
                updates: updateData
            });

            const existingInvoice = await ZohoInvoice.findById(id);
            if (!existingInvoice) {
                return res.status(404).json({ 
                    error: 'Invoice not found', 
                    success: false 
                });
            }

            const updatedInvoice = await ZohoInvoice.update(id, updateData);

            // Log the change
            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingInvoice,
                    new: updatedInvoice
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            logger.info('Invoice updated successfully', { 
                invoiceId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                data: updatedInvoice
            });
        } catch (error) {
            logger.error('Update invoice error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Delete invoice
    static async deleteInvoice(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Delete invoice request', { 
                invoiceId: id,
                deleter: req.currentUser?.email,
                ip: req.ip 
            });

            const existingInvoice = await ZohoInvoice.findById(id);
            if (!existingInvoice) {
                return res.status(404).json({ 
                    error: 'Invoice not found', 
                    success: false 
                });
            }

            await ZohoInvoice.delete(id);

            // Log the change
            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'Delete',
                changes: {
                    old: existingInvoice
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            logger.info('Invoice deleted successfully', { 
                invoiceId: id,
                deletedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        } catch (error) {
            logger.error('Delete invoice error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Zoho Webhook Handler
    static async handleZohoWebhook(req, res) {
        try {
            const webhookData = req.body;
            const secretHeader = req.headers['x-zoho-webhook-secret'];

            // Security Check
            if (process.env.ZOHO_WEBHOOK_SECRET && secretHeader !== process.env.ZOHO_WEBHOOK_SECRET) {
                logger.warn('Unauthorized Zoho Webhook attempt', { 
                    ip: req.ip,
                    header: secretHeader 
                });
                return res.status(401).json({ error: 'Unauthorized', success: false });
            }

            logger.info('Received Zoho Books Webhook', { 
                ip: req.ip,
                data_summary: webhookData?.invoice?.invoice_number || 'No invoice number'
            });

            // Store the data
            const newInvoice = await ZohoInvoice.create({
                zoho_invoice_id: webhookData?.invoice?.invoice_id || webhookData?.invoice_id,
                zoho_invoice_number: webhookData?.invoice?.invoice_number || webhookData?.invoice_number,
                json_zoho: webhookData,
                status: 'ReceivedZoho',
                user_id: null // Explicitly null for webhook-created invoices
            });

            // Log to Audit Log
            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: newInvoice.id,
                action: 'Create',
                changes: {
                    new: newInvoice,
                    source: 'ZohoWebhook'
                },
                ip_address: req.ip,
                user_id: null
            });

            res.status(200).json({
                success: true,
                message: 'Webhook processed and invoice stored',
                id: newInvoice.id
            });
        } catch (error) {
            logger.error('Zoho Webhook Error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // convert to xml
    static async convertToXML(req, res) {
        try {
            const { id } = req.params;
            const invoice = await ZohoInvoice.findById(id);
            if (!invoice) {
                return res.status(404).json({ 
                    error: 'Invoice not found', 
                    success: false 
                });
            }

            if (invoice.status !== 'ReceivedZoho') {
                return res.status(400).json({ 
                    error: 'Only invoices with status ReceivedZoho can be converted', 
                    success: false 
                });
            }

            const apiUrl = process.env.ZOHO_CONVERT_XML_API
            if(!apiUrl) {
                logger.error('Zoho XML conversion API URL not configured');
                return res.status(500).json({ 
                    error: 'Zoho XML conversion API URL not configured', 
                    success: false 
                });
            }

            logger.info('Calling Zoho XML conversion API', { invoiceId: id });

            const axios = require('axios');
            const response = await axios.post(apiUrl, invoice.json_zoho);

            // The response might be the XML string itself or an object containing it
            const xmlData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

            const updatedInvoice = await ZohoInvoice.update(id, {
                xml_no_sign: xmlData,
                status: 'XmlConverted'
            });

            // Log the success in errors for history
            await ZohoInvoice.appendErrorLog(id, {
                type: 'XML_CONVERSION',
                success: true,
                timestamp: new Date().toISOString()
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'ConvertXML',
                changes: {
                    old_status: invoice.status,
                    new_status: 'XmlConverted'
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            res.json({
                success: true,
                message: 'Invoice converted to XML successfully',
                data: updatedInvoice
            });
        } catch (error) {
            const { id } = req.params;
            logger.error('Convert to XML error:', error);
            
            // Log error to database for history
            const errorDetails = {
                type: 'XML_CONVERSION_ERROR',
                message: error.message,
                response: error.response?.data,
                timestamp: new Date().toISOString()
            };

            await ZohoInvoice.appendErrorLog(id, errorDetails);

            res.status(error.response?.status || 500).json({ 
                error: 'XML conversion failed', 
                details: error.response?.data || error.message,
                success: false 
            });
        }
    }

    // Get unsigned XML
    static async getUnsignedXML(req, res) {
        try {
            const { id } = req.params;
            const invoice = await ZohoInvoice.findById(id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found', success: false });

            if (!invoice.xml_no_sign) {
                return res.status(400).json({ error: 'Invoice XML content is missing', success: false });
            }

            res.json({
                success: true,
                xml_no_sign: invoice.xml_no_sign,
                xml_base64: Buffer.from(invoice.xml_no_sign).toString('base64')
            });
        } catch (error) {
            logger.error('Get unsigned XML error:', error);
            res.status(500).json({ error: 'Internal server error', success: false });
        }
    }

    // Save signed XML
    static async saveSignedXML(req, res) {
        try {
            const { id } = req.params;
            const { signedXml } = req.body;

            if (!signedXml) {
                return res.status(400).json({ error: 'Signed XML is required', success: false });
            }

            const invoice = await ZohoInvoice.findById(id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found', success: false });

            // Decode if it's base64 (Optional: depending on how frontend sends it)
            // For consistency with current backend logic, we store decoded XML
            let decodedSignedXml = signedXml;
            if (signedXml.startsWith('PD94bWw') || !signedXml.includes('<')) { // Basic check if it looks like base64
                decodedSignedXml = Buffer.from(signedXml, 'base64').toString('utf-8');
            }

            const updatedInvoice = await ZohoInvoice.update(id, {
                xml_with_sign: decodedSignedXml,
                status: 'XmlSigned'
            });

            // Append signing success to log
            await ZohoInvoice.appendErrorLog(id, {
                type: 'XML_SIGNING',
                success: true,
                timestamp: new Date().toISOString()
            });

            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'SignXML', // Reusing action name
                changes: { old_status: invoice.status, new_status: 'XmlSigned', source: 'FrontendSigning' },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            res.json({
                success: true,
                message: 'Signed XML saved successfully',
                data: updatedInvoice
            });
        } catch (error) {
            logger.error('Save signed XML error:', error);
            res.status(500).json({ error: 'Internal server error', success: false });
        }
    }

    // Get TTN Config (Dynamic)
    static async getTTNConfig(req, res) {
        try {
            const config = await SystemSetting.getTTNConfig();
            res.json({ success: true, config });
        } catch (error) {
            logger.error('Get TTN Config error:', error);
            res.status(500).json({ error: 'Internal server error', success: false });
        }
    }

    // Update TTN Submission Result (Save Attempt)
    static async updateTtnSubmit(req, res) {
        try {
            const { id } = req.params;
            const { success, agentResponse } = req.body; 

            const invoice = await ZohoInvoice.findById(id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found', success: false });

            // Prepare the log entry
            const logEntry = {
                type: 'TTN_SAVE_ATTEMPT',
                success: success,
                agent_response: agentResponse,
                timestamp: new Date().toISOString()
            };

            // Atomically append to the errors log
            const updatedInvoice = await ZohoInvoice.appendErrorLog(id, logEntry);

            // Update the status only if successful
            if (success) {
                await ZohoInvoice.update(id, { status: 'SentToTttn' });
            }

            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'SubmitToTTN',
                changes: { 
                    old_status: invoice.status, 
                    new_status: success ? 'SentToTttn' : invoice.status,
                    success: success
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            res.json({ 
                success: true, 
                message: success ? 'TTN Submission successful' : 'TTN Submission failed locally (logged)', 
                data: updatedInvoice 
            });
        } catch (error) {
            logger.error('Update TTN Submit error:', error);
            res.status(500).json({ error: 'Internal server error', success: false });
        }
    }

    // Update TTN Consultation Result
    static async updateTtnConsult(req, res) {
        try {
            const { id } = req.params;
            const { success, ttn_ref, ttn_code, agentResponse } = req.body;

            const invoice = await ZohoInvoice.findById(id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found', success: false });

            // Prepare the log entry
            const logEntry = {
                type: 'TTN_CONSULTATION',
                success: success,
                agent_response: agentResponse,
                timestamp: new Date().toISOString()
            };

            // Atomically append to the errors log
            const updatedInvoiceData = await ZohoInvoice.appendErrorLog(id, logEntry);

            // If success, update ttn details and status
            if (success) {
                const updateData = {
                    status: 'TTNApproved'
                };
                if (ttn_ref) updateData.ttn_ref = ttn_ref;
                if (ttn_code) updateData.ttn_code = ttn_code;

                await ZohoInvoice.update(id, updateData);
            }

            await AuditLog.create({
                entity_type: 'ZohoInvoice',
                entity_id: id,
                action: 'ConsultTTN',
                changes: { 
                    old_status: invoice.status, 
                    new_status: success ? 'TTNApproved' : invoice.status,
                    success: success
                },
                ip_address: req.ip,
                user_id: req.currentUser?.id
            });

            res.json({ 
                success: true, 
                message: success ? 'TTN Consultation successful' : 'TTN Consultation pending or failed (logged)', 
                data: success ? { ...updatedInvoiceData, status: 'TTNApproved', ttn_ref, ttn_code } : updatedInvoiceData
            });
        } catch (error) {
            logger.error('Update TTN Consult error:', error);
            res.status(500).json({ error: 'Internal server error', success: false });
        }
    }
}

module.exports = ZohoInvoiceController;
