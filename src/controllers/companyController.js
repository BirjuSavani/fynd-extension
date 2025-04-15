const { logger } = require('../utils/logger');
// Get company token
exports.getAllToken = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;
    if (!platformClient) {
      logger.error('Platform client not available', { requestId });
      return res.status(401).json({ message: 'Platform client is not available' });
    }
    return res.json({ companyId: platformClient.config.companyId });
  } catch (error) {
    logger.error('Error getting company token', { requestId, error: error.message });
    next(error);
  }
};
