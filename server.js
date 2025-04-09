const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { readFileSync } = require('fs');
const serveStatic = require('serve-static');
const { fdkExtension } = require('./fdkSetup/fdk');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const proxyPathRoutes = require('./src/routes/proxyPathRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const { default: axios } = require('axios');

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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-ID');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  // Request logging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// 🔁 Proxy Middleware for frontend development
const proxyTarget = 'https://api.fynd.com';
app.use(
  '/proxy-api',
  createProxyMiddleware({
    target: proxyTarget,
    changeOrigin: true,
    pathRewrite: {
      '^/proxy-api': '/service/platform',
    },
    onProxyReq(proxyReq, req) {
      proxyReq.setHeader('accept', 'application/json');
      if (req.headers.cookie) {
        proxyReq.setHeader('cookie', req.headers.cookie);
      }
    },
  })
);

// API Routes Setup
const platformApiRoutes = fdkExtension.platformApiRoutes;
const applicationProxyRoutes = fdkExtension.applicationProxyRoutes;

// Mount API Routes
platformApiRoutes.use('/products', productRoutes);
platformApiRoutes.use('/company', companyRoutes);
platformApiRoutes.use('/application', applicationRoutes);
platformApiRoutes.use('/proxy-path', proxyPathRoutes);

// Mount Webhook Routes
app.use('/api/webhook-events', webhookRoutes);

// FDK Extension Handlers
app.use('/api', platformApiRoutes);
app.use('/', applicationProxyRoutes);
const apiProxyRoutes = fdkExtension.applicationProxyRoutes;
applicationProxyRoutes.use('/proxy', require('./src/routes/applicationRoutes')); // proxy-url/proxy/application
app.use('/', apiProxyRoutes);
app.use('/', fdkExtension.fdkHandler);

app.use('*', async (req, res, next) => {
  try {
    // Skip if request already handled by explicit routes
    if (req.path.startsWith('/ext/db/proxy')) return next();

    // Rest of your dynamic proxy logic...
    const { platformClient } = req;
    if (!platformClient) return next();

    const applicationId = await req.extension?.storage?.get('app_id');
    if (!applicationId) return next();

    const proxyPaths = {
      items: [
        {
          attached_path: 'ext/db/proxy',
          proxy_url: 'https://formerly-perfume-takes-gibson.trycloudflare.com', // Correct Fynd API URL
        },
      ],
    };

    const requestPath = req.originalUrl;
    const matchingProxy = proxyPaths.items.find((item) => requestPath.startsWith(`/${item.attached_path}`));

    if (!matchingProxy) return next();

    const proxy = createProxyMiddleware({
      target: matchingProxy.proxy_url,
      changeOrigin: true,
      pathRewrite: {
        [`^/${matchingProxy.attached_path}`]: '',
      },
      onProxyReq(proxyReq, req) {
        proxyReq.setHeader('accept', 'application/json');
        if (req.headers.cookie) {
          proxyReq.setHeader('cookie', req.headers.cookie);
        }
      },
    });

    return proxy(req, res, next);
  } catch (error) {
    console.error('Dynamic Proxy Error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// app.use('*', async (req, res, next) => {
//   try {
//     console.log('Dynamic Proxy Handler - Request:', req.originalUrl);

//     // 1. Check if platformClient is available
//     const { platformClient } = req;
//     if (!platformClient) return next();

//     // 2. Get applicationId (optional, if needed for auth)
//     const applicationId = await req.extension?.storage?.get('app_id');
//     if (!applicationId) return next();

//     // 3. Define proxy paths (previously hardcoded as empty)
//     const proxyPaths = {
//       items: [
//         {
//           attached_path: 'ext/db/proxy', // Matches /ext/db/proxy/*
//           proxy_url: 'https://formerly-perfume-takes-gibson.trycloudflare.com', // Target Fynd API
//         },
//         // Add more paths if needed
//       ],
//     };

//     // 4. Check if the request matches any proxy path
//     const requestPath = req.originalUrl;
//     const matchingProxy = proxyPaths.items.find((item) => requestPath.startsWith(`/${item.attached_path}`));

//     if (!matchingProxy) return next();

//     console.log('Proxying request to:', matchingProxy.proxy_url);

//     // 5. Create and apply the proxy
//     const proxy = createProxyMiddleware({
//       target: matchingProxy.proxy_url,
//       changeOrigin: true,
//       pathRewrite: {
//         [`^/${matchingProxy.attached_path}`]: '', // Removes /ext/db/proxy from the path
//       },
//       onProxyReq(proxyReq, req) {
//         proxyReq.setHeader('accept', 'application/json');
//         if (req.headers.cookie) {
//           proxyReq.setHeader('cookie', req.headers.cookie);
//         }
//         // Add auth headers if needed (e.g., Authorization)
//       },
//     });

//     return proxy(req, res, next);
//   } catch (error) {
//     console.error('Dynamic Proxy Error:', error);
//     res.status(500).json({ error: 'Proxy failed' });
//   }
// });

// Test Route

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
