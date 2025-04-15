const { logger } = require('../utils/logger');
// Get all products
exports.getProducts = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;

    logger.info('Fetching all products', { requestId });

    if (!platformClient) {
      logger.error('Platform client not available', { requestId });
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    const data = await platformClient.catalog.getProducts();

    logger.info('Products fetched successfully', { requestId });
    return res.json(data);
  } catch (err) {
    logger.error('Error fetching products', { requestId, error: err });
    next(err);
  }
};

// Get products for a specific application
exports.getProductsByApplication = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;
    const { application_id } = req.params;

    if (!platformClient) {
      logger.error('Platform client not available', { requestId });
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    if (!application_id) {
      logger.warn('Missing application_id in request', { requestId });
      return res.status(400).json({ message: 'Application ID is required' });
    }
    const data = await platformClient.application(application_id).catalog.getAppProducts();

    logger.info('Products fetched successfully', { requestId });

    return res.json(data);
  } catch (err) {
    logger.error('Error fetching products', { requestId, error: err });
    next(err);
  }
};
