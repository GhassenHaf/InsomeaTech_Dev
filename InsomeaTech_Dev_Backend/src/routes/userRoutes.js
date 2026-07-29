const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware'); // Add JWT auth

// Get all users (Admin only)
router.get('/', jwtAuth, requireRole(['Sales','Technical', 'Admin']), UserController.getAllUsers);

// Get user by ID (Admin only)
router.get('/:id', jwtAuth, requireRole(['Admin']), UserController.getUserById);

// Update user (Admin only)
router.put('/:id', jwtAuth, requireRole(['Admin']), UserController.updateUser);

module.exports = router;