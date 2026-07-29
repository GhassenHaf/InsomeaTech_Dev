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
        new winston.transports.File({ filename: 'logs/product.log' })
    ]
});

class ProductController {
    // Get all products
    static async getAllProducts(req, res) {
        try {
            const { status, category, segment, billing_cycle, term, search, page, limit } = req.query;
            
            logger.info('Get all products request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status, category, segment, billing_cycle, term, search, page, limit }
            });

            const filters = {};
            if (status) filters.status = status;
            if (category) filters.category = category;
            if (segment) filters.segment = segment;
            if (billing_cycle) filters.billing_cycle = billing_cycle;
            if (term) filters.term = term;
            if (search) filters.search = search;

            // Handle pagination
            if (limit) {
                const parsedLimit = parseInt(limit);
                const parsedPage = parseInt(page) || 1;
                filters.limit = parsedLimit;
                filters.offset = (parsedPage - 1) * parsedLimit;
            }

            const { products, total } = await Product.findAll(filters);
            
            res.json({
                success: true,
                products,
                count: total,
                // Add pagination metadata if applicable
                ...(limit && {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                })
            });
        } catch (error) {
            logger.error('Get all products error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get product by ID
    static async getProductById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get product by ID request', { 
                productId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const product = await Product.findById(id);
            
            if (!product) {
                return res.status(404).json({ 
                    error: 'Product not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                product
            });
        } catch (error) {
            logger.error('Get product by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create product
    static async createProduct(req, res) {
        try {
            const { name, sku, description, billing_cycle, term, category, list_price, segment, status } = req.body;
            
            logger.info('Create product request', { 
                productName: name,
                sku: sku,
                creator: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate required fields
            if (!name || !sku) {
                return res.status(400).json({ 
                    error: 'Product name and SKU are required', 
                    success: false 
                });
            }

            // Validate enums
            const validBillingCycles = ['Monthly', 'Annual','Triennial', 'OneTime'];
            const validTerms = ['1Month', '1Year','3Years', 'Perpetual'];
            const validStatuses = ['Active', 'Discontinued'];

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

            const product = await Product.create({
                name,
                sku,
                description: description || null,
                billing_cycle: billing_cycle || null,
                term: term || null,
                category: category || null,
                list_price: list_price || null,
                segment: segment || null,
                status: status || 'Active'
            });

            // Log the creation
            await AuditLog.create({
                entity_type: 'Product',
                entity_id: product.id,
                action: 'Create',
                changes: { new: product },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Product created successfully', { 
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                createdBy: req.currentUser?.email 
            });

            res.status(201).json({
                success: true,
                product
            });
        } catch (error) {
            logger.error('Create product error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update product
    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { name, sku, description, billing_cycle, term, category, list_price, segment, status } = req.body;
            
            logger.info('Update product request', { 
                productId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate enums
            const validBillingCycles = ['Monthly', 'Annual','Triennial', 'OneTime'];
            const validTerms = ['1Month', '1Year','3Years', 'Perpetual'];
            const validStatuses = ['Active', 'Discontinued'];

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

            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return res.status(404).json({ 
                    error: 'Product not found', 
                    success: false 
                });
            }

            // Update product
            const updatedProduct = await Product.update(id, {
                name: name || existingProduct.name,
                sku: sku || existingProduct.sku,
                description: description !== undefined ? description : existingProduct.description,
                billing_cycle: billing_cycle !== undefined ? billing_cycle : existingProduct.billing_cycle,
                term: term !== undefined ? term : existingProduct.term,
                category: category !== undefined ? category : existingProduct.category,
                list_price: list_price !== undefined ? list_price : existingProduct.list_price,
                segment: segment !== undefined ? segment : existingProduct.segment,
                status: status || existingProduct.status
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'Product',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingProduct,
                    new: updatedProduct
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Product updated successfully', { 
                productId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                product: updatedProduct
            });
        } catch (error) {
            logger.error('Update product error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Delete product
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Delete product request', { 
                productId: id,
                deleter: req.currentUser?.email,
                ip: req.ip 
            });

            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return res.status(404).json({ 
                    error: 'Product not found', 
                    success: false 
                });
            }

            // Check if product is being used in any orders (optional safety check)
            // You might want to add this logic later based on your business rules

            const deletedProduct = await Product.delete(id);

            // Log the deletion
            await AuditLog.create({
                entity_type: 'Product',
                entity_id: id,
                action: 'Delete',
                changes: { old: existingProduct },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Product deleted successfully', { 
                productId: id,
                deletedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'Product deleted successfully',
                product: deletedProduct
            });
        } catch (error) {
            logger.error('Delete product error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = ProductController;