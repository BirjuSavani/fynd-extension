// Process webhook events
exports.processWebhook = async (req, res) => {
  try {
    console.log(`Webhook Event: ${req.body.event} received`);
    await req.fdkExtension.webhookRegistry.processWebhook(req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`Error Processing ${req.body.event} Webhook:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
