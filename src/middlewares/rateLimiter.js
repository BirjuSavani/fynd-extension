// const rateLimit = require('express-rate-limit');

// const apiRateLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 15, // limit each IP to 100 requests per windowMs
//   delayMs: 0, // disable delaying - full speed until the max limit is reached
//   headers: true,
//   handler: (req, res, next) => {
//     res.status(429).json({
//       status: 429,
//       success: false,
//       message: `Too many requests, Please try again after 15 minutes.`,
//     });
//   },
// });

// module.exports = apiRateLimiter;

// middlewares/rateLimiter.js
// const rateLimit = require('express-rate-limit');

// /**
//  * Custom rate limiter for Fynd extensions
//  * This implementation is based on the actual request structure from your environment
//  */
// const apiRateLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 15, // Limit each unique key to 15 requests per window
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
//   // Custom key generator that uses multiple identifiers from the Fynd request
//   keyGenerator: (req) => {
//     // Extract application ID from the URL path
//     // Example URL path: /api/proxy/672ddc7346bed2c768faf043/products
//     let applicationId = 'unknown';
//     if (req._parsedOriginalUrl && req._parsedOriginalUrl.pathname) {
//       const pathParts = req._parsedOriginalUrl.pathname.split('/');
//       // Find the application ID in the path
//       for (let i = 0; i < pathParts.length; i++) {
//         // Look for MongoDB ObjectId-like strings (24 hex chars)
//         if (pathParts[i].match(/^[0-9a-f]{24}$/)) {
//           applicationId = pathParts[i];
//           break;
//         }
//       }
//     }

//     // Extract company ID from query params or platformClient
//     let companyId = 'unknown';
//     if (req._parsedOriginalUrl && req._parsedOriginalUrl.query) {
//       const queryParams = new URLSearchParams(req._parsedOriginalUrl.query);
//       if (queryParams.has('company_id')) {
//         companyId = queryParams.get('company_id');
//       }
//     }

//     // Backup: try to get company ID from platformClient if available
//     if (
//       companyId === 'unknown' &&
//       req.platformClient &&
//       req.platformClient.config &&
//       req.platformClient.config.companyId
//     ) {
//       companyId = req.platformClient.config.companyId;
//     }

//     // Get client IP - only the first IP from x-forwarded-for
//     let clientIp =
//       (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
//       (req.socket && req.socket.remoteAddress) ||
//       'unknown';

//     // Get requestId if available (unique per request but useful for logging)
//     const requestId = req.requestId || '';

//     // For debugging
//     console.log(`Rate limit key: company=${companyId}, app=${applicationId}, ip=${clientIp}`);

//     // Create a unique key that separates different users/companies
//     return `${companyId}_${applicationId}_${clientIp}`;
//   },
  
//   // Store rate limit information on the request object for potential later use
//   // This matches the structure seen in your request object
//   // onLimitReached: (req, res, options) => {
//   //   console.log(`Rate limit reached for: ${req._parsedOriginalUrl ? req._parsedOriginalUrl.path : 'unknown path'}`);
//   // },
  
//   // Custom response handler
//   handler: (req, res, next) => {
//     // Return a Fynd-compatible error response
//     res.status(429).json({
//       status: 429,
//       success: false,
//       message: `Rate limit exceeded. Please try again after 15 minutes.`,
//       error: {
//         code: "TOO_MANY_REQUESTS",
//         message: "You have exceeded the rate limit. Please try again later.",
//         info: `Maximum ${15} requests allowed in ${15} minutes.`,
//         trace_id: req.requestId || "unknown"
//       }
//     });
//   },

// });

// module.exports = apiRateLimiter;

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