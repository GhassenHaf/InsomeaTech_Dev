const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// Zoho CRM webhook for new customers
router.post('/zoho/customer', WebhookController.handleZohoCustomerWebhook);

module.exports = router;