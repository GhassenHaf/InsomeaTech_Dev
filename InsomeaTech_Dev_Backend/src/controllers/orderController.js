const Order = require('../models/order');
const Customer = require('../models/customer');
const User = require('../models/user');
const OrderHistory = require('../models/orderHistory');
const AuditLog = require('../models/auditLog');
const { generateOrderNumber } = require('../utils/orderNumberGenerator');
const azureBlobStorage = require('../utils/azureBlobStorage');
const emailService = require('../utils/emailService');
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
        new winston.transports.File({ filename: 'logs/order.log' })
    ]
});

class OrderController {
    // Get all orders
    static async getAllOrders(req, res) {
        try {
            const { status_order, customer_id, search } = req.query;
            const { role, id: userId } = req.currentUser;
            
            logger.info('Get all orders request', { 
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status_order, customer_id, search }
            });

            // Build filters based on user role
            const filters = {};
            if (status_order) filters.status_order = status_order;
            if (customer_id) filters.customer_id = customer_id;
            if (search) filters.search = search;

            // Sales users can only see their own orders or orders assigned to them
            if (role === 'Sales') {
                // For now, let's allow sales to see all orders, but you can modify this logic
                // filters.sales_person_id = userId; // Uncomment this if sales should only see their orders
            }

            const orders = await Order.findAll(filters);
            
            res.json({
                success: true,
                orders,
                count: orders.length
            });
        } catch (error) {
            logger.error('Get all orders error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Get order by ID
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const { role, id: userId } = req.currentUser;
            
            logger.info('Get order by ID request', { 
                orderId: id,
                requester: req.currentUser?.email,
                ip: req.ip 
            });

            const order = await Order.findById(id);
            
            if (!order) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Additional security check based on user role
            if (role === 'Sales' && order.sales_person_id !== userId) {
                // You might want to allow sales to see orders assigned to them or their customers
                // For now, we'll allow access to all orders for sales
            }

            res.json({
                success: true,
                order
            });
        } catch (error) {
            logger.error('Get order by ID error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Create order
    static async createOrder(req, res) {
        const db = require('../models/database');
        const client = await db.getClient();
        
        try {
            // 1. Parse Data
            let bodyData;
            try {
                bodyData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
            } catch (e) {
                return res.status(400).json({ success: false, error: 'Invalid data format' });
            }

            const { 
                customer_id, 
                order_date, 
                technical_user_id, 
                notes,
                lineItems = []
            } = bodyData;

            const { id: sales_person_id, email: created_by } = req.currentUser;

            logger.info('Create order atomic request', { 
                customer_id,
                creator: created_by,
                itemCount: lineItems.length
            });

            // 2. Start Transaction
            await client.query('BEGIN');

            // 3. Validations
            if (!customer_id || !order_date || lineItems.length === 0) {
                throw new Error('Customer ID, order date, and at least one item are required');
            }

            // 4. Generate Order Number
            const order_number = await generateOrderNumber();

            // 5. Create Order
            const orderResult = await client.query(`
                INSERT INTO insomea_tech.orders (
                    order_number, order_date, status_order, notes, 
                    created_by, sales_person_id, technical_user_id, customer_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, order_number
            `, [order_number, order_date, 'WaitingForFinanceApproval', notes || null, created_by, sales_person_id, technical_user_id || null, customer_id]);
            
            const order = orderResult.rows[0];

            // 6. Create Order Lines
            for (const item of lineItems) {
                await client.query(`
                    INSERT INTO insomea_tech.order_lines (
                        order_id, product_id, disti_id, quantity, status
                    )
                    VALUES ($1, $2, $3, $4, $5)
                `, [order.id, item.product_id, item.disti_id, item.quantity, 'Pending']);
            }

            // 7. Handle File Uploads
            let lpoUrl = null;
            let soUrl = null;

            if (req.files) {
                if (req.files.lpo && req.files.lpo[0]) {
                    const file = req.files.lpo[0];
                    const ext = file.originalname.split('.').pop();
                    const fileName = `CPO_${order.order_number}.${ext}`;
                    lpoUrl = await azureBlobStorage.uploadFile(order.id, 'lpo', file.buffer, fileName);
                }
                if (req.files.so && req.files.so[0]) {
                    const file = req.files.so[0];
                    const ext = file.originalname.split('.').pop();
                    const fileName = `SO_${order.order_number}.${ext}`;
                    soUrl = await azureBlobStorage.uploadFile(order.id, 'so', file.buffer, fileName);
                }
            }

            // 8. Update Order with File URLs
            if (lpoUrl || soUrl) {
                await client.query(`
                    UPDATE insomea_tech.orders 
                    SET lpo_url = $1, so_url = $2 
                    WHERE id = $3
                `, [lpoUrl, soUrl, order.id]);
            }

            // 9. Log History & Audit
            await client.query(`
                INSERT INTO insomea_tech.order_history (order_id, changed_by, new_status, change_type, notes)
                VALUES ($1, $2, $3, $4, $5)
            `, [order.id, sales_person_id, 'WaitingForFinanceApproval', 'Created', 'Order created with items and files']);

            await client.query(`
                INSERT INTO insomea_tech.audit_logs (entity_type, entity_id, action, changes, ip_address, user_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, ['Order', order.id, 'Create', JSON.stringify({ new: order }), req.ip, sales_person_id]);

            // 10. Commit
            await client.query('COMMIT');
            
            // Release handled in finally block
            
            logger.info('Order created atomically successfully', { orderId: order.id });

            // Send notification (non-blocking)
            OrderController.sendOrderEmail(order.id, customer_id, created_by).catch(e => logger.error('Email notify error', e));

            res.status(201).json({ success: true, order });

        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                logger.error('Rollback failed:', rollbackError);
            }
            logger.error('Create order atomic error:', error);
            res.status(500).json({ success: false, error: error.message || 'Internal server error' });
        } finally {
            client.release();
        }
    }

    // Helper for email to keep createOrder cleaner
    static async sendOrderEmail(orderId, customerId, createdBy) {
        try {
            const customer = await Customer.findById(customerId);
            const order = await Order.findById(orderId);
            const allUsers = await User.findAll();
            const techUsers = allUsers.filter(u => u.role === 'Technical' || u.role === 'Admin' || u.role === 'Finance').map(u => u.email);
            
            if (techUsers.length > 0) {
                await emailService.sendOrderNotification(techUsers, {
                    ...order,
                    customer_name: customer.company_name,
                    created_by: createdBy
                }, 'Created');
            }
        } catch (e) {
            console.error('Email helper error', e);
        }
    }

    // Update order
    static async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const { technical_user_id, notes, lpo_url, so_url, proof_tech_url } = req.body;
            const { id: last_modified_by } = req.currentUser;
            
            logger.info('Update order request', { 
                orderId: id,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            const existingOrder = await Order.findById(id);
            if (!existingOrder) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Validate technical user exists (if provided)
            if (technical_user_id) {
                const technicalUser = await User.findById(technical_user_id);
                if (!technicalUser) {
                    return res.status(400).json({ 
                        error: 'Technical user not found', 
                        success: false 
                    });
                }
            }

            // Update order - only update fields that are provided
            const updateData = {};
            if (technical_user_id !== undefined) updateData.technical_user_id = technical_user_id;
            if (notes !== undefined) updateData.notes = notes;
            if (lpo_url !== undefined) updateData.lpo_url = lpo_url;
            if (so_url !== undefined) updateData.so_url = so_url;
            if (proof_tech_url !== undefined) updateData.proof_tech_url = proof_tech_url;
            updateData.last_modified_by = req.currentUser.email;

            // Update order
            const updatedOrder = await Order.update(id, updateData);

            // Log the change
            await AuditLog.create({
                entity_type: 'Order',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingOrder,
                    new: updatedOrder
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Order updated successfully', { 
                orderId: id,
                updatedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                order: updatedOrder
            });
        } catch (error) {
            logger.error('Update order error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Update order status
    static async updateOrderStatus(req, res) {
        logger.info('Update order status request received');
        logger.info('Request body:', req.body);
        try {
            const { id } = req.params;
            const { status_order, notes } = req.body;
            const { id: changed_by } = req.currentUser;
            
            logger.info('Update order status request', { 
                orderId: id,
                newStatus: status_order,
                updater: req.currentUser?.email,
                ip: req.ip 
            });

            const existingOrder = await Order.findById(id);
            if (!existingOrder) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Validate status
            const validStatuses = ['WaitingForFinanceApproval', 'ToBeProvisioned', 'UnderProcessing', 'DistiProcessing', 'Done'];
            if (!validStatuses.includes(status_order)) {
                return res.status(400).json({ 
                    error: `Status must be one of: ${validStatuses.join(', ')}`, 
                    success: false 
                });
            }

            // Update order status
            const updatedOrder = await Order.update(id, {
                status_order,
                last_modified_by: req.currentUser.email
            });

            // Log the status change in order history
            await OrderHistory.create({
                order_id: id,
                changed_by,
                old_status: existingOrder.status_order,
                new_status: status_order,
                change_type: 'StatusChange',
                notes: notes || `Status changed to ${status_order}`
            });

            // Log the change
            await AuditLog.create({
                entity_type: 'Order',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: existingOrder,
                    new: updatedOrder
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            logger.info('Order status updated successfully', { 
                orderId: id,
                oldStatus: existingOrder.status_order,
                newStatus: status_order,
                updatedBy: req.currentUser?.email 
            });

            // Send notification
            try {
                logger.info('Attempting to send status update notification...');
                const allUsers = await User.findAll();
                const admins = allUsers.filter(u => u.role === 'Admin').map(u => u.email);
                const salesPerson = allUsers.find(u => u.id === updatedOrder.sales_person_id);
                
                logger.info(`Found ${admins.length} admins and Sales Person: ${salesPerson ? salesPerson.email : 'None'}`);

                const recipients = new Set([...admins]);
                if (salesPerson && salesPerson.email) recipients.add(salesPerson.email);

                logger.info(`Total unique recipients: ${recipients.size}`, { recipients: Array.from(recipients) });

                if (recipients.size > 0) {
                    const customer = await Customer.findById(updatedOrder.customer_id);
                    await emailService.sendOrderNotification(Array.from(recipients), {
                        ...updatedOrder,
                        customer_name: customer?.company_name,
                        last_modified_by: req.currentUser.email
                    }, `Status Updated to ${status_order}`);
                    logger.info('Notification email sent.');
                } else {
                    logger.warn('No recipients found for status update notification.');
                }
            } catch (emailError) {
                logger.error('Failed to send order status update email:', emailError);
                console.error('Detailed Email Error:', emailError);
            }

            res.json({
                success: true,
                order: updatedOrder
            });
        } catch (error) {
            logger.error('Update order status error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Upload order files
    static async uploadOrderFiles(req, res) {
        try {
            const { id: orderId } = req.params;
            const { type } = req.query; // lpo, so, or proof_tech
            const file = req.file;
            
            logger.info('Upload order file request', { 
                orderId,
                fileType: type,
                fileName: file?.originalname,
                uploader: req.currentUser?.email,
                ip: req.ip 
            });

            if (!file) {
                return res.status(400).json({ 
                    error: 'No file uploaded', 
                    success: false 
                });
            }

            if (!type || !['lpo', 'so', 'proof_tech'].includes(type)) {
                return res.status(400).json({ 
                    error: 'File type must be one of: lpo, so, proof_tech', 
                    success: false 
                });
            }

            // Verify order exists
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Determine new filename based on type and order number
            const fileExtension = file.originalname.split('.').pop();
            let prefix = type === 'lpo' ? 'CPO' : (type === 'so' ? 'SO' : 'PROOF');
            const newFileName = `${prefix}_${order.order_number}.${fileExtension}`;

            let fileUrl;
            
            if (azureBlobStorage) {
                // Use real Azure Blob Storage
                fileUrl = await azureBlobStorage.uploadFile(orderId, type, file.buffer, newFileName);
            } else {
                // Mock URL for development
                fileUrl = `https://mock-storage.com/orders/${orderId}-${type}-${Date.now()}-${newFileName}`;
                logger.warn('Using mock file URL - Azure Storage not configured');
            }

            // Update the order with the file URL
            let updateData = {};
            switch (type) {
                case 'lpo':
                    updateData.lpo_url = fileUrl;
                    break;
                case 'so':
                    updateData.so_url = fileUrl;
                    break;
                case 'proof_tech':
                    updateData.proof_tech_url = fileUrl;
                    break;
            }

            const updatedOrder = await Order.update(orderId, {
                ...updateData,
                last_modified_by: req.currentUser.email
            });

            // Log the file upload
            await AuditLog.create({
                entity_type: 'Order',
                entity_id: orderId,
                action: 'Update',
                changes: {
                    old: { [`${type}_url`]: order[`${type}_url`] },
                    new: { [`${type}_url`]: fileUrl }
                },
                ip_address: req.ip,
                user_id: req.currentUser.id
            });

            // Log in order history
            await OrderHistory.create({
                order_id: orderId,
                changed_by: req.currentUser.id,
                change_type: 'Modified',
                field_changed: `${type}_url`,
                old_value: order[`${type}_url`],
                new_value: fileUrl,
                notes: `File uploaded: ${file.originalname}`
            });

            logger.info('Order file uploaded successfully', { 
                orderId,
                fileType: type,
                fileUrl,
                uploadedBy: req.currentUser?.email 
            });

            res.json({
                success: true,
                message: 'File uploaded successfully',
                fileUrl,
                order: updatedOrder
            });
        } catch (error) {
            logger.error('Upload order file error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Download order files
    static async downloadOrderFile(req, res) {
        try {
            const { id: orderId, type } = req.params;
            
            logger.info('Download order file request', { 
                orderId,
                fileType: type,
                downloader: req.currentUser?.email,
                ip: req.ip 
            });

            if (!['lpo', 'so', 'proof_tech', 'disti_po'].includes(type)) {
                return res.status(400).json({ 
                    error: 'File type must be one of: lpo, so, proof_tech, disti_po', 
                    success: false 
                });
            }

            // Verify order exists
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    error: 'Order not found', 
                    success: false 
                });
            }

            // Get the file URL
            let fileUrl;
            switch (type) {
                case 'lpo':
                    fileUrl = order.lpo_url;
                    break;
                case 'so':
                    fileUrl = order.so_url;
                    break;
                case 'proof_tech':
                    fileUrl = order.proof_tech_url;
                    break;
                case 'disti_po':
                    fileUrl = order.disti_po_url;
                    break;
            }

            if (!fileUrl) {
                return res.status(404).json({ 
                    error: `No ${type} file found for this order`, 
                    success: false 
                });
            }

            // Extract blob name from URL for SAS token generation
            const blobName = fileUrl.split('/').pop();
            
            if (azureBlobStorage) {
                try {
                    // Generate a SAS token for secure access
                    const secureUrl = await azureBlobStorage.getFileUrlWithSas(blobName, 1); // 1 hour expiry
                    
                    logger.info('Order file download prepared with SAS token', { 
                        orderId,
                        fileType: type,
                        fileUrl: secureUrl,
                        downloadedBy: req.currentUser?.email 
                    });

                    // Return the secure URL with SAS token
                    res.json({
                        success: true,
                        fileUrl: secureUrl,
                        message: 'Secure file download URL generated with SAS token (expires in 1 hour)'
                    });
                } catch (storageError) {
                    logger.error('Azure storage error:', storageError);
                    // Fallback to original URL if SAS token generation fails
                    res.json({
                        success: true,
                        fileUrl: fileUrl,
                        message: 'File download URL prepared (SAS token generation failed, using direct URL)'
                    });
                }
            } else {
                // Mock functionality for development
                logger.warn('Using mock file URL - Azure Storage not configured');
                res.json({
                    success: true,
                    fileUrl: fileUrl,
                    message: 'File download URL prepared (mock service - configure Azure Storage for production)'
                });
            }
        } catch (error) {
            logger.error('Download order file error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }

    // Finance Approval
    static async financeApprove(req, res) {
        try {
            const { id } = req.params;
            const { poNumber } = req.body;
            const file = req.file;

            logger.info('Finance approval request', {
                orderId: id,
                poNumber,
                hasFile: !!file,
                user: req.currentUser.email
            });

            if (!poNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'PO Number is required'
                });
            }

            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            // Upload file if exists
            let fileUrl = null;
            if (file) {
                 const fileExtension = file.originalname.split('.').pop();
                 const newFileName = `DistiPO_${order.order_number}.${fileExtension}`;
                 
                 if (azureBlobStorage) {
                    fileUrl = await azureBlobStorage.uploadFile(id, 'disti_po', file.buffer, newFileName);
                 } else {
                    fileUrl = `https://mock-storage.com/orders/${id}-disti_po-${Date.now()}-${newFileName}`;
                 }
            }

            // Update order
            const updatedOrder = await Order.financeApprove(id, poNumber, fileUrl, req.currentUser.id);

            // Log History
            await OrderHistory.create({
                order_id: id,
                changed_by: req.currentUser.id,
                old_status: order.status_order,
                new_status: 'ToBeProvisioned',
                change_type: 'StatusChange',
                notes: `Finance approved. PO: ${poNumber}`
            });

            // Send Notifications
            try {
                 // Send to Technical Team
                 const allUsers = await User.findAll();
                 const techUsers = allUsers.filter(u => u.role === 'Technical' || u.role === 'Admin').map(u => u.email);
                 const customer = await Customer.findById(updatedOrder.customer_id);

                 if (techUsers.length > 0) {
                     await emailService.sendOrderNotification(techUsers, {
                         ...updatedOrder,
                         customer_name: customer?.company_name,
                         last_modified_by: req.currentUser.email
                     }, 'Ready for Provisioning');
                 }
            } catch (e) {
                logger.error('Failed to send finance approval email', e);
            }

            res.json({
                success: true,
                order: updatedOrder
            });

        } catch (error) {
            logger.error('Finance approve error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Start Provisioning
    static async startProvisioning(req, res) {
        try {
            const { id } = req.params;
            
            logger.info('Start provisioning request', {
                orderId: id,
                user: req.currentUser.email
            });

            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            if (order.status_order !== 'ToBeProvisioned') {
                return res.status(400).json({
                    success: false,
                    error: 'Order must be in "ToBeProvisioned" state'
                });
            }

            const updatedOrder = await Order.update(id, {
                status_order: 'UnderProcessing',
                technical_user_id: req.currentUser.id
            });

            // Log History
            await OrderHistory.create({
                order_id: id,
                changed_by: req.currentUser.id,
                old_status: 'ToBeProvisioned',
                new_status: 'UnderProcessing',
                change_type: 'StatusChange',
                notes: 'Provisioning started'
            });

             // Send Notifications
             try {
                // Send to Sales and Finance
                const allUsers = await User.findAll();
                const notifyUsers = allUsers.filter(u => u.role === 'Admin' ||u.role === 'Finance' || u.id === order.sales_person_id).map(u => u.email);
                const customer = await Customer.findById(updatedOrder.customer_id);

                if (notifyUsers.length > 0) {
                    /*
                    await emailService.sendOrderNotification(notifyUsers, {
                        ...updatedOrder,
                        customer_name: customer?.company_name,
                        last_modified_by: req.currentUser.email
                    }, 'Provisioning Started');
                    */
                }
           } catch (e) {
               logger.error('Failed to send start provisioning email', e);
           }

            res.json({
                success: true,
                order: updatedOrder
            });

        } catch (error) {
            logger.error('Start provisioning error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Cancel order
    static async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const { role, email: userEmail, id: userId } = req.currentUser;

            logger.info('Cancel order request', {
                orderId: id,
                reason,
                user: userEmail,
                role
            });

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Cancellation reason is required'
                });
            }

            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            // Validation Logic
            if (order.status_order === 'Done') {
                 // Even Admin cannot cancel a Done order without manual intervention usually, but based on req: "Admin if status except Done"
                 return res.status(400).json({
                     success: false,
                     error: 'Cannot cancel an order that is already Done'
                 });
            }

            let canCancel = false;
            if (role === 'Admin') {
                canCancel = true;
            } else if (role === 'Finance' && order.status_order === 'WaitingForFinanceApproval') {
                canCancel = true;
            }

            if (!canCancel) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to cancel this order in its current status'
                });
            }

            // Update order status and append reason to notes
            const newNotes = order.notes ? `CANCELLED:\n ${reason}\n\n --- \n\n Order Notes:\n ${order.notes}` : `CANCELLED:\n ${reason}`;
            const updatedOrder = await Order.update(id, {
                status_order: 'Cancelled',
                notes: newNotes,
                last_modified_by: userEmail
            });

            // Log History
            await OrderHistory.create({
                order_id: id,
                changed_by: userId,
                old_status: order.status_order,
                new_status: 'Cancelled',
                change_type: 'StatusChange',
                notes: `Order Cancelled. Reason: ${reason}`
            });

            // Log Audit
             await AuditLog.create({
                entity_type: 'Order',
                entity_id: id,
                action: 'Update',
                changes: {
                    old: { status: order.status_order },
                    new: { status: 'Cancelled' }
                },
                ip_address: req.ip,
                user_id: userId
            });

             // Send Notifications
             try {
                 // Notify Admin, Sales, Finance, Technical
                 const allUsers = await User.findAll();
                 const recipients = allUsers.filter(u => u.role === 'Admin' || u.role === 'Finance' || u.role === 'Technical' || u.id === order.sales_person_id).map(u => u.email);
                 const customer = await Customer.findById(updatedOrder.customer_id);

                 if (recipients.length > 0) {
                     await emailService.sendOrderNotification(recipients, {
                         ...updatedOrder,
                         customer_name: customer?.company_name,
                         last_modified_by: userEmail,
                         notes: newNotes // Include reason in email
                     }, 'Order Cancelled');
                 }
            } catch (e) {
                logger.error('Failed to send cancellation email', e);
            }

            res.json({
                success: true,
                order: updatedOrder
            });

        } catch (error) {
            logger.error('Cancel order error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Get orders by customer ID
    static async getOrdersByCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const { status_order, search } = req.query;
            const { role, id: userId } = req.currentUser;
            
            logger.info('Get orders by customer request', { 
                customerId,
                user: req.currentUser?.email,
                ip: req.ip,
                filters: { status_order, search }
            });

            // Verify customer exists
            const customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({ 
                    error: 'Customer not found', 
                    success: false 
                });
            }

            // Build filters
            const filters = { customer_id: customerId };
            if (status_order) filters.status_order = status_order;
            if (search) filters.search = search;

            const orders = await Order.findAll(filters);
            
            res.json({
                success: true,
                orders,
                count: orders.length
            });
        } catch (error) {
            logger.error('Get orders by customer error:', error);
            res.status(500).json({ 
                error: 'Internal server error', 
                success: false 
            });
        }
    }
}

module.exports = OrderController;