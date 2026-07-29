const express = require('express');
const router = express.Router();
const CustomerProductController = require('../controllers/customerProductController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Define specific routes first, then dynamic routes
// Get expiring customer products (specific route first)
router.get('/expiring', jwtAuth, CustomerProductController.getExpiringCustomerProducts);

// Get all customer products (with optional filters)
router.get('/', jwtAuth, CustomerProductController.getAllCustomerProducts);

// Get all customer products for a specific customer
router.get('/customer/:customerId', jwtAuth, CustomerProductController.getCustomerProducts);

// Get customer product by ID (dynamic route last)
router.get('/:id', jwtAuth, CustomerProductController.getCustomerProductById);

// Update customer product status (Technical/Admin)
router.put('/:id', jwtAuth, requireRole(['Technical', 'Admin']), CustomerProductController.updateCustomerProduct);

// Delete customer product (Admin only)
router.delete('/:id', jwtAuth, requireRole(['Admin']), CustomerProductController.deleteCustomerProduct);

module.exports = router;