const CustomerProduct = require('../models/customerProduct');
const Customer = require('../models/customer');
const Product = require('../models/product');
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
        new winston.transports.File({ filename: 'logs/customerProduct.log' })
    ]
});

class CustomerProductController {
    // Get all customer products for a specific customer
    static async getCustomerProducts(req, res) {
        try {
            const { customerId } = req.params;
            const { status } = req.query;
            
            logger.info('Get customer products request', { 
                customerId,
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status }
            });

            // Verify customer exists
            const customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            const filters = { customer_id: customerId };
            if (status) filters.status = status;

            const customerProducts = await CustomerProduct.findAll(filters);
            
            res.json({
                success: true,
                customerProducts,
                count: customerProducts.length
            });
        } catch (error) {
            logger.error('Get customer products error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get all customer products with optional filters
    static async getAllCustomerProducts(req, res) {
        try {
            const { status, product_id, customer_id, expiringSoon } = req.query;
            
            logger.info('Get all customer products request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status, product_id, customer_id, expiringSoon }
            });

            const filters = {};
            if (status) filters.status = status;
            if (product_id) filters.product_id = product_id;
            if (customer_id) filters.customer_id = customer_id;
            if (expiringSoon) filters.expiringSoon = parseInt(expiringSoon);

            const customerProducts = await CustomerProduct.findAll(filters);
            
            res.json({
                success: true,
                customerProducts,
                count: customerProducts.length
            });
        } catch (error) {
            logger.error('Get all customer products error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get customer product by ID
    static async getCustomerProductById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get customer product by ID request', { 
                customerProductId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const customerProduct = await CustomerProduct.findById(id);
            
            if (!customerProduct) {
                return res.status(404).json({ 
                    error: 'Customer product not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                customerProduct
            });
        } catch (error) {
            logger.error('Get customer product by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get expiring customer products
    static async getExpiringCustomerProducts(req, res) {
        try {
            const { days = 30 } = req.query; // Default to 30 days
            const daysToCheck = parseInt(days);
            
            logger.info('Get expiring customer products request', { 
                daysToCheck,
                user: req.currentUser?.email,
                ip: req.ip 
            });

            // Get customer products that expire within the specified days
            const customerProducts = await CustomerProduct.findAll({
                expiringSoon: daysToCheck
            });
            
            res.json({
                success: true,
                customerProducts,
                count: customerProducts.length,
                daysChecked: daysToCheck
            });
        } catch (error) {
            logger.error('Get expiring customer products error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update customer product
    static async updateCustomerProduct(req, res) {
        try {
            const { id } = req.params;
            const { 
                quantity, 
                start_date, 
                expiration_date, 
                billing_cycle, 
                term, 
                status, 
                notes 
            } = req.body;
            
            logger.info('Update customer product request', { 
                customerProductId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate enums if provided
            const validBillingCycles = ['Monthly', 'Annual','Triennial', 'OneTime'];
            const validTerms = ['1Month', '1Year','3Years', 'Perpetual'];
            const validStatuses = ['Active', 'Expired', 'Suspended', 'Cancelled'];

            if (billing_cycle && !validBillingCycles.includes(billing_cycle)) {
                return res.status(400).json({ 
                    error: `Billing cycle must be one of: ${validBillingCycles.join(', ')}`, 
                    success: false 
                });
            }

            if (term && !validTerms.includes(term)) {
                return res.status(400).json({ 
                    error: `Term must be one of: ${validTerms.join(', ')}`, 
                    success: false 
                });
            }

            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            const existingCustomerProduct = await CustomerProduct.findById(id);
            if (!existingCustomerProduct) {
                return res.status(404).json({ 
                    error: 'Customer product not found', 
                    success: false 
                });
            }

            // Validate date constraints
            if (start_date && expiration_date && new Date(start_date) > new Date(expiration_date)) {
                return res.status(400).json({ 
                    error: 'Start date must be before or equal to expiration date', 
                    success: false 
                });
            }

            // Update customer product
            const updatedCustomerProduct = await CustomerProduct.update(id, {
                quantity: quantity !== undefined ? quantity : existingCustomerProduct.quantity,
                start_date: start_date !== undefined ? start_date : existingCustomerProduct.start_date,
                expiration_date: expiration_date !== undefined ? expiration_date : existingCustomerProduct.expiration_date,
                billing_cycle: billing_cycle !== undefined ? billing_cycle : existingCustomerProduct.billing_cycle,
                term: term !== undefined ? term : existingCustomerProduct.term,
                status: status !== undefined ? status : existingCustomerProduct.status,
                notes: notes !== undefined ? notes : existingCustomerProduct.notes
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'CustomerProduct',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingCustomerProduct,
                    new: updatedCustomerProduct
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Customer product updated successfully', { 
                customerProductId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                customerProduct: updatedCustomerProduct
            });
        } catch (error) {
            logger.error('Update customer product error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Delete customer product
    static async deleteCustomerProduct(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Delete customer product request', { 
                customerProductId: id,
                deleter: req.currentUser?.email,
                ip: req.ip 
            });

            const existingCustomerProduct = await CustomerProduct.findById(id);
            if (!existingCustomerProduct) {
                return res.status(404).json({ 
                    error: 'Customer product not found', 
                    success: false 
                });
            }

            const deletedCustomerProduct = await CustomerProduct.delete(id);

            // Log the deletion
            await AuditLog.create({
                entity_type: 'CustomerProduct',
                entity_id: id,
                action: 'Delete',
                changes: { old: existingCustomerProduct },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Customer product deleted successfully', { 
                customerProductId: id,
                deletedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'Customer product deleted successfully',
                customerProduct: deletedCustomerProduct
            });
        } catch (error) {
            logger.error('Delete customer product error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = CustomerProductController;