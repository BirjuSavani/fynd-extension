const axios = require('axios');
const { logger } = require('../utils/logger');
const translate = require('translate-google-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract filters from query
async function extractFiltersFromQuery(query, brands, categories, colors) {
  if (!query) return {};

  let translatedQuery = query;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      store: true,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that translates user product queries into English.',
        },
        {
          role: 'user',
          content: `Translate this product search query to English: "${query}"`,
        },
      ],
    });

    translatedQuery = completion.choices[0].message.content;
    console.log('OpenAI translated query:', translatedQuery);
    logger.info(`OpenAI translated query: "${query}" -> "${translatedQuery}"`);
  } catch (err) {
    logger.warn('OpenAI translation failed, using original query', { error: err.message });
  }

  const lowerQuery = translatedQuery.toLowerCase();
  const filters = {};

  filters.brand = Array.from(brands).find(b => lowerQuery.includes(b)) || null;
  filters.category = Array.from(categories).find(c => lowerQuery.includes(c)) || null;

  filters.color = Array.from(colors).filter(col => lowerQuery.includes(col));
  if (filters.color.length === 0) {
    filters.color = null;
  } else if (filters.color.length > 1) {
    const colorCombo = filters.color.join(', ');
    if (colors.has(colorCombo)) {
      filters.color = colorCombo;
    }
  }

  filters.keyword = lowerQuery.includes('name') ? lowerQuery.replace('name', '').trim() : null;

  const priceMatch = lowerQuery.match(/\b(?:under|above|for|is) (\d+)\b/);
  const rangeMatch = lowerQuery.match(/\bbetween (\d+) to (\d+)\b/);

  if (priceMatch) {
    const [_, price] = priceMatch;
    if (lowerQuery.includes('under')) filters.max_price = parseFloat(price);
    if (lowerQuery.includes('above')) filters.min_price = parseFloat(price);
    if (lowerQuery.includes('for') || lowerQuery.includes('is'))
      filters.exact_price = parseFloat(price);
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

    logger.info(`Fetching all applications for company_id: ${company_id}`, {
      requestId,
      company_id,
    });

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
          ...data.items.map(({ _id, name, logo }) => ({
            _id,
            name,
            logo: logo?.secure_url || null,
          })),
        ];
        page++;
        logger.debug(
          `Received ${data.items.length} applications, total so far: ${allApplications.length}`,
          {
            requestId,
          }
        );
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
  console.log('req.query', req.query);
  const requestId = req.requestId || 'unknown';

  try {
    logger.info('Fetching products for application', { requestId });

    const { platformClient } = req;
    const { application_id } = req.params;
    const { company_id, query } = req.query; // Add language param

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
        color.split(',').forEach(col => allColors.add(col.trim().toLowerCase()));
      }
    });

    // console.log(allColors);
    // Extract filters from query
    const filters = await extractFiltersFromQuery(
      query,
      allBrands,
      allCategories,
      allColors
    );
    logger.debug('Extracted filters from query', { requestId, filters, query });

    // Apply filters
    let filteredProducts = data.items.filter(({ brand, category_slug, color, price, name }) => {
      const productBrand = brand?.name?.toLowerCase() || '';
      const productCategory = category_slug?.toLowerCase().replace(/-/g, ' ') || '';
      const productColors = color ? color.split(',').map(col => col.trim().toLowerCase()) : [];
      const effectivePrice = price?.effective?.min || price?.effective?.max || 0;
      const productName = name?.toLowerCase() || '';

      return (
        (!filters.brand || productBrand.includes(filters.brand)) && // Allow partial brand match
        (!filters.category || productCategory.includes(filters.category)) &&
        (!filters.color || filters.color.some(col => productColors.includes(col))) &&
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
      products: {
        items: paginatedProducts,
        total: filteredProducts.length,
        page: parseInt(page),
        limit: parseInt(limit),
        has_next: startIndex + limit < filteredProducts.length,
      },
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

// ---------------------------------------------------------------------------------

// const axios = require('axios');
// const { logger } = require('../utils/logger');
// const natural = require('natural');
// const hindiToEnglishDict = require('../dictionaries');

// // Pre-initialize and cache tokenizer to avoid recreating it with each request
// const tokenizer = new natural.WordTokenizer();
// const stemmer = natural.PorterStemmer;

// // Cache for stemmed words to avoid repetitive processing
// const stemCache = new Map();
// /**
//  * Special cases for phrases that need word reordering during translation
//  */
// const specialTranslationCases = {
//   'se kam': (words, i) => {
//     // Look for a number anywhere in the sentence
//     const numberIndex = words.findIndex((word, idx) => idx !== i && /^[₹]?\d+$/.test(word));

//     if (numberIndex >= 0) {
//       return {
//         replacement: `under ${words[numberIndex]}`,
//         wordsToRemove: [numberIndex], // Remove the number from its original position
//         skipNext: 0,
//       };
//     }
//     return { replacement: 'under', wordsToRemove: [], skipNext: 0 };
//   },
//   'se zyada': (words, i) => {
//     const numberIndex = words.findIndex((word, idx) => idx !== i && /^[₹]?\d+$/.test(word));

//     if (numberIndex >= 0) {
//       return {
//         replacement: `above ${words[numberIndex]}`,
//         wordsToRemove: [numberIndex],
//         skipNext: 0,
//       };
//     }
//     return { replacement: 'above', wordsToRemove: [], skipNext: 0 };
//   },
//   'se jyada': (words, i) => {
//     const numberIndex = words.findIndex((word, idx) => idx !== i && /^[₹]?\d+$/.test(word));

//     if (numberIndex >= 0) {
//       return {
//         replacement: `above ${words[numberIndex]}`,
//         wordsToRemove: [numberIndex],
//         skipNext: 0,
//       };
//     }
//     return { replacement: 'above', wordsToRemove: [], skipNext: 0 };
//   },
// };

// /**
//  * Identify and translate Hindi phrases to English
//  * @param {string} query - Original user query that may contain Hindi
//  * @returns {string} - Translated query with Hindi terms replaced with English equivalents
//  */
// function translateHindiToEnglish(query) {
//   if (!query) return query;

//   const queryLower = query.toLowerCase();
//   const words = queryLower.split(/\s+/);
//   const translatedWords = [];
//   const wordsToRemove = new Set();

//   for (let i = 0; i < words.length; i++) {
//     if (wordsToRemove.has(i)) continue;

//     const word = words[i];

//     // Check for special translation cases first
//     let specialCaseHandled = false;
//     for (const [phrase, handler] of Object.entries(specialTranslationCases)) {
//       if (word === phrase || (i < words.length - 1 && `${word} ${words[i + 1]}` === phrase)) {
//         const result = handler(words, i);
//         translatedWords.push(result.replacement);

//         // Mark words to be removed
//         if (result.wordsToRemove > 0) {
//           for (let j = i - result.wordsToRemove; j < i; j++) {
//             wordsToRemove.add(j);
//           }
//         }

//         i += word === phrase ? 0 : 1; // Skip next word if it was part of phrase
//         specialCaseHandled = true;
//         break;
//       }
//     }
//     if (specialCaseHandled) continue;

//     // Check for compound phrases (two words)
//     if (i < words.length - 1) {
//       const twoWordPhrase = `${word} ${words[i + 1]}`;
//       if (hindiToEnglishDict[twoWordPhrase]) {
//         translatedWords.push(hindiToEnglishDict[twoWordPhrase]);
//         i++; // Skip the next word as we've already processed it
//         continue;
//       }
//     }

//     // Check for three-word phrases
//     if (i < words.length - 2) {
//       const threeWordPhrase = `${word} ${words[i + 1]} ${words[i + 2]}`;
//       if (hindiToEnglishDict[threeWordPhrase]) {
//         translatedWords.push(hindiToEnglishDict[threeWordPhrase]);
//         i += 2; // Skip the next two words
//         continue;
//       }
//     }

//     // Single word translation
//     if (hindiToEnglishDict[word]) {
//       translatedWords.push(hindiToEnglishDict[word]);
//     } else {
//       // Keep the original word if no translation is found
//       translatedWords.push(word);
//     }
//   }

//   // Join translated words back into a string
//   let translatedQuery = translatedWords.join(' ');

//   // Additional cleanup for price patterns
//   // translatedQuery = translatedQuery.replace(
//   //   /(under|above|less than|more than) (rs|₹|rupees|rupaye)/gi,
//   //   '$1'
//   // );

//   translatedQuery = translatedQuery.replace(/\s+/g, ' ').trim();
//   translatedQuery = translatedQuery.replace(
//     /(under|above|less than|more than) (rs|₹|rupees|rupaye)/gi,
//     '$1'
//   );

//   // Log the translation for monitoring and dictionary improvement
//   if (translatedQuery !== queryLower) {
//     logger.info(`Hindi query translated: "${queryLower}" → "${translatedQuery}"`);
//   }

//   return translatedQuery;
// }

// /**
//  * Get stemmed version of a word, using cache for performance
//  * @param {string} word - Word to stem
//  * @returns {string} - Stemmed word
//  */
// function getStemmedWord(word) {
//   if (stemCache.has(word)) {
//     return stemCache.get(word);
//   }
//   const stemmed = stemmer.stem(word);
//   stemCache.set(word, stemmed);
//   return stemmed;
// }

// /**
//  * Extract filters from search query with Hindi language support
//  * @param {string} query - User query that may contain Hindi terms
//  * @param {Array} brands - Available brands
//  * @param {Array} categories - Available categories
//  * @param {Array} colors - Available colors
//  * @returns {Object} - Extracted filters
//  */
// function extractFiltersFromQuery(query, brands, categories, colors) {
//   if (!query)
//     return {
//       brand: null,
//       category: null,
//       color: null,
//       max_price: null,
//       min_price: null,
//       exact_price: null,
//       price_range: null,
//     };

//   // Translate Hindi terms to English before processing
//   const translatedQuery = translateHindiToEnglish(query);

//   const queryLower = translatedQuery.toLowerCase();
//   const tokens = queryLower.split(/\s+/);

//   // Only stem tokens once and cache results
//   const stemmedTokens = tokens.map(token => getStemmedWord(token));

//   // Enhanced price extraction patterns
//   // Max price regex - words like "under", "below", "less than"
//   const maxPriceRegex =
//     /(?:under|below|less than|upto|under rs\.?|under ₹|max(?:imum)?(?:\s+price)?)\s*(\d{1,6})/i;
//   const maxPriceMatch = queryLower.match(maxPriceRegex);
//   const max_price = maxPriceMatch ? parseInt(maxPriceMatch[1], 10) : null;

//   // Min price regex - words like "above", "over", "more than"
//   const minPriceRegex =
//     /(?:above|over|more than|starting from|from|min(?:imum)?(?:\s+price)?)\s*(\d{1,6})/i;
//   const minPriceMatch = queryLower.match(minPriceRegex);
//   const min_price = minPriceMatch ? parseInt(minPriceMatch[1], 10) : null;

//   // Exact price regex - words like "exactly", "price is", "costs"
//   const exactPriceRegex = /(?:exactly|price is|costs|equals|equal to|at)\s*(\d{1,6})/i;
//   const exactPriceMatch = queryLower.match(exactPriceRegex);
//   const exact_price = exactPriceMatch ? parseInt(exactPriceMatch[1], 10) : null;

//   // Price range regex - format like "5000-10000" or "between 5000 and 10000"
//   const priceRangeRegex = /(?:between\s+)?(\d{1,6})(?:\s*-\s*|\s+(?:to|and)\s+)(\d{1,6})/i;
//   const priceRangeMatch = queryLower.match(priceRangeRegex);
//   const price_range = priceRangeMatch
//     ? { min: parseInt(priceRangeMatch[1], 10), max: parseInt(priceRangeMatch[2], 10) }
//     : null;

//   // Use Map objects for O(1) lookups instead of O(n) array searches
//   const brandMap = new Map();
//   const categoryMap = new Map();
//   const colorMap = new Map();

//   // Prepare lookup maps for faster matching
//   brands.forEach(b => brandMap.set(b.toLowerCase(), b));
//   categories.forEach(c => {
//     const cLower = c.toLowerCase();
//     categoryMap.set(cLower, c);
//     categoryMap.set(getStemmedWord(cLower), c); // Store stemmed version too
//   });
//   colors.forEach(c => colorMap.set(c.toLowerCase(), c));

//   // Brand matching - more efficient algorithm
//   let brand = null;
//   for (const token of tokens) {
//     if (brandMap.has(token)) {
//       brand = brandMap.get(token);
//       break;
//     }

//     // Fallback to partial matching only if direct match fails
//     for (const [brandKey, brandValue] of brandMap.entries()) {
//       if (token.includes(brandKey) || brandKey.includes(token)) {
//         brand = brandValue;
//         break;
//       }
//     }

//     if (brand) break;
//   }

//   // Category matching - similar optimization
//   let category = null;
//   for (const token of stemmedTokens) {
//     if (categoryMap.has(token)) {
//       category = categoryMap.get(token);
//       break;
//     }
//   }

//   // If no direct stemmed match, try partial matching
//   if (!category) {
//     for (const token of tokens) {
//       for (const [categoryKey, categoryValue] of categoryMap.entries()) {
//         if (token.includes(categoryKey) || categoryKey.includes(token)) {
//           category = categoryValue;
//           break;
//         }
//       }
//       if (category) break;
//     }
//   }

//   // Color matching
//   let color = null;
//   for (const token of tokens) {
//     if (colorMap.has(token)) {
//       color = colorMap.get(token);
//       break;
//     }

//     // Fallback to partial matching
//     for (const [colorKey, colorValue] of colorMap.entries()) {
//       if (token.includes(colorKey) || colorKey.includes(token)) {
//         color = colorValue;
//         break;
//       }
//     }

//     if (color) break;
//   }

//   // Only log at debug level for performance
//   logger.debug('Filter extraction results', {
//     originalQuery: query,
//     translatedQuery,
//     brand,
//     category,
//     color,
//     max_price,
//     min_price,
//     exact_price,
//     price_range,
//   });

//   return {
//     brand,
//     category,
//     color: color ? [color] : null,
//     max_price,
//     min_price,
//     exact_price,
//     price_range,
//   };
// }

// /**
//  * Detect the language of the query
//  * This is a simple implementation that can be replaced with a more sophisticated
//  * language detection library like franc or cld
//  * @param {string} query - User query
//  * @returns {string} - Detected language code ('hi' for Hindi, 'en' for English, 'unknown' otherwise)
//  */
// function detectLanguage(query) {
//   if (!query) return 'unknown';

//   const queryLower = query.toLowerCase();
//   const words = queryLower.split(/\s+/);

//   // Count how many Hindi words we recognize
//   let hindiWordCount = 0;

//   for (const word of words) {
//     if (hindiToEnglishDict[word]) {
//       hindiWordCount++;
//     }
//   }

//   // If more than 30% of words are recognized Hindi words, consider it Hindi
//   if (hindiWordCount / words.length > 0.3) {
//     return 'hi';
//   }

//   // Default to English for now - can be improved with proper language detection
//   return 'en';
// }

// /**
//  * Helper function to safely get effective price from a product
//  * @param {Object} product - Product object
//  * @returns {number} - Effective price or 0 if not available
//  */
// function getEffectivePrice(product) {
//   // First try effective price (which should be the sale price)
//   if (product.price?.effective) {
//     if (typeof product.price.effective.min === 'number') {
//       return product.price.effective.min;
//     }
//     if (typeof product.price.effective.max === 'number') {
//       return product.price.effective.max;
//     }
//   }

//   // Fall back to selling price if effective price isn't available
//   if (product.price?.selling) {
//     if (typeof product.price.selling.min === 'number') {
//       return product.price.selling.min;
//     }
//     if (typeof product.price.selling.max === 'number') {
//       return product.price.selling.max;
//     }
//   }

//   // Last resort: marked price
//   if (product.price?.marked) {
//     if (typeof product.price.marked.min === 'number') {
//       return product.price.marked.min;
//     }
//     if (typeof product.price.marked.max === 'number') {
//       return product.price.marked.max;
//     }
//   }

//   // If no price information is available
//   return 0;
// }

// /**
//  * Get all applications with optimized pagination
//  */
// exports.getAllApplications = async (req, res, next) => {
//   const requestId = req.requestId || 'unknown';

//   try {
//     const { platformClient } = req;
//     const { company_id } = req.query;

//     logger.info(`Fetching applications for company_id: ${company_id}`, { requestId });

//     if (!company_id) {
//       return res.status(400).json({ message: 'Company ID is required' });
//     }

//     if (!platformClient) {
//       return res.status(401).json({ message: 'Platform client is not available' });
//     }

//     const token = platformClient.config.oauthClient.token;

//     // Increase page size for fewer API calls
//     const PAGE_SIZE = 50; // Increased from 10 to 50

//     // First request to get total count and first batch
//     const apiUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=1&page_size=${PAGE_SIZE}`;
//     const { data: firstPageData } = await axios.get(apiUrl, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     let allApplications =
//       firstPageData?.items?.map(({ _id, name, logo }) => ({
//         _id,
//         name,
//         logo: logo?.secure_url || null,
//       })) || [];

//     const totalItems = firstPageData?.page?.item_total || 0;
//     const totalPages = Math.ceil(totalItems / PAGE_SIZE);

//     // If we need more pages, fetch them in parallel
//     if (totalPages > 1) {
//       const pagePromises = [];

//       for (let page = 2; page <= totalPages; page++) {
//         const pageUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=${page}&page_size=${PAGE_SIZE}`;
//         pagePromises.push(
//           axios
//             .get(pageUrl, { headers: { Authorization: `Bearer ${token}` } })
//             .then(response => response.data?.items || [])
//         );
//       }

//       // Wait for all requests to complete
//       const pagesResults = await Promise.all(pagePromises);

//       // Process results
//       pagesResults.forEach(items => {
//         if (items.length) {
//           const processedItems = items.map(({ _id, name, logo }) => ({
//             _id,
//             name,
//             logo: logo?.secure_url || null,
//           }));
//           allApplications = [...allApplications, ...processedItems];
//         }
//       });
//     }

//     logger.info(`Successfully fetched ${allApplications.length} applications`, {
//       requestId,
//       count: allApplications.length,
//     });

//     return res.json(allApplications);
//   } catch (err) {
//     logger.error('Error fetching applications', {
//       requestId,
//       error: err.message,
//       stack: err.stack,
//     });
//     return res.status(500).json({ message: 'Internal server error', error: err.message });
//   }
// };

// /**
//  * Get products for an application with optimized filtering and Hindi language support
//  */
// exports.getApplicationProducts = async (req, res, next) => {
//   const requestId = req.requestId || 'unknown';

//   try {
//     const { platformClient } = req;
//     const { application_id } = req.params;
//     const { company_id, query } = req.query;

//     // Log the original query for debugging
//     if (query) {
//       const detectedLang = detectLanguage(query);
//       logger.info(`Processing search query: "${query}" (detected language: ${detectedLang})`, {
//         requestId,
//         query,
//         detectedLanguage: detectedLang,
//       });
//     }

//     // Input validation
//     if (!company_id) {
//       return res.status(400).json({ message: 'Company ID is required' });
//     }

//     if (!platformClient) {
//       return res.status(401).json({ message: 'Platform client is not available' });
//     }

//     if (!application_id) {
//       return res.status(400).json({ message: 'Application ID is required' });
//     }

//     const { sort_by, order = 'asc', page = 1, limit = 10 } = req.query;
//     const pageNum = parseInt(page, 10);
//     const limitNum = parseInt(limit, 10);

//     // Fetch products (consider implementing caching here)
//     logger.debug(`Fetching products for application: ${application_id}`, { requestId });

//     // Use a local cache with TTL for frequently requested product lists
//     const data = await platformClient.application(application_id).catalog.getAppProducts();

//     if (!data.items?.length) {
//       return res.json({
//         products: {
//           items: [],
//           total: 0,
//           page: pageNum,
//           limit: limitNum,
//           has_next: false,
//         },
//       });
//     }

//     // Extract possible filter values - do this only once and use Sets for unique values
//     const allBrands = new Set();
//     const allCategories = new Set();
//     const allColors = new Set();

//     // Process all items in a single iteration for efficiency
//     for (const item of data.items) {
//       if (item.brand?.name) {
//         allBrands.add(item.brand.name.toLowerCase());
//       }

//       if (item.category_slug) {
//         allCategories.add(item.category_slug.toLowerCase().replace(/-/g, ' '));
//       }

//       if (item.color) {
//         item.color.split(',').forEach(col => allColors.add(col.trim().toLowerCase()));
//       }
//     }

//     // Extract filters from query with Hindi language support
//     const filters = query
//       ? extractFiltersFromQuery(
//           query,
//           Array.from(allBrands),
//           Array.from(allCategories),
//           Array.from(allColors)
//         )
//       : {
//           brand: null,
//           category: null,
//           color: null,
//           max_price: null,
//           min_price: null,
//           exact_price: null,
//           price_range: null,
//         };

//     // Apply filters efficiently with proper price handling
//     const filteredProducts = data.items.filter(product => {
//       // Skip unnecessary checks when no filters are applied
//       if (!query) return true;

//       const brandName = product.brand?.name?.toLowerCase() || '';
//       const category = product.category_slug?.toLowerCase().replace(/-/g, ' ') || '';

//       // Get effective price once for all price filters
//       const effectivePrice = getEffectivePrice(product);

//       // Apply all price filters (fastest checks first)
//       if (filters.exact_price !== null && effectivePrice !== filters.exact_price) {
//         return false;
//       }

//       if (filters.max_price !== null && effectivePrice > filters.max_price) {
//         return false;
//       }

//       if (filters.min_price !== null && effectivePrice < filters.min_price) {
//         return false;
//       }

//       // Price range check (between X and Y)
//       if (filters.price_range !== null) {
//         if (effectivePrice < filters.price_range.min || effectivePrice > filters.price_range.max) {
//           return false;
//         }
//       }

//       // Brand check
//       if (filters.brand && !brandName.includes(filters.brand.toLowerCase())) {
//         return false;
//       }

//       // Category check
//       if (filters.category && !category.includes(filters.category.toLowerCase())) {
//         return false;
//       }

//       // Color check - most expensive so do it last
//       if (filters.color) {
//         if (!product.color) return false;

//         const productColors = product.color.split(',').map(c => c.trim().toLowerCase());
//         if (!filters.color.some(c => productColors.includes(c.toLowerCase()))) {
//           return false;
//         }
//       }

//       return true;
//     });

//     // Sorting logic - optimize with custom comparators and prioritize effective price
//     if (sort_by) {
//       const sortField = sort_by;
//       const isAsc = order !== 'desc';

//       // Precompute sort values for better performance
//       const getSortValue = product => {
//         switch (sortField) {
//           case 'price':
//             return getEffectivePrice(product);
//           case 'name':
//             return product.name?.toLowerCase() || '';
//           default:
//             return 0;
//         }
//       };

//       // Use efficient numeric comparison
//       filteredProducts.sort((a, b) => {
//         const valueA = getSortValue(a);
//         const valueB = getSortValue(b);

//         if (typeof valueA === 'number' && typeof valueB === 'number') {
//           return isAsc ? valueA - valueB : valueB - valueA;
//         }

//         // String comparison
//         if (valueA < valueB) return isAsc ? -1 : 1;
//         if (valueA > valueB) return isAsc ? 1 : -1;
//         return 0;
//       });
//     }

//     // Pagination - use efficient slicing
//     const startIndex = (pageNum - 1) * limitNum;
//     const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limitNum);

//     logger.info(`Returning ${paginatedProducts.length} products for page ${pageNum}`, {
//       requestId,
//       pageNumber: pageNum,
//       resultsCount: paginatedProducts.length,
//       totalResults: filteredProducts.length,
//       filters: Object.entries(filters)
//         .filter(([_, v]) => v !== null)
//         .map(([k]) => k)
//         .join(', '),
//       originalQuery: query,
//       translatedQuery: query ? translateHindiToEnglish(query) : null,
//     });

//     return res.json({
//       products: {
//         items: paginatedProducts,
//         total: filteredProducts.length,
//         page: pageNum,
//         limit: limitNum,
//         has_next: startIndex + limitNum < filteredProducts.length,
//       },
//     });
//   } catch (err) {
//     logger.error('Error fetching application products', {
//       requestId,
//       application_id: req.params.application_id,
//       error: err.message,
//       stack: err.stack,
//     });
//     next(err);
//   }
// };
