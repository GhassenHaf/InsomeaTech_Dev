const OrderLine = require('../models/orderLine');
const Order = require('../models/order');
const Customer = require('../models/customer');
const Product = require('../models/product');
const Disti = require('../models/disti');
const CustomerProduct = require('../models/customerProduct');
const OrderHistory = require('../models/orderHistory');
const AuditLog = require('../models/auditLog');
const { calculateExpirationDate } = require('../utils/expirationCalculator');
const emailService = require('../utils/emailService');
const User = require('../models/user');
const winston = require('winston');
const db = require('../models/database'); // Add this import

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/orderLine.log' })
    ]
});

class OrderLineController {
    // Get all order lines for an order
    static async getAllOrderLines(req, res) {
        try {
            const { orderId } = req.params;
            
            logger.info('Get all order lines request', { 
                orderId,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            // Verify order exists
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            const orderLines = await OrderLine.findAllByOrderId(orderId);
            
            res.json({
                success: true,
                orderLines,
                count: orderLines.length
            });
        } catch (error) {
            logger.error('Get all order lines error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get order line by ID
    static async getOrderLineById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get order line by ID request', { 
                orderLineId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const orderLine = await OrderLine.findById(id);
            
            if (!orderLine) {
                return res.status(404).json({ 
                    error: 'Order line not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                orderLine
            });
        } catch (error) {
            logger.error('Get order line by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create order line
    static async createOrderLine(req, res) {
        try {
            const { orderId } = req.params;
            const { product_id, disti_id, quantity, notes, expiration_date } = req.body;
            const { id: created_by } = req.currentUser;
            
            logger.info('Create order line request', { 
                orderId,
                productId: product_id,
                creator: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate required fields
            if (!product_id || !quantity || quantity <= 0) {
                return res.status(400).json({ 
                    error: 'Product ID and quantity (positive number) are required', 
                    success: false 
                });
            }

            // Verify order exists
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Verify product exists
            const product = await Product.findById(product_id);
            if (!product) {
                return res.status(404).json({ 
                    error: 'Product not found', 
                    success: false 
                });
            }

            // Verify distributor exists (if provided)
            if (disti_id) {
                const disti = await Disti.findById(disti_id);
                if (!disti) {
                    return res.status(404).json({ 
                        error: 'Distributor not found', 
                        success: false 
                    });
                }
            }

            // Calculate expiration date if not provided
            let calculatedExpirationDate = expiration_date;
            if (!calculatedExpirationDate) {
                calculatedExpirationDate = calculateExpirationDate(order.order_date, product.term);
            }

            // Create order line
            const orderLine = await OrderLine.create({
                order_id: orderId,
                product_id,
                disti_id: disti_id || null,
                quantity,
                status: 'Pending', // Default status
                expiration_date: calculatedExpirationDate,
                notes: notes || null
            });

            // Log the creation
            await AuditLog.create({
                entity_type: 'OrderLine',
                entity_id: orderLine.id,
                action: 'Create',
                changes: { new: orderLine },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: orderId,
                order_line_id: orderLine.id,
                changed_by: req.currentUser.id,
                change_type: 'Created',
                notes: `Order line created for product: ${product.name}`
            });

            logger.info('Order line created successfully', { 
                orderLineId: orderLine.id,
                orderId: orderLine.order_id,
                productId: orderLine.product_id,
                createdBy: req.currentUser?.email 
            });

            res.status(201).json({
                success: true,
                orderLine
            });
        } catch (error) {
            logger.error('Create order line error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update the method to use the db import
    static async getOrderLinesByCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const { status, product_id } = req.query;
            
            logger.info('Get order lines by customer request', { 
                customerId,
                requester: req.currentUser?.email,
                ip: req.ip,
                filters: { status, product_id }
            });

            // Verify customer exists
            const customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            // First get all orders for the customer
            const orders = await Order.findAll({ customer_id: customerId });
            const orderIds = orders.map(order => order.id);

            if (orderIds.length === 0) {
                return res.json({
                    success: true,
                    orderLines: [],
                    count: 0
                });
            }

            // Build query for order lines
            let query = `
                SELECT 
                    ol.id, ol.quantity, ol.status, ol.expiration_date, ol.activated_date, ol.notes,
                    ol.order_id, ol.product_id, ol.disti_id, ol.activated_by,
                    p.name as product_name, p.sku as product_sku,
                    d.name as disti_name,
                    u.name as activated_by_name
                FROM insomea_tech.order_lines ol
                LEFT JOIN insomea_tech.products p ON ol.product_id = p.id
                LEFT JOIN insomea_tech.distis d ON ol.disti_id = d.id
                LEFT JOIN insomea_tech.users u ON ol.activated_by = u.id
                WHERE ol.order_id = ANY($1)
            `;
            
            const params = [orderIds];
            
            if (status) {
                query += ` AND ol.status = $2`;
                params.push(status);
            }
            
            if (product_id) {
                const paramIndex = status ? 3 : 2;
                query += ` AND ol.product_id = $${paramIndex}`;
                params.push(product_id);
            }
                        
            const result = await db.query(query, params);
            
            res.json({
                success: true,
                orderLines: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            logger.error('Get order lines by customer error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update order line
    static async updateOrderLine(req, res) {
        try {
            const { id } = req.params;
            const { quantity, notes, disti_id, status, expiration_date } = req.body;
            const { id: updated_by } = req.currentUser;
            
            logger.info('Update order line request', { 
                orderLineId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            const existingOrderLine = await OrderLine.findById(id);
            if (!existingOrderLine) {
                return res.status(404).json({ 
                    error: 'Order line not found', 
                    success: false 
                });
            }

            // Verify distributor exists (if provided)
            if (disti_id) {
                const disti = await Disti.findById(disti_id);
                if (!disti) {
                    return res.status(404).json({ 
                        error: 'Distributor not found', 
                        success: false 
                    });
                }
            }

            // Validate expiration date if provided
            if (expiration_date) {
                const order = await Order.findById(existingOrderLine.order_id);
                if (order && new Date(expiration_date) <= new Date(order.order_date)) {
                    return res.status(400).json({ 
                        error: 'Expiration date must be after order date', 
                        success: false 
                    });
                }
            }

            // Update order line
            const updatedOrderLine = await OrderLine.update(id, {
                quantity: quantity !== undefined ? quantity : existingOrderLine.quantity,
                disti_id: disti_id !== undefined ? disti_id : existingOrderLine.disti_id,
                notes: notes !== undefined ? notes : existingOrderLine.notes,
                status: status !== undefined ? status : existingOrderLine.status,
                expiration_date: expiration_date !== undefined ? expiration_date : existingOrderLine.expiration_date
            });

            // Auto-update order status if line is UnderProcessing
            if (status === 'UnderProcessing') {
                const order = await Order.findById(existingOrderLine.order_id);
                if (order && order.status_order === 'Pending') {
                    await Order.update(order.id, {
                        status_order: 'UnderProcessing',
                        last_modified_by: req.currentUser.email
                    });

                    // Log status change in history
                    await OrderHistory.create({
                        order_id: order.id,
                        changed_by: req.currentUser.id,
                        old_status: 'Pending',
                        new_status: 'UnderProcessing',
                        change_type: 'StatusChange',
                        notes: 'Auto-updated to UnderProcessing (Order Line Ready)'
                    });
                }
            }

            // Log the change
            await AuditLog.create({
                entity_type: 'OrderLine',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingOrderLine,
                    new: updatedOrderLine
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: existingOrderLine.order_id,
                order_line_id: id,
                changed_by: req.currentUser.id,
                change_type: 'Modified',
                notes: `Order line updated by ${req.currentUser.email}`
            });

            logger.info('Order line updated successfully', { 
                orderLineId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                orderLine: updatedOrderLine
            });
        } catch (error) {
            logger.error('Update order line error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update expiration date
    static async updateExpirationDate(req, res) {
        try {
            const { id } = req.params;
            const { expiration_date } = req.body;
            const { id: updated_by } = req.currentUser;
            
            logger.info('Update order line expiration date request', { 
                orderLineId: id,
                newExpirationDate: expiration_date,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate required field
            if (!expiration_date) {
                return res.status(400).json({ 
                    error: 'Expiration date is required', 
                    success: false 
                });
            }

            const existingOrderLine = await OrderLine.findById(id);
            if (!existingOrderLine) {
                return res.status(404).json({ 
                    error: 'Order line not found', 
                    success: false 
                });
            }

            // Validate that expiration date is after order date
            const order = await Order.findById(existingOrderLine.order_id);
            if (new Date(expiration_date) <= new Date(order.order_date)) {
                return res.status(400).json({ 
                    error: 'Expiration date must be after order date', 
                    success: false 
                });
            }

            // Update expiration date
            const updatedOrderLine = await OrderLine.update(id, {
                expiration_date,
                notes: existingOrderLine.notes // Keep existing notes
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'OrderLine',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingOrderLine,
                    new: updatedOrderLine
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: existingOrderLine.order_id,
                order_line_id: id,
                changed_by: req.currentUser.id,
                change_type: 'Modified',
                field_changed: 'expiration_date',
                old_value: existingOrderLine.expiration_date,
                new_value: expiration_date,
                notes: `Expiration date updated from ${existingOrderLine.expiration_date} to ${expiration_date}`
            });

            logger.info('Order line expiration date updated successfully', { 
                orderLineId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                orderLine: updatedOrderLine
            });
        } catch (error) {
            logger.error('Update order line expiration date error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Activate order line
    static async activateOrderLine(req, res) {
        try {
            const { id } = req.params;
            const { id: activated_by } = req.currentUser;
            
            logger.info('Activate order line request', { 
                orderLineId: id,
                activator: req.currentUser?.email,
                ip: req.ip 
            });

            const existingOrderLine = await OrderLine.findById(id);
            if (!existingOrderLine) {
                return res.status(404).json({ 
                    error: 'Order line not found', 
                    success: false 
                });
            }

            // Check if order line can be activated
            /*
            if (existingOrderLine.status !== 'UnderProcessing') {
                return res.status(400).json({ 
                    error: 'Order line must be in "UnderProcessing" status to activate', 
                    success: false 
                });
            }
            */

            // Get the associated order and customer
            const order = await Order.findById(existingOrderLine.order_id);
            if (!order) {
                return res.status(404).json({ 
                    error: 'Associated order not found', 
                    success: false 
                });
            }


            // Get the associated product
            const product = await Product.findById(existingOrderLine.product_id);
            if (!product) {
                return res.status(404).json({ 
                    error: 'Associated product not found', 
                    success: false 
                });
            }


            // Update order line status to activated
            await OrderLine.updateStatus(id, 'Activated', activated_by);
            const updatedOrderLine = await OrderLine.findById(id);

            console.log('test 2');


            // Create customer product record
            const customerProduct = await CustomerProduct.create({
                quantity: existingOrderLine.quantity,
                start_date: new Date(), // Current date as activation date
                expiration_date: existingOrderLine.expiration_date,
                billing_cycle: product.billing_cycle,
                term: product.term,
                status: 'Active',
                notes: `Created from order line ${id}`,
                customer_id: order.customer_id,
                product_id: existingOrderLine.product_id,
                order_line_id: id
            });

            // Log the activation
            await AuditLog.create({
                entity_type: 'OrderLine',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: { ...existingOrderLine, status: 'UnderProcessing' },
                    new: { ...updatedOrderLine }
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: existingOrderLine.order_id,
                order_line_id: id,
                changed_by: req.currentUser.id,
                old_status: 'UnderProcessing',
                new_status: 'Activated',
                change_type: 'StatusChange',
                notes: `Order line activated and customer product created (ID: ${customerProduct.id})`
            });

            // Check if all order lines are activated to update parent order status
            const allOrderLines = await OrderLine.findAllByOrderId(order.id);
            const allActivated = allOrderLines.every(line => line.status === 'Activated');

            if (allActivated && order.status_order !== 'Done') {
                await Order.update(order.id, {
                    status_order: 'Done',
                    last_modified_by: req.currentUser.email
                });
                
                await OrderHistory.create({
                    order_id: order.id,
                    changed_by: req.currentUser.id,
                    old_status: order.status_order,
                    new_status: 'Done',
                    change_type: 'StatusChange',
                    notes: 'Order marked as Done (All lines activated)'
                });

                // Send notification for Done status
                try {
                    const allUsers = await User.findAll();
                    const admins = allUsers.filter(u => u.role === 'Admin').map(u => u.email);
                    const salesPerson = allUsers.find(u => u.id === order.sales_person_id);
                    
                    const recipients = new Set([...admins]);
                    if (salesPerson && salesPerson.email) recipients.add(salesPerson.email);

                    if (recipients.size > 0) {
                        const fullOrder = await Order.findById(order.id);
                        await emailService.sendOrderNotification(Array.from(recipients), {
                            ...fullOrder,
                            last_modified_by: req.currentUser.email
                        }, 'Status Updated to Done');
                    }
                } catch (emailError) {
                    logger.error('Failed to send order completion email:', emailError);
                }
            } else if (order.status_order === 'Pending') {
                await Order.update(order.id, {
                    status_order: 'UnderProcessing',
                    last_modified_by: req.currentUser.email
                });

                await OrderHistory.create({
                    order_id: order.id,
                    changed_by: req.currentUser.id,
                    old_status: 'Pending',
                    new_status: 'UnderProcessing',
                    change_type: 'StatusChange',
                    notes: 'Order status updated to UnderProcessing (Line activated)'
                });

                // Send notification for UnderProcessing status
                try {
                    const allUsers = await User.findAll();
                    const admins = allUsers.filter(u => u.role === 'Admin').map(u => u.email);
                    const salesPerson = allUsers.find(u => u.id === order.sales_person_id);
                    
                    const recipients = new Set([...admins]);
                    if (salesPerson && salesPerson.email) recipients.add(salesPerson.email);

                    if (recipients.size > 0) {
                        const fullOrder = await Order.findById(order.id);
                        await emailService.sendOrderNotification(Array.from(recipients), {
                            ...fullOrder,
                            last_modified_by: req.currentUser.email
                        }, 'Status Updated to UnderProcessing');
                    }
                } catch (emailError) {
                    logger.error('Failed to send order processing email:', emailError);
                }
            }

            logger.info('Order line activated successfully', { 
                orderLineId: id,
                customerProductId: customerProduct.id,
                activatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                orderLine: updatedOrderLine,
                customerProduct
            });
        } catch (error) {
            logger.error('Activate order line error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Cancel order line
    static async cancelOrderLine(req, res) {
        try {
            const { id } = req.params;
            const { id: cancelled_by } = req.currentUser;
            
            logger.info('Cancel order line request', { 
                orderLineId: id,
                canceller: req.currentUser?.email,
                ip: req.ip 
            });

            const existingOrderLine = await OrderLine.findById(id);
            if (!existingOrderLine) {
                return res.status(404).json({ 
                    error: 'Order line not found', 
                    success: false 
                });
            }

            // Check if order line can be cancelled
            if (existingOrderLine.status === 'Activated') {
                return res.status(400).json({ 
                    error: 'Cannot cancel an already activated order line', 
                    success: false 
                });
            }

            // Update order line status to cancelled
            const updatedOrderLine = await OrderLine.updateStatus(id, 'Cancelled', cancelled_by);

            // Log the cancellation
            await AuditLog.create({
                entity_type: 'OrderLine',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: { ...existingOrderLine, status: existingOrderLine.status },
                    new: { ...updatedOrderLine }
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: existingOrderLine.order_id,
                order_line_id: id,
                changed_by: req.currentUser.id,
                old_status: existingOrderLine.status,
                new_status: 'Cancelled',
                change_type: 'StatusChange',
                notes: `Order line cancelled by ${req.currentUser.email}`
            });

            logger.info('Order line cancelled successfully', { 
                orderLineId: id,
                cancelledBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                orderLine: updatedOrderLine
            });
        } catch (error) {
            logger.error('Cancel order line error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = OrderLineController;