const Customer = require('../models/customer');
const AuditLog = require('../models/auditLog');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/webhook.log' })
    ]
});

class WebhookController {
    // Handle Zoho CRM customer webhook
    static async handleZohoCustomerWebhook(req, res) {
        try {
            const webhookData = req.body;
            
            logger.info('Zoho CRM webhook received', { 
                webhookData,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Verify webhook source (optional but recommended)
            const zohoSignature = req.get('X-Zoho-Signature');
            if (zohoSignature) {
                // Add signature verification logic here if configured
                // This requires your Zoho webhook configuration
            }

            // Extract customer data from Zoho webhook
            const zohoCustomer = webhookData.data?.[0]; // Zoho sends data in array format
            if (!zohoCustomer) {
                return res.status(400).json({ 
                    error: 'Invalid Zoho webhook data format', 
                    success: false 
                });
            }

            // Map Zoho fields to our customer model
            const customerData = {
                company_name: zohoCustomer.Account_Name?.value || zohoCustomer.Organization_Name?.value || 'Unknown Company',
                email: zohoCustomer.Email?.value || zohoCustomer.Primary_Email?.value || null,
                phone: zohoCustomer.Phone?.value || zohoCustomer.Primary_Phone?.value || null,
                contact_person: zohoCustomer.Contact_Name?.value || zohoCustomer.Full_Name?.value || null,
                tenant_id: zohoCustomer.Account_No?.value || zohoCustomer.Tenant_ID?.value || null,
                status: 'Active', // Default to active when created from Zoho
                created_by: 'Zoho CRM Integration',
                source: 'Zoho'
            };

            // Check if customer already exists (by email or tenant_id)
            let existingCustomer = null;
            if (customerData.email) {
                existingCustomer = await Customer.findByEmailCaseInsensitive(customerData.email);
            }

            if (!existingCustomer && customerData.tenant_id) {
                existingCustomer = await Customer.findByTenantId(customerData.tenant_id);
            }
            let customer;
            if (existingCustomer) {
                // Update existing customer
                customer = await Customer.update(existingCustomer.id, {
                    ...customerData,
                    status: existingCustomer.status // Keep existing status
                });
                
                logger.info('Updated existing customer from Zoho webhook', { 
                    customerId: existingCustomer.id,
                    zohoId: zohoCustomer.id
                });

                // Log the update
                await AuditLog.create({
                    entity_type: 'Customer',
                    entity_id: existingCustomer.id,
                    action: 'Update',
                    changes: {
                        old: existingCustomer,
                        new: customer
                    },
                    ip_address: req.ip,
                    user_id: null // System generated
                });
            } else {
                // Create new customer
                customer = await Customer.create(customerData);
                
                logger.info('Created new customer from Zoho webhook', { 
                    customerId: customer.id,
                    zohoId: zohoCustomer.id
                });

                // Log the creation
                await AuditLog.create({
                    entity_type: 'Customer',
                    entity_id: customer.id,
                    action: 'Create',
                    changes: { new: customer },
                    ip_address: req.ip,
                    user_id: null // System generated
                });
            }

            res.json({
                success: true,
                message: 'Customer processed successfully',
                customer
            });
        } catch (error) {
            logger.error('Zoho webhook error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = WebhookController;