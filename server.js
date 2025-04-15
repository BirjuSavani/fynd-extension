const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { readFileSync } = require('fs');
const serveStatic = require('serve-static');
const { fdkExtension } = require('./fdkSetup/fdk');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { logger, requestLogger } = require('./src/utils/logger');

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

app.use(async (req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-ID');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  try {
    const ptClient = await fdkExtension.getPlatformClient('9095');
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

// Serve React App for All Other Routes
app.get('*', (req, res) => {
  return res
    .status(200)
    .set('Content-Type', 'text/html')
    .send(readFileSync(path.join(STATIC_PATH, 'index.html')));
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Global error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.originalUrl,
  });

  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
