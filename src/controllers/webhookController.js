const { logger } = require('../utils/logger');
// Process webhook events
exports.processWebhook = async (req, res) => {
  const requestId = req.requestId || 'unknown';

  try {
    logger.info('Processing webhook', { requestId });
    logger.info(`Processing ${req.body.event} Webhook`, { requestId });

    await req.fdkExtension.webhookRegistry.processWebhook(req);

    logger.info('Webhook processed successfully', { requestId });
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Error processing webhook', { requestId, error: err });
    return res.status(500).json({ success: false, error: err.message });
  }
};
