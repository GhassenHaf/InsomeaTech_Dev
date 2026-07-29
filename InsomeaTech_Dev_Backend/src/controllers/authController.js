const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
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
        new winston.transports.File({ filename: 'logs/auth.log' })
    ]
});

class AuthController {
    // Azure AD Login
    static login(req, res, next) {
        passport.authenticate('azuread-openidconnect', {
            response: res,
            failureRedirect: '/api/auth/error'
        })(req, res, next);
    }

    // Azure AD Callback
    static async callback(req, res, next) {        
        const frontendUrl = process.env.FRONTEND_URL;

        passport.authenticate('azuread-openidconnect', {
            response: res,
            failureRedirect: '/api/auth/login',
            session: true
        }, async (err, user, info) => {
            if (err) {
                logger.error('Authentication error:', err);
                return res.redirect(`${frontendUrl}/auth/login?error=auth_failed`);
            }
            
            if (!user) {
                console.log('No user returned from authentication'); // Debug log
                console.log('Info:', info); // Debug log
                if (info && info.message === 'User is inactive') {
                    return res.redirect(`${frontendUrl}/auth/login?error=inactive_user`);
                }
                return res.redirect(`${frontendUrl}/auth/login?error=no_user`);
            }

            req.logIn(user, async (err) => {
                if (err) {
                    logger.error('Login error:', err);
                    return res.redirect(`${frontendUrl}/auth/login?error=login_failed`);
                }

                // Generate JWT token
                const token = jwt.sign(
                    { 
                        id: user.id, 
                        email: user.email, 
                        role: user.role 
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN }
                );

                // Redirect to frontend with token (for SPA)
                // const frontendUrl = process.env.FRONTEND_URL; // Already defined above
                
                res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
            });
        })(req, res, next);
    }

    // Logout
    static logout(req, res) {
        const frontendUrl = process.env.FRONTEND_URL;

        // 1. Call Passport logout first
        req.logout((err) => {
            if (err) {
                // If Passport fails, return error immediately
                logger.error('Logout error:', err);
                return res.status(500).json({ 
                    error: 'Logout failed', 
                    success: false 
                });
            }

            // 2. Only destroy the session AFTER logout succeeds
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    logger.error('Session destroy error:', destroyErr);
                    // You can choose to fail here or just log it and continue
                }

                // 3. Clear cookie and Redirect
                res.clearCookie('connect.sid'); // Ensure this matches your session cookie name
                res.redirect(frontendUrl);
            });
        });
    }

    // Get current user
    static async getCurrentUser(req, res) {
        try {
            let user;
            
            // Check if authenticated via JWT
            if (req.user && req.user.id) {
                user = await User.findById(req.user.id);
            } 
            // Check if authenticated via session
            else if (req.session && req.session.passport && req.session.passport.user) {
                user = await User.findById(req.session.passport.user);
            }
            
            if (!user) {
                return res.status(401).json({ 
                    error: 'Auth User not authenticated', 
                    success: false 
                });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status
                }
            });
        } catch (error) {
            logger.error('Get current user error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // JWT Token Refresh
    static refreshToken(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ 
                    error: 'Invalid token', 
                    success: false 
                });
            }

            const newToken = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                token: newToken
            });
        } catch (error) {
            logger.error('Token refresh error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // User registration (for admin to add users manually)
    static async register(req, res) {
        try {
            const { email, name, role } = req.body;

            // Validate input
            if (!email || !name || !role) {
                return res.status(400).json({ 
                    error: 'Email, name, and role are required', 
                    success: false 
                });
            }

            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ 
                    error: 'User already exists', 
                    success: false 
                });
            }

            // Only admin can register users
            if (req.currentUser?.role !== 'Admin') {
                return res.status(403).json({ 
                    error: 'Only admin can register users', 
                    success: false 
                });
            }

            const user = await User.create({
                email,
                name,
                role,
                status: 'Active'
            });

            logger.info(`User registered: ${email} by ${req.currentUser.email}`);

            res.status(201).json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status
                }
            });
        } catch (error) {
            logger.error('User registration error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = AuthController;