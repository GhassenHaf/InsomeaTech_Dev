const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Get all customers
router.get('/', jwtAuth, CustomerController.getAllCustomers);

// Get customer by ID
router.get('/:id', jwtAuth, CustomerController.getCustomerById);

// Create customer (Sales/Technical/Admin)
router.post('/', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), CustomerController.createCustomer);

// Update customer (Technical/Admin)
router.put('/:id', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), CustomerController.updateCustomer);

// Delete customer (Admin only)
router.delete('/:id', jwtAuth, requireRole(['Admin']), CustomerController.deleteCustomer);

module.exports = router;