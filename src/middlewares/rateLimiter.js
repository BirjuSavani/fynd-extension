const rateLimit = require('express-rate-limit');

/**
 * Cleaned-up rate limiter for Fynd extensions
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each unique key to 15 requests per window
  standardHeaders: true,
  legacyHeaders: false,

  // Use company ID and IP address to create a unique rate-limit key
  keyGenerator: req => {
    // Get company ID from query params
    let companyId = 'unknown';
    if (req._parsedOriginalUrl?.query) {
      const queryParams = new URLSearchParams(req._parsedOriginalUrl.query);
      if (queryParams.has('company_id')) {
        companyId = queryParams.get('company_id');
      }
    }

    // Get client IP - take only first IP from X-Forwarded-For
    const clientIp =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    console.log(`Rate limit key: company=${companyId}, ip=${clientIp}`);

    return `${companyId}_${clientIp}`;
  },

  // Custom response handler
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      success: false,
      message: `Rate limit exceeded. Please try again after 15 minutes.`,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'You have exceeded the rate limit. Please try again later.',
        info: `Maximum 15 requests allowed in 15 minutes.`,
        trace_id: req.requestId || 'unknown',
      },
    });
  },
});

module.exports = apiRateLimiter;