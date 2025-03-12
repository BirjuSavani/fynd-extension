const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const serveStatic = require('serve-static');
const { readFileSync } = require('fs');
const { setupFdk } = require('@gofynd/fdk-extension-javascript/express');
const { SQLiteStorage } = require('@gofynd/fdk-extension-javascript/express/storage');

const sqliteInstance = new sqlite3.Database('recently_viewed.db');
const productRouter = express.Router();

console.log('EXTENSION_API_KEY:', process.env.EXTENSION_API_KEY);
console.log('EXTENSION_API_SECRET:', process.env.EXTENSION_API_SECRET);
console.log('EXTENSION_BASE_URL:', process.env.EXTENSION_BASE_URL);
console.log('FP_API_DOMAIN:', process.env.FP_API_DOMAIN);

// Initialize FDK Extension
const fdkExtension = setupFdk({
  api_key: process.env.EXTENSION_API_KEY,
  api_secret: process.env.EXTENSION_API_SECRET,
  base_url: process.env.EXTENSION_BASE_URL,
  cluster: process.env.FP_API_DOMAIN,
  callbacks: {
    auth: async (req) => {
      return `${req.extension.base_url}/company/${req.query.company_id}`;
    },
    uninstall: async (req) => {
      // Cleanup logic here
    },
  },
  storage: new SQLiteStorage(sqliteInstance, 'example-fynd-platform-extension'),
  access_mode: 'offline',
  webhook_config: {
    api_path: '/api/webhook-events',
    notification_email: 'useremail@example.com',
    event_map: {
      'company/product/delete': {
        handler: (eventName) => {
          console.log(eventName);
        },
        version: '1',
      },
    },
  },
});

const STATIC_PATH =
  process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'frontend', 'public', 'dist')
    : path.join(process.cwd(), 'frontend');
    
const app = express();
const platformApiRoutes = fdkExtension.platformApiRoutes;

// Middleware
app.use(cookieParser('ext.session'));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(serveStatic(STATIC_PATH, { index: false }));

// FDK extension handler and API routes
app.use('/', fdkExtension.fdkHandler);

// Webhook route
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

// Route to fetch all products
productRouter.get('/', async (req, res, next) => {
  try {
    console.log('JAY SHREE RAM');
    const { platformClient } = req;
    if (!platformClient) {
      return res.status(401).json({ message: 'Platform client is not available' });
    }
    const data = await platformClient.catalog.getProducts();

    // Construct the full URL
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    console.log('Full request URL:', fullUrl);
    // Full request URL: http://binary-chem-pure-liability.trycloudflare.com/api/products

    return res.json(data);
  } catch (err) {
    console.error('Error fetching products:', err);
    next(err);
  }
});

// Route to fetch products for a specific application
productRouter.get('/application/:application_id', async (req, res, next) => {
  try {
    console.log('Fetching products...');
    const { platformClient } = req;
    const { application_id } = req.params;

    if (!platformClient) {
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    const data = await platformClient.application(application_id).catalog.getAppProducts();

    if (!data.items || data.items.length === 0) {
      console.log('No products found for application ID:', application_id);
    } else {
      console.log(`Found ${data.items.length} products for application ID: ${application_id}`);
      data.items.forEach((product, index) => {
        // console.log(`\n🔹 Product ${index + 1}:`);
        // console.log(`   Name: ${product.name}`);
        // console.log(`   Item Code: ${product.item_code || 'N/A'}`);
        // console.log(`   Brand: ${product.brand?.name || 'N/A'}`);
        // console.log(`   Category: ${product.category_slug || 'N/A'}`);
        // console.log(`   Color: ${product.color || 'N/A'}`);

        // // Debugging: Print the full price object
        // console.log(`   Full Price Object:`, JSON.stringify(product.price, null, 2));

        // Extract and format price properly
        const price = product.price;
        if (price && typeof price === 'object') {
          const effectivePrice = price.effective?.min || price.effective?.max || 'N/A';
          const currency = price.effective?.currency_symbol || price.effective?.currency_code || 'N/A';
          // console.log(`   Price: ${currency} ${effectivePrice}`);
        } else {
          console.log(`   Price: N/A`);
        }
      });
    }

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
  const rangeMatch = lowerQuery.match(/\bbetween (\d+) and (\d+)\b/);

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

// Mount product routes

platformApiRoutes.use('/products', productRouter);

// API routes
app.use('/api', platformApiRoutes);

// Test route
app.get('/test', (req, res) => {
  try {
    res.json({ message: 'Public route working!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  return res
    .status(200)
    .set('Content-Type', 'text/html')
    .send(readFileSync(path.join(STATIC_PATH, 'index.html')));
});

module.exports = app;
