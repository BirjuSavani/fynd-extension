// Get company token
exports.getAllToken = async (req, res, next) => {
  try {
    const { platformClient } = req;
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    return res.json({ companyId: platformClient.config.companyId });
  } catch (error) {
    console.error('Error fetching company ID:', error);
    next(error);
  }
};
