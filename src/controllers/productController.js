// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    console.log('TEST');
    const { platformClient } = req;
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    const data = await platformClient.catalog.getProducts();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching products:', err);
    next(err);
  }
};

// Get products for a specific application
exports.getProductsByApplication = async (req, res, next) => {
  try {
    const { platformClient } = req;
    const { application_id } = req.params;
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    const data = await platformClient.application(application_id).catalog.getAppProducts();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching application products:', err);
    next(err);
  }
};
