const express = require('express');
const router = express.Router();
const ZohoInvoiceController = require('../controllers/zohoInvoiceController');
const { requireRole } = require('../middleware/roleMiddleware');
const { jwtAuth } = require('../middleware/authMiddleware');

// All zoho-invoices routes are restricted to Finance and Admin roles
const financeOrAdmin = requireRole(['Finance', 'Admin']);

// Public Webhook Route (Secured inside controller via secret header)
router.post('/webhook', ZohoInvoiceController.handleZohoWebhook);

// New Signing Workflow Routes (Frontend-side signing)
router.get('/ttn-config', jwtAuth, financeOrAdmin, ZohoInvoiceController.getTTNConfig);

// Get all invoices
router.get('/', jwtAuth, financeOrAdmin, ZohoInvoiceController.getAllInvoices);

// Get invoice by ID
router.get('/:id', jwtAuth, financeOrAdmin, ZohoInvoiceController.getInvoiceById);

// Create invoice
router.post('/', jwtAuth, financeOrAdmin, ZohoInvoiceController.createInvoice);

// Update invoice (Partial Update)
router.patch('/:id', jwtAuth, financeOrAdmin, ZohoInvoiceController.updateInvoice);
router.put('/:id', jwtAuth, financeOrAdmin, ZohoInvoiceController.updateInvoice);

// Delete invoice
router.delete('/:id', jwtAuth, financeOrAdmin, ZohoInvoiceController.deleteInvoice);

// Convert to XML
router.post('/:id/convert-xml', jwtAuth, financeOrAdmin, ZohoInvoiceController.convertToXML);

// New Signing Workflow Routes (Frontend-side signing) (Remaining)
router.get('/:id/xml-no-sign', jwtAuth, financeOrAdmin, ZohoInvoiceController.getUnsignedXML);
router.post('/:id/save-signed-xml', jwtAuth, financeOrAdmin, ZohoInvoiceController.saveSignedXML);

// New TTN Workflow Routes (Frontend-side agent calls)
router.post('/:id/update-ttn-submit', jwtAuth, financeOrAdmin, ZohoInvoiceController.updateTtnSubmit);
router.post('/:id/update-ttn-consult', jwtAuth, financeOrAdmin, ZohoInvoiceController.updateTtnConsult);

module.exports = router;