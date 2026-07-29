const express = require('express');
const router = express.Router();
const DistiController = require('../controllers/distiController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Get all distributors
router.get('/', jwtAuth, DistiController.getAllDistis);

// Get distributor by ID
router.get('/:id', jwtAuth, DistiController.getDistiById);

// Create distributor (Admin only)
router.post('/', jwtAuth, requireRole(['Admin']), DistiController.createDisti);

// Update distributor (Admin only)
router.put('/:id', jwtAuth, requireRole(['Admin']), DistiController.updateDisti);

// Delete distributor (Admin only)
router.delete('/:id', jwtAuth, requireRole(['Admin']), DistiController.deleteDisti);

module.exports = router;