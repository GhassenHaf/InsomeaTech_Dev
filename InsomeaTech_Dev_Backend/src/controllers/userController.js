const User = require('../models/user');
const AuditLog = require('../models/auditLog');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/user.log' })
    ]
});

class UserController {
    // Get all users
    static async getAllUsers(req, res) {
        try {
            logger.info('Get all users request', { 
                user: req.currentUser?.email,
                ip: req.ip 
            });

            const users = await User.findAll();
            
            res.json({
                success: true,
                data: users,
                count: users.length
            });
        } catch (error) {
            logger.error('Get all users error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get user by ID
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get user by ID request', { 
                userId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const user = await User.findById(id);
            
            if (!user) {
                return res.status(404).json({ 
                    error: 'User not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            logger.error('Get user by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, name, role, status } = req.body;
            
            logger.info('Update user request', { 
                userId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate input
            if (!email || !name || !role) {
                return res.status(400).json({ 
                    error: 'Email, name, and role are required', 
                    success: false 
                });
            }

            // Validate role
            const validRoles = ['Sales', 'Technical', 'Admin', 'Finance'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ 
                    error: `Role must be one of: ${validRoles.join(', ')}`, 
                    success: false 
                });
            }

            // Validate status
            const validStatuses = ['Active', 'Inactive'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ 
                    error: 'User not found', 
                    success: false 
                });
            }

            // Check for duplicate email (if email is being updated)
            if (email && email.toLowerCase() !== user.email.toLowerCase()) {
                const duplicateUser = await User.findByEmailCaseInsensitive(email);
                if (duplicateUser && duplicateUser.id.toString() !== id.toString()) {
                    return res.status(400).json({ 
                        error: 'User with this email already exists', 
                        success: false 
                    });
                }
            }

            // Update user
            const updatedUser = await User.update(id, {
                email,
                name,
                role,
                status: status || user.status
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'User',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: user,
                    new: updatedUser
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('User updated successfully', { 
                userId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                data: updatedUser
            });
        } catch (error) {
            logger.error('Update user error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = UserController;