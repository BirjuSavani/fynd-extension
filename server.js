const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { readFileSync } = require('fs');
const serveStatic = require('serve-static');
const { fdkExtension, pltClient, getPlatformClientAsync } = require('./fdkSetup/fdk');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { logger, requestLogger } = require('./src/utils/logger');
const cors = require('cors');

dayjs.extend(utc);
dayjs.extend(timezone);

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const proxyPathRoutes = require('./src/routes/proxyPathRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');

// Constants
const STATIC_PATH =
  process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'frontend', 'public', 'dist')
    : path.join(process.cwd(), 'frontend');

// Initialize Express App
const app = express();

// Middleware
app.use(cookieParser('ext.session'));
app.use(express.json());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(serveStatic(STATIC_PATH, { index: false }));

// Apply request logger middleware - this will handle all request logging
app.use(requestLogger);

// Environment-based CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? ['https://intech-shoes.fynd.io', 'https://*.fynd.io', 'https://*.fynd.com']
    : ['http://localhost:8080', 'https://intech-shoes.fynd.io'];

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server requests)
    if (!origin) return callback(null, true);

    // Check against allowed origins
    const originAllowed = allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (origin === allowedOrigin) return true;

      // Wildcard subdomain matching (e.g., *.fynd.io)
      if (allowedOrigin.startsWith('https://*.') || allowedOrigin.startsWith('http://*.')) {
        const domain = allowedOrigin.split('*.')[1];
        return origin.endsWith(domain);
      }

      return false;
    });

    if (originAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked for origin: ${origin}`, {
        allowedOrigins,
        path: req?.path,
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Fixed typo here
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Platform client middleware
app.use(async (req, res, next) => {
  try {
    // const ptClient = await fdkExtension.getPlatformClient('9095');
    const ptClient = await getPlatformClientAsync();
    req.platformClient = ptClient;
    next();
  } catch (error) {
    logger.error(`Failed to get platform client: ${error.message}`, { error });
    next(error);
  }
});

// API Routes Setup
const platformApiRoutes = fdkExtension.platformApiRoutes;

const applicationProxyRoutes = fdkExtension.applicationProxyRoutes;

// Mount API Routes
platformApiRoutes.use('/products', productRoutes);
platformApiRoutes.use('/company', companyRoutes);
platformApiRoutes.use('/application', applicationRoutes);
platformApiRoutes.use('/proxy-path', proxyPathRoutes);

applicationProxyRoutes.use('/proxy', applicationRoutes);
// Mount Webhook Routes
app.use('/api/webhook-events', webhookRoutes);

// FDK Extension Handlers
app.use('/api/platform', platformApiRoutes);

app.use('/api', applicationProxyRoutes);
app.use('/', fdkExtension.fdkHandler);

app.get('/test', async (req, res) => {
  const { platformClient } = req;
  if (!platformClient) {
    logger.error('Platform client is not available for test endpoint');
    return res.status(401).json({ message: 'Platform client is not available' });
  }
  logger.info('Test endpoint accessed with platform client', {
    platformClientAvailable: true,
    requestId: req.requestId,
  });
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  try {
    logger.info('Health endpoint accessed', { requestId: req.requestId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error accessing health endpoint', { requestId: req.requestId, error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve React App for All Other Routes
app.get('*', (req, res) => {
  return res
    .status(200)
    .set('Content-Type', 'text/html')
    .send(readFileSync(path.join(STATIC_PATH, 'index.html')));
});

// Error Handler
app.use((err, req, res, next) => {
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS violation attempt', {
      origin: req.headers.origin,
      path: req.path,
      requestId: req.requestId,
      allowedOrigins,
      environment: process.env.NODE_ENV,
    });
    return res.status(403).json({
      error: 'CORS Policy',
      message: `Origin '${req.headers.origin}' not allowed`,
      allowedOrigins: process.env.NODE_ENV === 'production' ? ['fynd.io domains'] : allowedOrigins,
    });
  }

  logger.error('Global error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.originalUrl,
    headers: req.headers,
  });

  res.status(500).json({ error: 'Internal Server Error', requestId: req.requestId });
});

module.exports = app;

// sudo docker build -t fynd-extension .
