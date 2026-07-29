const Disti = require('../models/disti');
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
        new winston.transports.File({ filename: 'logs/disti.log' })
    ]
});

class DistiController {
    // Get all distributors
    static async getAllDistis(req, res) {
        try {
            const { status, search } = req.query;
            
            logger.info('Get all distributors request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status, search }
            });

            const filters = {};
            if (status) filters.status = status;
            if (search) filters.search = search;

            const distis = await Disti.findAll(filters);
            
            res.json({
                success: true,
                distis,
                count: distis.length
            });
        } catch (error) {
            logger.error('Get all distributors error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get distributor by ID
    static async getDistiById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get distributor by ID request', { 
                distiId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const disti = await Disti.findById(id);
            
            if (!disti) {
                return res.status(404).json({ 
                    error: 'Distributor not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                disti
            });
        } catch (error) {
            logger.error('Get distributor by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create distributor
    static async createDisti(req, res) {
        try {
            const { name, email_support, phone, partner_link, status, notes } = req.body;
            
            logger.info('Create distributor request', { 
                distiName: name,
                creator: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate required fields
            if (!name) {
                return res.status(400).json({ 
                    error: 'Distributor name is required', 
                    success: false 
                });
            }

            // Validate status if provided
            const validStatuses = ['Active', 'Inactive'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            // Check if distributor with same name already exists
            const existingDisti = await Disti.findByNameCaseInsensitive(name);
            if (existingDisti) {
                return res.status(400).json({ 
                    error: 'Distributor with this name already exists', 
                    success: false 
                });
            }

            const disti = await Disti.create({
                name,
                email_support: email_support || null,
                phone: phone || null,
                partner_link: partner_link || null,
                status: status || 'Active',
                notes: notes || null
            });

            // Log the creation
            await AuditLog.create({
                entity_type: 'Disti',
                entity_id: disti.id,
                action: 'Create',
                changes: { new: disti },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Distributor created successfully', { 
                distiId: disti.id,
                distiName: disti.name,
                createdBy: req.currentUser?.email 
            });

            res.status(201).json({
                success: true,
                disti
            });
        } catch (error) {
            logger.error('Create distributor error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update distributor
    static async updateDisti(req, res) {
        try {
            const { id } = req.params;
            const { name, email_support, phone, partner_link, status, notes } = req.body;
            
            logger.info('Update distributor request', { 
                distiId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate status if provided
            const validStatuses = ['Active', 'Inactive'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            const existingDisti = await Disti.findById(id);
            if (!existingDisti) {
                return res.status(404).json({ 
                    error: 'Distributor not found', 
                    success: false 
                });
            }

            // Check for duplicate name (if name is being updated)
            if (name && (!existingDisti.name || name.toLowerCase() !== existingDisti.name.toLowerCase())) {
                const duplicateDisti = await Disti.findByNameCaseInsensitive(name);
                if (duplicateDisti && duplicateDisti.id.toString() !== id.toString()) {
                    return res.status(400).json({ 
                        error: 'Distributor with this name already exists', 
                        success: false 
                    });
                }
            }

            // Update distributor
            const updatedDisti = await Disti.update(id, {
                name: name || existingDisti.name,
                email_support: email_support !== undefined ? email_support : existingDisti.email_support,
                phone: phone !== undefined ? phone : existingDisti.phone,
                partner_link: partner_link !== undefined ? partner_link : existingDisti.partner_link,
                status: status || existingDisti.status,
                notes: notes !== undefined ? notes : existingDisti.notes
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'Disti',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingDisti,
                    new: updatedDisti
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Distributor updated successfully', { 
                distiId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                disti: updatedDisti
            });
        } catch (error) {
            logger.error('Update distributor error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Delete distributor
    static async deleteDisti(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Delete distributor request', { 
                distiId: id,
                deleter: req.currentUser?.email,
                ip: req.ip 
            });

            const existingDisti = await Disti.findById(id);
            if (!existingDisti) {
                return res.status(404).json({ 
                    error: 'Distributor not found', 
                    success: false 
                });
            }

            // Check if distributor is being used in any order lines (optional safety check)
            // You might want to add this logic later based on your business rules

            const deletedDisti = await Disti.delete(id);

            // Log the deletion
            await AuditLog.create({
                entity_type: 'Disti',
                entity_id: id,
                action: 'Delete',
                changes: { old: existingDisti },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Distributor deleted successfully', { 
                distiId: id,
                deletedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'Distributor deleted successfully',
                disti: deletedDisti
            });
        } catch (error) {
            logger.error('Delete distributor error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = DistiController;