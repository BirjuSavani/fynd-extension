const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 100 requests per windowMs
  delayMs: 0, // disable delaying - full speed until the max limit is reached
  headers: true,
  handler: (req, res, next) => {
    res.status(429).json({
      status: 429,
      success: false,
      message: `Too many requests, Please try again after 15 minutes.`,
    });
  },
});

module.exports = apiRateLimiter;
