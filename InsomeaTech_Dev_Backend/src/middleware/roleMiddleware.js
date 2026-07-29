const User = require('../models/user');

// Role-based access control middleware
const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            let user = null;
            
            // Check if user is already attached by JWT middleware
            if (req.currentUser) {
                user = req.currentUser;
            }
            // For JWT token but without currentUser (fallback)
            else if (req.user && req.user.id) {
                user = await User.findById(req.user.id);
            }
            // For session-based authentication
            else if (req.session && req.session.passport && req.session.passport.user) {
                user = await User.findById(req.session.passport.user);
            }
            
            if (!user) {
                return res.status(401).json({ 
                    error: 'User not authenticated', 
                    success: false 
                });
            }
            
            if (!roles.includes(user.role)) {
                return res.status(403).json({ 
                    error: `Access denied. Requires role: ${roles.join(' or ')}`, 
                    success: false 
                });
            }
            
            // Attach user to request for use in controllers
            req.currentUser = user;
            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    };
};

// Specific role middlewares
const requireSales = requireRole(['Sales', 'Technical', 'Admin']);
const requireTechnical = requireRole(['Technical', 'Admin']);
const requireAdmin = requireRole(['Admin']);

module.exports = {
    requireRole,
    requireSales,
    requireTechnical,
    requireAdmin
};