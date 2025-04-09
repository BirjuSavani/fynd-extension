const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Process webhook events
router.post('/', webhookController.processWebhook);

module.exports = router;
