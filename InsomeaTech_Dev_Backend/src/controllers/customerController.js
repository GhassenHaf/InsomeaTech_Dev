const Customer = require('../models/customer');
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
        new winston.transports.File({ filename: 'logs/customer.log' })
    ]
});

class CustomerController {
    // Get all customers
    static async getAllCustomers(req, res) {
        try {
            const { status, search } = req.query;
            
            logger.info('Get all customers request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status, search }
            });

            const filters = {};
            if (status) filters.status = status;
            if (search) filters.search = search;

            const customers = await Customer.findAll(filters);
            
            res.json({
                success: true,
                customers,
                count: customers.length
            });
        } catch (error) {
            logger.error('Get all customers error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get customer by ID
    static async getCustomerById(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Get customer by ID request', { 
                customerId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const customer = await Customer.findById(id);
            
            if (!customer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            res.json({
                success: true,
                customer
            });
        } catch (error) {
            logger.error('Get customer by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create customer
    static async createCustomer(req, res) {
        console.log('createCustomer function called'); // Add this line
        try {
            const { company_name, tenant_id, onmicrosoft_domain, email, phone, contact_person, status, sales_person_id, country } = req.body;
            const { id: created_by } = req.currentUser;
            
            logger.info('Create customer request', { 
                customerName: company_name,
                creator: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate required fields
            if (!company_name || !email) {
                return res.status(400).json({ 
                    error: 'Company name and email are required', 
                    success: false 
                });
            }

            // Validate sales person if provided
            if (sales_person_id) {
                const salesPerson = await User.findById(sales_person_id);
                if (!salesPerson) {
                    return res.status(400).json({ 
                        error: 'Sales person not found', 
                        success: false 
                    });
                }
            }

            // Validate status if provided
            const validStatuses = ['Active', 'Inactive'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            // Check if customer with same email already exists
            const existingCustomer = await Customer.findByEmailCaseInsensitive(email);
            if (existingCustomer) {
                return res.status(400).json({ 
                    error: 'Customer with this email already exists', 
                    success: false 
                });
            }

            const customer = await Customer.create({
                company_name,
                tenant_id: tenant_id || null,
                onmicrosoft_domain: onmicrosoft_domain || null,
                email,
                phone: phone || null,
                contact_person: contact_person || null,
                status: status || 'Active',
                created_by: req.currentUser.email, // Use email instead of ID
                source: 'Manual',
                sales_person_id: sales_person_id || null,
                country: country || null
            });

            // Log the creation
            await AuditLog.create({
                entity_type: 'Customer',
                entity_id: customer.id,
                action: 'Create',
                changes: { new: customer },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Customer created successfully', { 
                customerId: customer.id,
                customerName: customer.company_name,
                createdBy: req.currentUser?.email 
            });

            res.status(201).json({
                success: true,
                customer
            });
        } catch (error) {
            logger.error('Create customer error:', error);
            console.error(error); // Add this line
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update customer
    static async updateCustomer(req, res) {
        try {
            const { id } = req.params;
            const { company_name, tenant_id, onmicrosoft_domain, email, phone, contact_person, status, sales_person_id, country } = req.body;
            const { id: updated_by } = req.currentUser;
            
            logger.info('Update customer request', { 
                customerId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            // Validate sales person if provided
            if (sales_person_id) {
                const salesPerson = await User.findById(sales_person_id);
                if (!salesPerson) {
                    return res.status(400).json({ 
                        error: 'Sales person not found', 
                        success: false 
                    });
                }
            }

            // Validate status if provided
            const validStatuses = ['Active', 'Inactive'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            const existingCustomer = await Customer.findById(id);
            if (!existingCustomer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            // Check for duplicate email (if email is being updated)
            if (email && (!existingCustomer.email || email.toLowerCase() !== existingCustomer.email.toLowerCase())) {
                const duplicateCustomer = await Customer.findByEmailCaseInsensitive(email);
                if (duplicateCustomer && duplicateCustomer.id.toString() !== id.toString()) {
                    return res.status(400).json({ 
                        error: 'Customer with this email already exists', 
                        success: false 
                    });
                }
            }

            // Update customer
            const updatedCustomer = await Customer.update(id, {
                company_name: company_name || existingCustomer.company_name,
                tenant_id: tenant_id !== undefined ? tenant_id : existingCustomer.tenant_id,
                onmicrosoft_domain: onmicrosoft_domain !== undefined ? onmicrosoft_domain : existingCustomer.onmicrosoft_domain,
                email: email || existingCustomer.email,
                phone: phone !== undefined ? phone : existingCustomer.phone,
                contact_person: contact_person !== undefined ? contact_person : existingCustomer.contact_person,
                status: status || existingCustomer.status,
                sales_person_id: sales_person_id !== undefined ? sales_person_id : existingCustomer.sales_person_id,
                country: country !== undefined ? country : existingCustomer.country
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'Customer',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingCustomer,
                    new: updatedCustomer
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Customer updated successfully', { 
                customerId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                customer: updatedCustomer
            });
        } catch (error) {
            logger.error('Update customer error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Delete customer
    static async deleteCustomer(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Delete customer request', { 
                customerId: id,
                deleter: req.currentUser?.email,
                ip: req.ip 
            });

            const existingCustomer = await Customer.findById(id);
            if (!existingCustomer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            const deletedCustomer = await Customer.delete(id);

            // Log the deletion
            await AuditLog.create({
                entity_type: 'Customer',
                entity_id: id,
                action: 'Delete',
                changes: { old: existingCustomer },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Customer deleted successfully', { 
                customerId: id,
                deletedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'Customer deleted successfully',
                customer: deletedCustomer
            });
        } catch (error) {
            logger.error('Delete customer error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = CustomerController;