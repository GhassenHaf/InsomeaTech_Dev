const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Get order history for a specific order
router.get('/orders/:orderId/history', jwtAuth, AuditController.getOrderHistory);

// Get audit logs (Admin only)
router.get('/', jwtAuth, requireRole(['Admin']), AuditController.getAuditLogs);

// Get audit logs with filters (Admin only)
router.get('/search', jwtAuth, requireRole(['Admin']), AuditController.searchAuditLogs);

module.exports = router;