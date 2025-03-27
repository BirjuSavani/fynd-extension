const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { readFileSync } = require('fs');
const serveStatic = require('serve-static');
const axios = require('axios');
const { fdkExtension } = require('./fdkSetup/fdk');
const proxyRoutes = require('./src/routes/proxy.routes');

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

// FDK Extension Handlers
app.use('/', fdkExtension.fdkHandler);
app.use('/', proxyRoutes);
const apiProxyRoutes = fdkExtension.applicationProxyRoutes;
proxyRoutes.use('/proxy', require('./src/routes/filter.routes'));
app.use('/', apiProxyRoutes);

// API Routes
const platformApiRoutes = fdkExtension.platformApiRoutes;
const productRouter = express.Router();
const companyRouter = express.Router();
const applicationRouter = express.Router();

// Webhook Route
app.post('/api/webhook-events', async (req, res) => {
  try {
    console.log(`Webhook Event: ${req.body.event} received`);
    await fdkExtension.webhookRegistry.processWebhook(req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`Error Processing ${req.body.event} Webhook:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Product Routes
productRouter.get('/', async (req, res, next) => {
  try {
    console.log("TEST");
    const { platformClient } = req;
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    const data = await platformClient.catalog.getProducts();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching products:', err);
    next(err);
  }
});

productRouter.get('/application/:application_id', async (req, res, next) => {
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
});

productRouter.get('/applications/:application_id', async (req, res, next) => {
  try {
    console.log('Fetching products...');
    const { platformClient } = req;
    const { application_id } = req.params;
    const { query, sort_by, order = 'asc', page = 1, limit = 10 } = req.query;

    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });

    // Fetch products
    const data = await platformClient.application(application_id).catalog.getAppProducts();
    if (!data.items?.length) return res.json({ items: [] });

    console.log(`Found ${data.items.length} products for application ID: ${application_id}`);

    // Extract possible filter values
    const allBrands = new Set(),
      allCategories = new Set(),
      allColors = new Set();

    data.items.forEach(({ brand, category_slug, color }) => {
      if (brand?.name) allBrands.add(brand.name.toLowerCase());
      if (category_slug) allCategories.add(category_slug.toLowerCase().replace(/-/g, ' '));
      // if (color) allColors.add(color.toLowerCase());
      if (color) {
        color.split(',').forEach((col) => allColors.add(col.trim().toLowerCase()));
      }
    });

    console.log(allColors);
    // Extract filters from query
    const filters = extractFiltersFromQuery(query, allBrands, allCategories, allColors);
    console.log('Extracted filters:', filters);

    // Apply filters
    let filteredProducts = data.items.filter(({ brand, category_slug, color, price, name }) => {
      const productBrand = brand?.name?.toLowerCase() || '';
      const productCategory = category_slug?.toLowerCase().replace(/-/g, ' ') || '';
      // const productColor = color?.toLowerCase() || '';
      const productColors = color ? color.split(',').map((col) => col.trim().toLowerCase()) : [];
      const effectivePrice = price?.effective?.min || price?.effective?.max || 0;
      const productName = name?.toLowerCase() || '';

      return (
        (!filters.brand || productBrand.includes(filters.brand)) && // Allow partial brand match
        (!filters.category || productCategory.includes(filters.category)) &&
        // (!filters.color || productColor.includes(filters.color)) &&
        (!filters.color || filters.color.some((col) => productColors.includes(col))) &&
        (!filters.max_price || effectivePrice <= filters.max_price) &&
        (!filters.min_price || effectivePrice >= filters.min_price) &&
        (!filters.exact_price || effectivePrice === filters.exact_price) &&
        (!filters.keyword || productName.includes(filters.keyword))
      );
    });

    console.log(`Filtered ${filteredProducts.length} products based on query`);

    // Sorting logic
    if (sort_by) {
      filteredProducts.sort((a, b) => {
        let valueA, valueB;
        switch (sort_by) {
          case 'price':
            valueA = a.price?.effective?.min || a.price?.effective?.max || 0;
            valueB = b.price?.effective?.min || b.price?.effective?.max || 0;
            break;
          case 'name':
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
            break;
          default:
            return 0;
        }
        return order === 'desc' ? valueB - valueA : valueA - valueB;
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + parseInt(limit));

    return res.json({
      items: paginatedProducts,
      total: filteredProducts.length,
      page: parseInt(page),
      limit: parseInt(limit),
      has_next: startIndex + limit < filteredProducts.length,
    });
  } catch (err) {
    console.error('Error fetching application products:', err);
    next(err);
  }
});

/**
 * Extracts filters dynamically from user query
 */
function extractFiltersFromQuery(query, brands, categories, colors) {
  if (!query) return {};

  const lowerQuery = query.toLowerCase();
  const filters = {};

  // Use regex to match exact words instead of just checking includes
  // filters.brand = Array.from(brands).find((b) => new RegExp(`\\b${b}\\b`).test(lowerQuery)) || null;
  // filters.category = Array.from(categories).find((c) => new RegExp(`\\b${c}\\b`).test(lowerQuery)) || null;
  // filters.color = Array.from(colors).find((col) => new RegExp(`\\b${col}\\b`).test(lowerQuery)) || null;
  // filters.keyword = lowerQuery.includes('name') ? lowerQuery.replace('name', '').trim() : null;

  // Extract exact match for brand
  filters.brand = Array.from(brands).find((b) => lowerQuery.includes(b)) || null;

  // Extract exact match for category
  filters.category = Array.from(categories).find((c) => lowerQuery.includes(c)) || null;

  // Extract exact match for color
  // filters.color = Array.from(colors).find((col) => lowerQuery.includes(col)) || null;
  // filters.color = Array.from(colors).filter((col) => lowerQuery.includes(col)); // Capture multiple colors
  filters.color = Array.from(colors).filter((col) => lowerQuery.includes(col));
  if (filters.color.length === 0) {
    filters.color = null;
  } else if (filters.color.length > 1) {
    const colorCombo = filters.color.join(', ');
    if (colors.has(colorCombo)) {
      filters.color = colorCombo; // Match exact color combination
    }
  }

  // Extract keyword-based search
  filters.keyword = lowerQuery.includes('name') ? lowerQuery.replace('name', '').trim() : null;

  // Extract price conditions using regex
  const priceMatch = lowerQuery.match(/\b(?:under|above|for|is) (\d+)\b/);
  const rangeMatch = lowerQuery.match(/\bbetween (\d+) to (\d+)\b/);

  if (priceMatch) {
    const [_, price] = priceMatch;
    if (lowerQuery.includes('under')) filters.max_price = parseFloat(price);
    if (lowerQuery.includes('above')) filters.min_price = parseFloat(price);
    if (lowerQuery.includes('for') || lowerQuery.includes('is')) filters.exact_price = parseFloat(price);
  }

  if (rangeMatch) {
    const [_, minPrice, maxPrice] = rangeMatch;
    filters.min_price = parseFloat(minPrice);
    filters.max_price = parseFloat(maxPrice);
  }

  return filters;
}

// Company Routes
companyRouter.get('/all-token', async (req, res, next) => {
  try {
    const { platformClient } = req;
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    return res.json({ companyId: platformClient.config.companyId });
  } catch (error) {
    console.error('Error fetching company ID:', error);
    next(error);
  }
});

// Application Routes
applicationRouter.get('/all-applications', async (req, res, next) => {
  try {
    console.log(req, 'birju');
    const { platformClient } = req;
    const { company_id } = req.query;
    console.log(platformClient);
    if (!company_id) return res.status(400).json({ message: 'Company ID is required' });
    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });

    const token = platformClient.config.oauthClient.token;
    let allApplications = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const apiUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=${page}&page_size=10`;
      const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (data?.items?.length > 0) {
        allApplications = [
          ...allApplications,
          ...data.items.map(({ _id, name, logo }) => ({ _id, name, logo: logo?.secure_url || null })),
        ];
        page++;
      } else {
        hasMore = false;
      }
    }
    return res.json(allApplications);
  } catch (err) {
    console.error('Error fetching applications:', err.message);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Mount API Routes
platformApiRoutes.use(
  '/products',
  (req, res) => {
    console.log(req, 'request');
  },
  productRouter
);
platformApiRoutes.use('/company', companyRouter);
platformApiRoutes.use('/application', applicationRouter);
app.use('/api', platformApiRoutes);

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

module.exports = app;
