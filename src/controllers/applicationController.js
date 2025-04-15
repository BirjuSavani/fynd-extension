const axios = require('axios');
const { logger } = require('../utils/logger');

// Helper function to extract filters from query
function extractFiltersFromQuery(query, brands, categories, colors) {
  if (!query) return {};

  const lowerQuery = query.toLowerCase();
  const filters = {};

  // Extract exact match for brand
  filters.brand = Array.from(brands).find((b) => lowerQuery.includes(b)) || null;

  // Extract exact match for category
  filters.category = Array.from(categories).find((c) => lowerQuery.includes(c)) || null;

  // Extract exact match for color
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

// Get all applications
exports.getAllApplications = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;
    const { company_id } = req.query;

    logger.info(`Fetching all applications for company_id: ${company_id}`, { requestId, company_id });

    if (!company_id) {
      logger.warn('Missing company_id in request', { requestId });
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!platformClient) {
      logger.error('Platform client not available', { requestId });
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    const token = platformClient.config.oauthClient.token;
    let allApplications = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const apiUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=${page}&page_size=10`;
      logger.debug(`Requesting applications page ${page}`, { requestId, url: apiUrl });
      const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (data?.items?.length > 0) {
        allApplications = [
          ...allApplications,
          ...data.items.map(({ _id, name, logo }) => ({ _id, name, logo: logo?.secure_url || null })),
        ];
        page++;
        logger.debug(`Received ${data.items.length} applications, total so far: ${allApplications.length}`, {
          requestId,
        });
      } else {
        hasMore = false;
      }
    }
    logger.info(`Successfully fetched ${allApplications.length} applications`, {
      requestId,
      count: allApplications.length,
    });
    return res.json(allApplications);
  } catch (err) {
    logger.error('Error fetching applications', {
      requestId,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Get products for an application with filtering
exports.getApplicationProducts = async (req, res, next) => {
  console.log('req.query', req.query)
  const requestId = req.requestId || 'unknown';

  try {
    logger.info('Fetching products for application', { requestId });

    const { platformClient } = req;
    const { application_id } = req.params;
    const { company_id, query } = req.query;

    if (!company_id) {
      logger.warn('Missing company_id in request', { requestId });
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!platformClient) {
      logger.error('Platform client not available', { requestId });
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    if (!application_id) {
      logger.warn('Missing application_id in request', { requestId });
      return res.status(400).json({ message: 'Application ID is required' });
    }

    const { sort_by, order = 'asc', page = 1, limit = 10 } = req.query;

    // Fetch products
    logger.debug(`Fetching products from API for application: ${application_id}`, { requestId });
    const data = await platformClient.application(application_id).catalog.getAppProducts();
    if (!data.items?.length) {
      logger.info('No products found for application', { requestId, application_id });
      return res.json({ items: [] });
    }

    logger.info(`Found ${data.items.length} products for application`, {
      requestId,
      application_id,
      productCount: data.items.length,
    });

    // Extract possible filter values
    const allBrands = new Set(),
      allCategories = new Set(),
      allColors = new Set();

    data.items.forEach(({ brand, category_slug, color }) => {
      if (brand?.name) allBrands.add(brand.name.toLowerCase());
      if (category_slug) allCategories.add(category_slug.toLowerCase().replace(/-/g, ' '));
      if (color) {
        color.split(',').forEach((col) => allColors.add(col.trim().toLowerCase()));
      }
    });

    // console.log(allColors);
    // Extract filters from query
    const filters = extractFiltersFromQuery(query, allBrands, allCategories, allColors);
    logger.debug('Extracted filters from query', { requestId, filters, query });

    // Apply filters
    let filteredProducts = data.items.filter(({ brand, category_slug, color, price, name }) => {
      const productBrand = brand?.name?.toLowerCase() || '';
      const productCategory = category_slug?.toLowerCase().replace(/-/g, ' ') || '';
      const productColors = color ? color.split(',').map((col) => col.trim().toLowerCase()) : [];
      const effectivePrice = price?.effective?.min || price?.effective?.max || 0;
      const productName = name?.toLowerCase() || '';

      return (
        (!filters.brand || productBrand.includes(filters.brand)) && // Allow partial brand match
        (!filters.category || productCategory.includes(filters.category)) &&
        (!filters.color || filters.color.some((col) => productColors.includes(col))) &&
        (!filters.max_price || effectivePrice <= filters.max_price) &&
        (!filters.min_price || effectivePrice >= filters.min_price) &&
        (!filters.exact_price || effectivePrice === filters.exact_price) &&
        (!filters.keyword || productName.includes(filters.keyword))
      );
    });

    logger.info(`Filtered to ${filteredProducts.length} products based on query`, {
      requestId,
      totalProducts: data.items.length,
      filteredCount: filteredProducts.length,
    });

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

    logger.info(`Returning ${paginatedProducts.length} products for page ${page}`, {
      requestId,
      pageNumber: page,
      pageLimit: limit,
      resultsCount: paginatedProducts.length,
    });

    return res.json({
      items: paginatedProducts,
      total: filteredProducts.length,
      page: parseInt(page),
      limit: parseInt(limit),
      has_next: startIndex + limit < filteredProducts.length,
    });
  } catch (err) {
    logger.error('Error fetching application products', {
      requestId,
      application_id: req.params.application_id,
      error: err.message,
      stack: err.stack,
    });
    next(err);
  }
};
