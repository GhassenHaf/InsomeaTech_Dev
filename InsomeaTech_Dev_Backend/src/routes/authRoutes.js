const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// Azure AD Authentication
router.get('/login', AuthController.login);
router.post('/callback', AuthController.callback);
router.get('/callback', AuthController.callback);
router.get('/logout', AuthController.logout);

// Get current user (requires authentication)
router.get('/me', jwtAuth, AuthController.getCurrentUser);

// Token refresh
router.post('/refresh', jwtAuth, AuthController.refreshToken);

// Admin-only user registration
router.post('/register', jwtAuth, requireRole(['Admin']), AuthController.register);

router.get('/error', (req, res) => {
    res.status(401).json({ message: 'Authentication failed' });
});

module.exports = router;