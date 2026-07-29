const OrderHistory = require('../models/orderHistory');
const AuditLog = require('../models/auditLog');
const Order = require('../models/order');
const User = require('../models/user');
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
        new winston.transports.File({ filename: 'logs/audit.log' })
    ]
});

class AuditController {
    // Get order history for a specific order
    static async getOrderHistory(req, res) {
        try {
            const { orderId } = req.params;
            
            logger.info('Get order history request', { 
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

            const orderHistory = await OrderHistory.findAllByOrderId(orderId);
            
            res.json({
                success: true,
                orderHistory,
                count: orderHistory.length
            });
        } catch (error) {
            logger.error('Get order history error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get audit logs (Admin only)
    static async getAuditLogs(req, res) {
        try {
            const { entity_type, action, user_id, date_from, date_to } = req.query;
            
            logger.info('Get audit logs request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { entity_type, action, user_id, date_from, date_to }
            });

            const filters = {};
            if (entity_type) filters.entity_type = entity_type;
            if (action) filters.action = action;
            if (user_id) filters.user_id = user_id;
            if (date_from) filters.date_from = new Date(date_from);
            if (date_to) filters.date_to = new Date(date_to);

            const auditLogs = await AuditLog.findAll(filters);
            
            res.json({
                success: true,
                auditLogs,
                count: auditLogs.length
            });
        } catch (error) {
            logger.error('Get audit logs error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Search audit logs with filters (Admin only)
    static async searchAuditLogs(req, res) {
        try {
            const { 
                entity_type, 
                entity_id, 
                action, 
                user_id, 
                date_from, 
                date_to,
                page = 1,
                limit = 50 
            } = req.query;
            
            logger.info('Search audit logs request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { entity_type, entity_id, action, user_id, date_from, date_to, page, limit }
            });

            const filters = {};
            if (entity_type) filters.entity_type = entity_type;
            if (entity_id) filters.entity_id = entity_id;
            if (action) filters.action = action;
            if (user_id) filters.user_id = user_id;
            if (date_from) filters.date_from = new Date(date_from);
            if (date_to) filters.date_to = new Date(date_to);

            const auditLogs = await AuditLog.findAll(filters);
            
            // Pagination
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            
            const paginatedLogs = auditLogs.slice(startIndex, endIndex);
            const totalPages = Math.ceil(auditLogs.length / limitNum);
            
            res.json({
                success: true,
                auditLogs: paginatedLogs,
                count: paginatedLogs.length,
                pagination: {
                    currentPage: pageNum,
                    totalPages: totalPages,
                    totalRecords: auditLogs.length,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            });
        } catch (error) {
            logger.error('Search audit logs error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = AuditController;