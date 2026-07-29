const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Get all products
router.get('/', jwtAuth, ProductController.getAllProducts);

// Get product by ID
router.get('/:id', jwtAuth, ProductController.getProductById);

// Create product (Admin only)
router.post('/', jwtAuth, requireRole(['Admin']), ProductController.createProduct);

// Update product (Admin only)
router.put('/:id', jwtAuth, requireRole(['Admin']), ProductController.updateProduct);

// Delete product (Admin only)
router.delete('/:id', jwtAuth, requireRole(['Admin']), ProductController.deleteProduct);

module.exports = router;