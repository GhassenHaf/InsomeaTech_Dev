const express = require('express');
const router = express.Router();
const OrderLineController = require('../controllers/orderLineController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Get all order lines for an order
router.get('/order/:orderId', jwtAuth, OrderLineController.getAllOrderLines);

// Get all order lines for a customer (across all their orders)
router.get('/customer/:customerId', jwtAuth, OrderLineController.getOrderLinesByCustomer);

// Get order line by ID
router.get('/:id', jwtAuth, OrderLineController.getOrderLineById);

// Create order line (Sales only)
router.post('/order/:orderId', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), OrderLineController.createOrderLine);

// Update order line (Technical/Admin)
router.put('/:id', jwtAuth, requireRole(['Technical', 'Admin']), OrderLineController.updateOrderLine);

// Update expiration date (Technical/Admin)
router.put('/:id/expiration', jwtAuth, requireRole(['Technical', 'Admin']), OrderLineController.updateExpirationDate);

// Activate order line (Technical only)
router.put('/:id/activate', jwtAuth, requireRole(['Technical', 'Admin']), OrderLineController.activateOrderLine);

// Cancel order line (Technical only)
router.put('/:id/cancel', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), OrderLineController.cancelOrderLine);

module.exports = router;