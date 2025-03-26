'use strict';

const config = require('./config');
/**
 * CreateProxy constructor
 */

const { fdkExtension } = require('../../fdkSetup/fdk');
exports.createProxy = async (req, res, next) => {
  try {
    const payload = req.body;
    // const app_id = '672ddc7346bed2c768faf043';
    const { platformClient } = req;
    // const platformAppCli = platformClient.application(app_id);
    const platformAppCli = platformClient.application(payload['app_id']);
    const isProxyDefined = await addProxy(platformAppCli, config.extension);
    return res.json({ status: isProxyDefined });
  } catch (error) {
    console.error('Error adding proxy URL:', error);
    return next(error);
  }
};

/**
 * DeleteProxy Controller
 */
exports.deleteProxy = async (req, res, next) => {
  try {
    const { app_id, attached_path } = req.body;
    const platformClient = req.platformClient;

    if (!app_id || !attached_path) {
      return res.status(400).json({ message: 'Missing required fields: app_id and attached_path are both required.' });
    }

    const response = await platformClient.application(app_id).partner.removeProxyPath({
      extensionId: process.env.EXTENSION_API_KEY,
      attachedPath: attached_path,
    });

    return res.status(200).json({
      message: 'Proxy URL deleted successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error deleting proxy URL:', error);
    return next(error);
  }
};

const addProxy = async (platformAppCli, config) => {
  let isProxyDefined = false;
  // let { api_key, base_url } = config;
  let api_key = '677cb8d2e9dd5873357d2bf2';
  let base_url = fdkExtension.extension.configData.base_url;
  console.log(base_url, 'BIRJU');
  try {
    let response = await platformAppCli.partner.addProxyPath({
      extensionId: process.env.EXTENSION_API_KEY || api_key,
      body: {
        attached_path: 'db',
        proxy_url: base_url,
      },
    });
    isProxyDefined = true;
  } catch (error) {
    console.log(error);
  }
};

exports.createFilter = async (req, res, next) => {
  try {
    console.log('Fetching products...');
    const { platformClient } = req;
    // const { application_id } = req.params;
    const application_id = '672ddc7346bed2c768faf043';
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
};

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
