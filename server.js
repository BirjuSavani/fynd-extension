const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { readFileSync } = require('fs');
const serveStatic = require('serve-static');
const { fdkExtension } = require('./fdkSetup/fdk');

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

app.use(async (req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-ID');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  const ptClient = await fdkExtension.getPlatformClient('9095');
  // console.log('ptclient-->', ptClient);
  req.platformClient = ptClient;
  // Request logging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes Setup

const platformApiRoutes = fdkExtension.platformApiRoutes;
// const platformApiRoutes = fdkExtension.applicationProxyRoutes;

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
  if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
  console.log(platformClient);
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
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
