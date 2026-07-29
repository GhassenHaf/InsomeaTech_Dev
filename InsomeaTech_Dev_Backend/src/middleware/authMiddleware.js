const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// JWT Authentication Middleware
const jwtAuth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.', 
            success: false 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify the user exists in the database
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ 
                error: 'User not found in database.', 
                success: false 
            });
        }
        
        // Attach user info to request
        req.user = decoded;
        req.currentUser = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        res.status(401).json({ 
            error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token.', 
            success: false 
        });
    }
};

// Session-based authentication for web routes
const sessionAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Access denied. Please log in.', 
            success: false 
        });
    }
    next();
};

module.exports = {
    jwtAuth,
    sessionAuth
};