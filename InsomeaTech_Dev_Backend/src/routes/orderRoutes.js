const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only PDF and image files
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'image/png' || 
            file.mimetype === 'image/jpeg' ||
            file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed'), false);
        }
    }
});

// Get all orders (filtered by role)
router.get('/', jwtAuth, OrderController.getAllOrders);

// Get orders by customer ID
router.get('/customer/:customerId', jwtAuth, OrderController.getOrdersByCustomer);

// Get order by ID
router.get('/:id', jwtAuth, OrderController.getOrderById);

// Create order (Sales only)
router.post('/', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), upload.fields([{ name: 'lpo', maxCount: 1 }, { name: 'so', maxCount: 1 }]), OrderController.createOrder);

// Update order (Sales/Technical/Admin)
router.put('/:id', jwtAuth, OrderController.updateOrder);

// Update order status (Technical/Admin)
router.put('/:id/status', jwtAuth, requireRole(['Technical', 'Admin']), OrderController.updateOrderStatus);

// Upload order files (Sales/Technical/Admin)
router.post('/:id/files', jwtAuth, requireRole(['Sales', 'Technical', 'Admin']), upload.single('file'), OrderController.uploadOrderFiles);

// Finance Approval (Finance/Admin)
router.patch('/:id/finance-approve', jwtAuth, requireRole(['Finance', 'Admin']), upload.single('distiPo'), OrderController.financeApprove);

// Start Provisioning (Technical/Admin)
router.patch('/:id/start-provisioning', jwtAuth, requireRole(['Technical', 'Admin']), OrderController.startProvisioning);

// Cancel Order (Finance/Admin)
router.patch('/:id/cancel', jwtAuth, requireRole(['Finance', 'Admin']), OrderController.cancelOrder);

// Download order files (Sales/Technical/Admin)
router.get('/:id/files/:type', jwtAuth, requireRole(['Sales', 'Technical','Finance', 'Admin']), OrderController.downloadOrderFile);

// Delete order (Admin only)

module.exports = router;