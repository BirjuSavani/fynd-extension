const axios = require('axios');
const { logger } = require('../utils/logger');
const natural = require('natural');

// Pre-initialize and cache tokenizer to avoid recreating it with each request
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Cache for stemmed words to avoid repetitive processing
const stemCache = new Map();

/**
 * Hindi to English translation dictionary for common product search terms
 * This can be expanded based on user search patterns
 */
const hindiToEnglishDict = {
  // Colors
  kala: 'black',
  kale: 'black',
  kaali: 'black',
  kaala: 'black',
  laal: 'red',
  laali: 'red',
  neela: 'blue',
  neele: 'blue',
  neeli: 'blue',
  hara: 'green',
  hari: 'green',
  hare: 'green',
  peela: 'yellow',
  peele: 'yellow',
  peeli: 'yellow',
  safed: 'white',
  ujala: 'white',
  ujla: 'white',
  bhoora: 'brown',
  bhoore: 'brown',
  bhoori: 'brown',
  gulabi: 'pink',
  gulaabi: 'pink',
  baingani: 'purple',
  jamuni: 'purple',
  aasmani: 'skyblue',
  naarangi: 'orange',
  santri: 'orange',
  bhoora: 'brown',
  bhura: 'brown',
  bhuri: 'brown',
  dhundhla: 'grey',
  dhundhli: 'grey',
  saleti: 'grey',
  mehandi: 'darkgreen',
  mehendi: 'darkgreen',
  gehra: 'dark',
  gehraa: 'dark',
  halka: 'light',
  halki: 'light',
  chamkila: 'bright',
  chamkili: 'bright',
  silver: 'silver',
  chandi: 'silver',
  golden: 'golden',
  sona: 'golden',
  sunehri: 'golden',
  sone: 'golden',
  sonheri: 'golden',

  // Product categories
  jute: 'shoes',
  joote: 'shoes',
  joota: 'shoes',
  chappal: 'sandals',
  chappals: 'sandals',
  chappalein: 'sandals',
  sandal: 'sandals',
  sleeper: 'slippers',
  slipper: 'slippers',
  shirt: 'shirt',
  shirts: 'shirts',
  kamiz: 'shirt',
  kameez: 'shirt',
  kurta: 'kurta',
  kurti: 'kurti',
  pant: 'pants',
  pants: 'pants',
  jeans: 'jeans',
  patloon: 'pants',
  pajama: 'pajamas',
  pajamas: 'pajamas',
  topi: 'hat',
  cap: 'cap',
  moza: 'socks',
  moze: 'socks',
  jurab: 'socks',
  bag: 'bag',
  basta: 'bag',
  thaila: 'bag',
  ghadi: 'watch',
  wristwatch: 'watch',
  chashma: 'glasses',
  ainak: 'glasses',
  dress: 'dress',
  poshak: 'dress',
  gown: 'gown',
  saree: 'saree',
  sari: 'saree',
  lehnga: 'lehenga',
  lehenga: 'lehenga',
  scarf: 'scarf',
  dupatta: 'scarf',
  chunni: 'scarf',
  chunari: 'scarf',
  shawl: 'shawl',
  chaddar: 'shawl',
  jacket: 'jacket',
  jaiket: 'jacket',
  coat: 'coat',
  kurtaset: 'kurta set',
  'kurta set': 'kurta set',
  punjabi: 'punjabi dress',
  sweater: 'sweater',
  sweter: 'sweater',
  hoodie: 'hoodie',
  hudi: 'hoodie',
  tshirt: 't-shirt',
  teeshirt: 't-shirt',
  tee: 't-shirt',
  underwear: 'underwear',
  undergarment: 'underwear',
  andar: 'underwear',
  bra: 'bra',
  panty: 'panty',
  belt: 'belt',
  peti: 'belt',
  tie: 'tie',
  muffler: 'muffler',
  wallet: 'wallet',
  batua: 'wallet',
  purse: 'purse',
  handbag: 'handbag',
  necklace: 'necklace',
  haar: 'necklace',
  mala: 'necklace',
  ring: 'ring',
  angoothi: 'ring',
  bracelet: 'bracelet',
  kangan: 'bracelet',
  chudi: 'bangle',
  bangles: 'bangles',
  earring: 'earring',
  baali: 'earring',
  jhumka: 'earring',
  makeup: 'makeup',
  cosmetics: 'cosmetics',
  shringar: 'cosmetics',
  perfume: 'perfume',
  itr: 'perfume',
  khushboo: 'perfume',
  lipstick: 'lipstick',
  'nail polish': 'nail polish',
  mascara: 'mascara',
  foundation: 'foundation',
  kajal: 'eyeliner',
  eyeliner: 'eyeliner',
  powder: 'powder',
  creme: 'cream',
  cream: 'cream',
  moisturizer: 'moisturizer',
  lotion: 'lotion',
  blanket: 'blanket',
  kambal: 'blanket',
  razai: 'quilt',
  quilt: 'quilt',
  bedsheet: 'bedsheet',
  chadar: 'bedsheet',
  pillow: 'pillow',
  takiya: 'pillow',
  towel: 'towel',
  toliya: 'towel',

  // Footwear specific
  sports: 'sports',
  khel: 'sports',
  casual: 'casual',
  formal: 'formal',
  boot: 'boot',
  boots: 'boots',
  heel: 'heels',
  heels: 'heels',
  stiletto: 'stiletto',
  unchi: 'high',
  high: 'high',
  flat: 'flat',
  flats: 'flats',
  loafer: 'loafer',
  loafers: 'loafers',
  moccasin: 'moccasin',
  sneaker: 'sneaker',
  sneakers: 'sneakers',
  running: 'running',

  // Materials
  chamda: 'leather',
  leather: 'leather',
  kapda: 'fabric',
  fabric: 'fabric',
  suti: 'cotton',
  cotton: 'cotton',
  resham: 'silk',
  silk: 'silk',
  wool: 'wool',
  un: 'wool',
  nylon: 'nylon',
  polyester: 'polyester',
  velvet: 'velvet',
  rayon: 'rayon',
  plastic: 'plastic',
  rubber: 'rubber',
  metal: 'metal',
  dhatu: 'metal',
  suede: 'suede',
  synthetic: 'synthetic',
  krtrima: 'synthetic',
  denim: 'denim',
  khadi: 'khadi',
  linen: 'linen',
  canvas: 'canvas',
  pat: 'jute material',
  'jute material': 'jute material',

  // Brands (can add common Hindi pronunciations of brands)
  nike: 'nike',
  adidas: 'adidas',
  puma: 'puma',
  reebok: 'reebok',
  woodland: 'woodland',
  bata: 'bata',
  liberty: 'liberty',
  sparx: 'sparx',
  campus: 'campus',
  relaxo: 'relaxo',
  paragon: 'paragon',
  redtape: 'redtape',
  'red tape': 'redtape',
  mochi: 'mochi',
  levis: 'levis',
  "levi's": 'levis',
  wrangler: 'wrangler',
  'peter england': 'peter england',
  'louis philippe': 'louis philippe',
  'van heusen': 'van heusen',
  'allen solly': 'allen solly',
  raymond: 'raymond',
  zara: 'zara',
  'h&m': 'h&m',
  'forever 21': 'forever 21',
  manyavar: 'manyavar',
  fabindia: 'fabindia',
  biba: 'biba',
  w: 'w',
  aurelia: 'aurelia',
  fastrack: 'fastrack',
  titan: 'titan',
  casio: 'casio',
  fossil: 'fossil',
  timex: 'timex',
  'tommy hilfiger': 'tommy hilfiger',
  'us polo': 'us polo',
  'calvin klein': 'calvin klein',
  gucci: 'gucci',
  prada: 'prada',
  lakme: 'lakme',
  maybelline: 'maybelline',
  loreal: 'loreal',
  mac: 'mac',
  nykaa: 'nykaa',
  sugar: 'sugar',
  colorbar: 'colorbar',
  revlon: 'revlon',

  // Price-related terms
  sasta: 'cheap',
  saasta: 'cheap',
  sastaa: 'cheap',
  sasti: 'cheap',
  sastee: 'cheap',
  kaam: 'less',
  mehenga: 'expensive',
  mehengi: 'expensive',
  mahanga: 'expensive',
  mahangi: 'expensive',
  costli: 'expensive',
  premium: 'premium',
  luxury: 'luxury',
  shaandaar: 'luxury',
  shahi: 'luxury',
  kam: 'less',
  zyada: 'more',
  jyada: 'more',
  adhik: 'more',
  'se kam': 'less than',
  'se zyada': 'more than',
  'se jyada': 'more than',
  'se adhik': 'more than',
  'ke beech': 'between',
  'ke madhya': 'between',
  'ke bich': 'between',
  tak: 'upto',
  talak: 'upto',
  rupaye: 'price',
  rupye: 'price',
  rupees: 'price',
  rs: 'price',
  'rs.': 'price',
  rupaiya: 'price',
  daam: 'price',
  keemat: 'price',
  kimat: 'price',
  mol: 'price',
  lagbhag: 'about',
  karib: 'about',
  almost: 'about',
  discount: 'discount',
  chhoot: 'discount',
  sale: 'sale',
  offer: 'offer',

  // Qualifiers
  accha: 'good',
  achha: 'good',
  acche: 'good',
  achche: 'good',
  badhiya: 'best',
  badiya: 'best',
  uttam: 'best',
  sarvottam: 'best',
  behtareen: 'best',
  sabse: 'most',
  'sabse badhiya': 'best',
  naya: 'new',
  naye: 'new',
  nayi: 'new',
  latest: 'latest',
  purana: 'old',
  purane: 'old',
  purani: 'old',
  'second hand': 'second hand',
  used: 'used',
  bada: 'large',
  bade: 'large',
  badi: 'large',
  bara: 'large',
  vishaal: 'large',
  chota: 'small',
  chhota: 'small',
  chhote: 'small',
  chhoti: 'small',
  medium: 'medium',
  madhyam: 'medium',
  trending: 'trending',
  popular: 'popular',
  lokpriya: 'popular',
  mashhoor: 'popular',
  prasidh: 'popular',
  comfortable: 'comfortable',
  aaraamdaayak: 'comfortable',
  aaram: 'comfort',
  soft: 'soft',
  mulayam: 'soft',
  hard: 'hard',
  sakht: 'hard',
  kadha: 'hard',
  kadak: 'hard',
  stylish: 'stylish',
  style: 'style',
  fashion: 'fashion',
  trendy: 'trendy',
  designer: 'designer',
  fancy: 'fancy',
  traditional: 'traditional',
  paramparik: 'traditional',
  desi: 'traditional',
  western: 'western',
  heavy: 'heavy',
  bhaari: 'heavy',
  light: 'light',
  halka: 'light',
  waterproof: 'waterproof',
  paanirokh: 'waterproof',
  'water resistant': 'water resistant',
  washable: 'washable',
  'dhulne yogya': 'washable',

  // Size related
  size: 'size',
  saiz: 'size',
  naap: 'size',
  small: 'small',
  medium: 'medium',
  large: 'large',
  xl: 'xl',
  xxl: 'xxl',
  'extra large': 'xl',
  'double xl': 'xxl',
  'triple xl': 'xxxl',
  xxxl: 'xxxl',
  uk: 'uk size',
  us: 'us size',
  eu: 'eu size',
  'free size': 'free size',
  fit: 'fit',
  'slim fit': 'slim fit',
  patla: 'slim fit',
  'regular fit': 'regular fit',
  'loose fit': 'loose fit',
  dhila: 'loose fit',

  // Product attributes
  pattern: 'pattern',
  design: 'design',
  dizain: 'design',
  naksha: 'design',
  print: 'print',
  printed: 'printed',
  chhapa: 'printed',
  plain: 'plain',
  saada: 'plain',
  shiny: 'shiny',
  chamakdar: 'shiny',
  glossy: 'glossy',
  matte: 'matte',
  quality: 'quality',
  gunvatta: 'quality',
  durability: 'durability',
  tikaupan: 'durability',
  lasting: 'durable',
  tikau: 'durable',
  warranty: 'warranty',
  guarantee: 'guarantee',
  guaranty: 'guarantee',
  original: 'original',
  asli: 'original',
  duplicate: 'duplicate',
  fake: 'fake',
  nakli: 'fake',
  copy: 'copy',
  'first copy': 'first copy',

  // Seasonal
  summer: 'summer',
  garmi: 'summer',
  winter: 'winter',
  sardi: 'winter',
  thand: 'winter',
  rainy: 'rainy',
  barish: 'rainy',
  barsaat: 'rainy',
  monsoon: 'monsoon',
  mausam: 'season',
  season: 'season',

  // Gender specific
  men: 'men',
  mens: 'men',
  gents: 'men',
  purush: 'men',
  aadmi: 'men',
  mard: 'men',
  women: 'women',
  womens: 'women',
  ladies: 'women',
  mahila: 'women',
  aurat: 'women',
  stree: 'women',
  girl: 'girl',
  girls: 'girls',
  ladki: 'girl',
  ladkiyan: 'girls',
  boy: 'boy',
  boys: 'boys',
  ladka: 'boy',
  ladke: 'boys',
  kids: 'kids',
  children: 'children',
  bachche: 'children',
  bachchon: 'children',
  unisex: 'unisex',

  // Occasions
  party: 'party',
  parties: 'party',
  partywear: 'partywear',
  office: 'office',
  officewear: 'officewear',
  formal: 'formal',
  casual: 'casual',
  daily: 'daily',
  'daily wear': 'daily wear',
  roj: 'daily',
  wedding: 'wedding',
  shaadi: 'wedding',
  vivah: 'wedding',
  function: 'function',
  festival: 'festival',
  tyohar: 'festival',
  diwali: 'diwali',
  holi: 'holi',
  navratri: 'navratri',
  'durga puja': 'durga puja',
  garba: 'garba',
  dandiya: 'dandiya',
  christmas: 'christmas',
  halloween: 'halloween',
  sports: 'sports',
  gym: 'gym',
  workout: 'workout',
  exercise: 'exercise',
  vyayam: 'exercise',
  kasrat: 'exercise',
  yoga: 'yoga',
  beach: 'beach',
  swimming: 'swimming',
  tairaki: 'swimming',
  travel: 'travel',
  yatra: 'travel',
  safari: 'safari',
  ghoomna: 'travel',
  school: 'school',
  college: 'college',
  campus: 'campus',
  vidyalaya: 'school',
  mahavidyalaya: 'college',

  // Actions & Sorting
  dikhao: 'show',
  dikhaiye: 'show',
  show: 'show',
  display: 'display',
  sort: 'sort',
  filter: 'filter',
  'new arrival': 'new arrival',
  'naya stock': 'new arrival',
  latest: 'latest',
  popular: 'popular',
  bestseller: 'bestseller',
  bestselling: 'bestselling',
  'sabse jyada bikne wala': 'bestselling',
  'sabse zyada bikne wala': 'bestselling',
  rating: 'rating',
  star: 'star',
  review: 'review',
  samiksha: 'review',
  'free delivery': 'free delivery',
  'free shipping': 'free shipping',
  'muft delivery': 'free delivery',
};

/**
 * Identify and translate Hindi phrases to English
 * @param {string} query - Original user query that may contain Hindi
 * @returns {string} - Translated query with Hindi terms replaced with English equivalents
 */
function translateHindiToEnglish(query) {
  if (!query) return query;

  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  const translatedWords = [];

  // Try to translate individual words
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check for compound phrases (two words)
    if (i < words.length - 1) {
      const twoWordPhrase = `${word} ${words[i + 1]}`;
      if (hindiToEnglishDict[twoWordPhrase]) {
        translatedWords.push(hindiToEnglishDict[twoWordPhrase]);
        i++; // Skip the next word as we've already processed it
        continue;
      }
    }

    // Check for three-word phrases
    if (i < words.length - 2) {
      const threeWordPhrase = `${word} ${words[i + 1]} ${words[i + 2]}`;
      if (hindiToEnglishDict[threeWordPhrase]) {
        translatedWords.push(hindiToEnglishDict[threeWordPhrase]);
        i += 2; // Skip the next two words
        continue;
      }
    }

    // Single word translation
    if (hindiToEnglishDict[word]) {
      translatedWords.push(hindiToEnglishDict[word]);
    } else {
      // Keep the original word if no translation is found
      translatedWords.push(word);
    }
  }

  // Join translated words back into a string
  const translatedQuery = translatedWords.join(' ');

  // Log the translation for monitoring and dictionary improvement
  if (translatedQuery !== queryLower) {
    logger.info(`Hindi query translated: "${queryLower}" → "${translatedQuery}"`);
  }

  return translatedQuery;
}

/**
 * Get stemmed version of a word, using cache for performance
 * @param {string} word - Word to stem
 * @returns {string} - Stemmed word
 */
function getStemmedWord(word) {
  if (stemCache.has(word)) {
    return stemCache.get(word);
  }
  const stemmed = stemmer.stem(word);
  stemCache.set(word, stemmed);
  return stemmed;
}

/**
 * Extract filters from search query with Hindi language support
 * @param {string} query - User query that may contain Hindi terms
 * @param {Array} brands - Available brands
 * @param {Array} categories - Available categories
 * @param {Array} colors - Available colors
 * @returns {Object} - Extracted filters
 */
function extractFiltersFromQuery(query, brands, categories, colors) {
  if (!query)
    return {
      brand: null,
      category: null,
      color: null,
      max_price: null,
      min_price: null,
      exact_price: null,
      price_range: null,
    };

  // Translate Hindi terms to English before processing
  const translatedQuery = translateHindiToEnglish(query);

  const queryLower = translatedQuery.toLowerCase();
  const tokens = queryLower.split(/\s+/);

  // Only stem tokens once and cache results
  const stemmedTokens = tokens.map(token => getStemmedWord(token));

  // Enhanced price extraction patterns
  // Max price regex - words like "under", "below", "less than"
  const maxPriceRegex =
    /(?:under|below|less than|upto|under rs\.?|under ₹|max(?:imum)?(?:\s+price)?)\s*(\d{1,6})/i;
  const maxPriceMatch = queryLower.match(maxPriceRegex);
  const max_price = maxPriceMatch ? parseInt(maxPriceMatch[1], 10) : null;

  // Min price regex - words like "above", "over", "more than"
  const minPriceRegex =
    /(?:above|over|more than|starting from|from|min(?:imum)?(?:\s+price)?)\s*(\d{1,6})/i;
  const minPriceMatch = queryLower.match(minPriceRegex);
  const min_price = minPriceMatch ? parseInt(minPriceMatch[1], 10) : null;

  // Exact price regex - words like "exactly", "price is", "costs"
  const exactPriceRegex = /(?:exactly|price is|costs|equals|equal to|at)\s*(\d{1,6})/i;
  const exactPriceMatch = queryLower.match(exactPriceRegex);
  const exact_price = exactPriceMatch ? parseInt(exactPriceMatch[1], 10) : null;

  // Price range regex - format like "5000-10000" or "between 5000 and 10000"
  const priceRangeRegex = /(?:between\s+)?(\d{1,6})(?:\s*-\s*|\s+(?:to|and)\s+)(\d{1,6})/i;
  const priceRangeMatch = queryLower.match(priceRangeRegex);
  const price_range = priceRangeMatch
    ? { min: parseInt(priceRangeMatch[1], 10), max: parseInt(priceRangeMatch[2], 10) }
    : null;

  // Use Map objects for O(1) lookups instead of O(n) array searches
  const brandMap = new Map();
  const categoryMap = new Map();
  const colorMap = new Map();

  // Prepare lookup maps for faster matching
  brands.forEach(b => brandMap.set(b.toLowerCase(), b));
  categories.forEach(c => {
    const cLower = c.toLowerCase();
    categoryMap.set(cLower, c);
    categoryMap.set(getStemmedWord(cLower), c); // Store stemmed version too
  });
  colors.forEach(c => colorMap.set(c.toLowerCase(), c));

  // Brand matching - more efficient algorithm
  let brand = null;
  for (const token of tokens) {
    if (brandMap.has(token)) {
      brand = brandMap.get(token);
      break;
    }

    // Fallback to partial matching only if direct match fails
    for (const [brandKey, brandValue] of brandMap.entries()) {
      if (token.includes(brandKey) || brandKey.includes(token)) {
        brand = brandValue;
        break;
      }
    }

    if (brand) break;
  }

  // Category matching - similar optimization
  let category = null;
  for (const token of stemmedTokens) {
    if (categoryMap.has(token)) {
      category = categoryMap.get(token);
      break;
    }
  }

  // If no direct stemmed match, try partial matching
  if (!category) {
    for (const token of tokens) {
      for (const [categoryKey, categoryValue] of categoryMap.entries()) {
        if (token.includes(categoryKey) || categoryKey.includes(token)) {
          category = categoryValue;
          break;
        }
      }
      if (category) break;
    }
  }

  // Color matching
  let color = null;
  for (const token of tokens) {
    if (colorMap.has(token)) {
      color = colorMap.get(token);
      break;
    }

    // Fallback to partial matching
    for (const [colorKey, colorValue] of colorMap.entries()) {
      if (token.includes(colorKey) || colorKey.includes(token)) {
        color = colorValue;
        break;
      }
    }

    if (color) break;
  }

  // Only log at debug level for performance
  logger.debug('Filter extraction results', {
    originalQuery: query,
    translatedQuery,
    brand,
    category,
    color,
    max_price,
    min_price,
    exact_price,
    price_range,
  });

  return {
    brand,
    category,
    color: color ? [color] : null,
    max_price,
    min_price,
    exact_price,
    price_range,
  };
}

/**
 * Detect the language of the query
 * This is a simple implementation that can be replaced with a more sophisticated
 * language detection library like franc or cld
 * @param {string} query - User query
 * @returns {string} - Detected language code ('hi' for Hindi, 'en' for English, 'unknown' otherwise)
 */
function detectLanguage(query) {
  if (!query) return 'unknown';

  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);

  // Count how many Hindi words we recognize
  let hindiWordCount = 0;

  for (const word of words) {
    if (hindiToEnglishDict[word]) {
      hindiWordCount++;
    }
  }

  // If more than 30% of words are recognized Hindi words, consider it Hindi
  if (hindiWordCount / words.length > 0.3) {
    return 'hi';
  }

  // Default to English for now - can be improved with proper language detection
  return 'en';
}

/**
 * Helper function to safely get effective price from a product
 * @param {Object} product - Product object
 * @returns {number} - Effective price or 0 if not available
 */
function getEffectivePrice(product) {
  // First try effective price (which should be the sale price)
  if (product.price?.effective) {
    if (typeof product.price.effective.min === 'number') {
      return product.price.effective.min;
    }
    if (typeof product.price.effective.max === 'number') {
      return product.price.effective.max;
    }
  }

  // Fall back to selling price if effective price isn't available
  if (product.price?.selling) {
    if (typeof product.price.selling.min === 'number') {
      return product.price.selling.min;
    }
    if (typeof product.price.selling.max === 'number') {
      return product.price.selling.max;
    }
  }

  // Last resort: marked price
  if (product.price?.marked) {
    if (typeof product.price.marked.min === 'number') {
      return product.price.marked.min;
    }
    if (typeof product.price.marked.max === 'number') {
      return product.price.marked.max;
    }
  }

  // If no price information is available
  return 0;
}

/**
 * Get all applications with optimized pagination
 */
exports.getAllApplications = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;
    const { company_id } = req.query;

    logger.info(`Fetching applications for company_id: ${company_id}`, { requestId });

    if (!company_id) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!platformClient) {
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    const token = platformClient.config.oauthClient.token;

    // Increase page size for fewer API calls
    const PAGE_SIZE = 50; // Increased from 10 to 50

    // First request to get total count and first batch
    const apiUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=1&page_size=${PAGE_SIZE}`;
    const { data: firstPageData } = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let allApplications =
      firstPageData?.items?.map(({ _id, name, logo }) => ({
        _id,
        name,
        logo: logo?.secure_url || null,
      })) || [];

    const totalItems = firstPageData?.page?.item_total || 0;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    // If we need more pages, fetch them in parallel
    if (totalPages > 1) {
      const pagePromises = [];

      for (let page = 2; page <= totalPages; page++) {
        const pageUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=${page}&page_size=${PAGE_SIZE}`;
        pagePromises.push(
          axios
            .get(pageUrl, { headers: { Authorization: `Bearer ${token}` } })
            .then(response => response.data?.items || [])
        );
      }

      // Wait for all requests to complete
      const pagesResults = await Promise.all(pagePromises);

      // Process results
      pagesResults.forEach(items => {
        if (items.length) {
          const processedItems = items.map(({ _id, name, logo }) => ({
            _id,
            name,
            logo: logo?.secure_url || null,
          }));
          allApplications = [...allApplications, ...processedItems];
        }
      });
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

/**
 * Get products for an application with optimized filtering and Hindi language support
 */
exports.getApplicationProducts = async (req, res, next) => {
  const requestId = req.requestId || 'unknown';

  try {
    const { platformClient } = req;
    const { application_id } = req.params;
    const { company_id, query } = req.query;

    // Log the original query for debugging
    if (query) {
      const detectedLang = detectLanguage(query);
      logger.info(`Processing search query: "${query}" (detected language: ${detectedLang})`, {
        requestId,
        query,
        detectedLanguage: detectedLang,
      });
    }

    // Input validation
    if (!company_id) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!platformClient) {
      return res.status(401).json({ message: 'Platform client is not available' });
    }

    if (!application_id) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    const { sort_by, order = 'asc', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Fetch products (consider implementing caching here)
    logger.debug(`Fetching products for application: ${application_id}`, { requestId });

    // Use a local cache with TTL for frequently requested product lists
    const data = await platformClient.application(application_id).catalog.getAppProducts();

    if (!data.items?.length) {
      return res.json({
        products: {
          items: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          has_next: false,
        },
      });
    }

    // Extract possible filter values - do this only once and use Sets for unique values
    const allBrands = new Set();
    const allCategories = new Set();
    const allColors = new Set();

    // Process all items in a single iteration for efficiency
    for (const item of data.items) {
      if (item.brand?.name) {
        allBrands.add(item.brand.name.toLowerCase());
      }

      if (item.category_slug) {
        allCategories.add(item.category_slug.toLowerCase().replace(/-/g, ' '));
      }

      if (item.color) {
        item.color.split(',').forEach(col => allColors.add(col.trim().toLowerCase()));
      }
    }

    // Extract filters from query with Hindi language support
    const filters = query
      ? extractFiltersFromQuery(
          query,
          Array.from(allBrands),
          Array.from(allCategories),
          Array.from(allColors)
        )
      : {
          brand: null,
          category: null,
          color: null,
          max_price: null,
          min_price: null,
          exact_price: null,
          price_range: null,
        };

    // Apply filters efficiently with proper price handling
    const filteredProducts = data.items.filter(product => {
      // Skip unnecessary checks when no filters are applied
      if (!query) return true;

      const brandName = product.brand?.name?.toLowerCase() || '';
      const category = product.category_slug?.toLowerCase().replace(/-/g, ' ') || '';

      // Get effective price once for all price filters
      const effectivePrice = getEffectivePrice(product);

      // Apply all price filters (fastest checks first)
      if (filters.exact_price !== null && effectivePrice !== filters.exact_price) {
        return false;
      }

      if (filters.max_price !== null && effectivePrice > filters.max_price) {
        return false;
      }

      if (filters.min_price !== null && effectivePrice < filters.min_price) {
        return false;
      }

      // Price range check (between X and Y)
      if (filters.price_range !== null) {
        if (effectivePrice < filters.price_range.min || effectivePrice > filters.price_range.max) {
          return false;
        }
      }

      // Brand check
      if (filters.brand && !brandName.includes(filters.brand.toLowerCase())) {
        return false;
      }

      // Category check
      if (filters.category && !category.includes(filters.category.toLowerCase())) {
        return false;
      }

      // Color check - most expensive so do it last
      if (filters.color) {
        if (!product.color) return false;

        const productColors = product.color.split(',').map(c => c.trim().toLowerCase());
        if (!filters.color.some(c => productColors.includes(c.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });

    // Sorting logic - optimize with custom comparators and prioritize effective price
    if (sort_by) {
      const sortField = sort_by;
      const isAsc = order !== 'desc';

      // Precompute sort values for better performance
      const getSortValue = product => {
        switch (sortField) {
          case 'price':
            return getEffectivePrice(product);
          case 'name':
            return product.name?.toLowerCase() || '';
          default:
            return 0;
        }
      };

      // Use efficient numeric comparison
      filteredProducts.sort((a, b) => {
        const valueA = getSortValue(a);
        const valueB = getSortValue(b);

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return isAsc ? valueA - valueB : valueB - valueA;
        }

        // String comparison
        if (valueA < valueB) return isAsc ? -1 : 1;
        if (valueA > valueB) return isAsc ? 1 : -1;
        return 0;
      });
    }

    // Pagination - use efficient slicing
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limitNum);

    logger.info(`Returning ${paginatedProducts.length} products for page ${pageNum}`, {
      requestId,
      pageNumber: pageNum,
      resultsCount: paginatedProducts.length,
      totalResults: filteredProducts.length,
      filters: Object.entries(filters)
        .filter(([_, v]) => v !== null)
        .map(([k]) => k)
        .join(', '),
      originalQuery: query,
      translatedQuery: query ? translateHindiToEnglish(query) : null,
    });

    return res.json({
      products: {
        items: paginatedProducts,
        total: filteredProducts.length,
        page: pageNum,
        limit: limitNum,
        has_next: startIndex + limitNum < filteredProducts.length,
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

// const axios = require('axios');
// const { logger } = require('../utils/logger');

// // Helper function to extract filters from query
// function extractFiltersFromQuery(query, brands, categories, colors) {
//   if (!query) return {};

//   const lowerQuery = query.toLowerCase();
//   const filters = {};

//   // Extract exact match for brand
//   filters.brand = Array.from(brands).find((b) => lowerQuery.includes(b)) || null;

//   // Extract exact match for category
//   filters.category = Array.from(categories).find((c) => lowerQuery.includes(c)) || null;

//   // Extract exact match for color
//   filters.color = Array.from(colors).filter((col) => lowerQuery.includes(col));
//   if (filters.color.length === 0) {
//     filters.color = null;
//   } else if (filters.color.length > 1) {
//     const colorCombo = filters.color.join(', ');
//     if (colors.has(colorCombo)) {
//       filters.color = colorCombo; // Match exact color combination
//     }
//   }

//   // Extract keyword-based search
//   filters.keyword = lowerQuery.includes('name') ? lowerQuery.replace('name', '').trim() : null;

//   // Extract price conditions using regex
//   const priceMatch = lowerQuery.match(/\b(?:under|above|for|is) (\d+)\b/);
//   const rangeMatch = lowerQuery.match(/\bbetween (\d+) to (\d+)\b/);

//   if (priceMatch) {
//     const [_, price] = priceMatch;
//     if (lowerQuery.includes('under')) filters.max_price = parseFloat(price);
//     if (lowerQuery.includes('above')) filters.min_price = parseFloat(price);
//     if (lowerQuery.includes('for') || lowerQuery.includes('is')) filters.exact_price = parseFloat(price);
//   }

//   if (rangeMatch) {
//     const [_, minPrice, maxPrice] = rangeMatch;
//     filters.min_price = parseFloat(minPrice);
//     filters.max_price = parseFloat(maxPrice);
//   }

//   return filters;
// }

// // Get all applications
// exports.getAllApplications = async (req, res, next) => {
//   const requestId = req.requestId || 'unknown';

//   try {
//     const { platformClient } = req;
//     const { company_id } = req.query;

//     logger.info(`Fetching all applications for company_id: ${company_id}`, { requestId, company_id });

//     if (!company_id) {
//       logger.warn('Missing company_id in request', { requestId });
//       return res.status(400).json({ message: 'Company ID is required' });
//     }

//     if (!platformClient) {
//       logger.error('Platform client not available', { requestId });
//       return res.status(401).json({ message: 'Platform client is not available' });
//     }

//     const token = platformClient.config.oauthClient.token;
//     let allApplications = [];
//     let page = 1;
//     let hasMore = true;

//     while (hasMore) {
//       const apiUrl = `${platformClient.config.domain}/service/platform/configuration/v1.0/company/${company_id}/application?page_no=${page}&page_size=10`;
//       logger.debug(`Requesting applications page ${page}`, { requestId, url: apiUrl });
//       const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
//       if (data?.items?.length > 0) {
//         allApplications = [
//           ...allApplications,
//           ...data.items.map(({ _id, name, logo }) => ({ _id, name, logo: logo?.secure_url || null })),
//         ];
//         page++;
//         logger.debug(`Received ${data.items.length} applications, total so far: ${allApplications.length}`, {
//           requestId,
//         });
//       } else {
//         hasMore = false;
//       }
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

// // Get products for an application with filtering
// exports.getApplicationProducts = async (req, res, next) => {
//   console.log('req.query', req.query)
//   const requestId = req.requestId || 'unknown';

//   try {
//     logger.info('Fetching products for application', { requestId });

//     const { platformClient } = req;
//     const { application_id } = req.params;
//     const { company_id, query } = req.query;

//     if (!company_id) {
//       logger.warn('Missing company_id in request', { requestId });
//       return res.status(400).json({ message: 'Company ID is required' });
//     }

//     if (!platformClient) {
//       logger.error('Platform client not available', { requestId });
//       return res.status(401).json({ message: 'Platform client is not available' });
//     }

//     if (!application_id) {
//       logger.warn('Missing application_id in request', { requestId });
//       return res.status(400).json({ message: 'Application ID is required' });
//     }

//     const { sort_by, order = 'asc', page = 1, limit = 10 } = req.query;

//     // Fetch products
//     logger.debug(`Fetching products from API for application: ${application_id}`, { requestId });
//     const data = await platformClient.application(application_id).catalog.getAppProducts();
//     if (!data.items?.length) {
//       logger.info('No products found for application', { requestId, application_id });
//       return res.json({ items: [] });
//     }

//     logger.info(`Found ${data.items.length} products for application`, {
//       requestId,
//       application_id,
//       productCount: data.items.length,
//     });

//     // Extract possible filter values
//     const allBrands = new Set(),
//       allCategories = new Set(),
//       allColors = new Set();

//     data.items.forEach(({ brand, category_slug, color }) => {
//       if (brand?.name) allBrands.add(brand.name.toLowerCase());
//       if (category_slug) allCategories.add(category_slug.toLowerCase().replace(/-/g, ' '));
//       if (color) {
//         color.split(',').forEach((col) => allColors.add(col.trim().toLowerCase()));
//       }
//     });

//     // console.log(allColors);
//     // Extract filters from query
//     const filters = extractFiltersFromQuery(query, allBrands, allCategories, allColors);
//     logger.debug('Extracted filters from query', { requestId, filters, query });

//     // Apply filters
//     let filteredProducts = data.items.filter(({ brand, category_slug, color, price, name }) => {
//       const productBrand = brand?.name?.toLowerCase() || '';
//       const productCategory = category_slug?.toLowerCase().replace(/-/g, ' ') || '';
//       const productColors = color ? color.split(',').map((col) => col.trim().toLowerCase()) : [];
//       const effectivePrice = price?.effective?.min || price?.effective?.max || 0;
//       const productName = name?.toLowerCase() || '';

//       return (
//         (!filters.brand || productBrand.includes(filters.brand)) && // Allow partial brand match
//         (!filters.category || productCategory.includes(filters.category)) &&
//         (!filters.color || filters.color.some((col) => productColors.includes(col))) &&
//         (!filters.max_price || effectivePrice <= filters.max_price) &&
//         (!filters.min_price || effectivePrice >= filters.min_price) &&
//         (!filters.exact_price || effectivePrice === filters.exact_price) &&
//         (!filters.keyword || productName.includes(filters.keyword))
//       );
//     });

//     logger.info(`Filtered to ${filteredProducts.length} products based on query`, {
//       requestId,
//       totalProducts: data.items.length,
//       filteredCount: filteredProducts.length,
//     });

//     // Sorting logic
//     if (sort_by) {
//       filteredProducts.sort((a, b) => {
//         let valueA, valueB;
//         switch (sort_by) {
//           case 'price':
//             valueA = a.price?.effective?.min || a.price?.effective?.max || 0;
//             valueB = b.price?.effective?.min || b.price?.effective?.max || 0;
//             break;
//           case 'name':
//             valueA = a.name.toLowerCase();
//             valueB = b.name.toLowerCase();
//             break;
//           default:
//             return 0;
//         }
//         return order === 'desc' ? valueB - valueA : valueA - valueB;
//       });
//     }

//     // Pagination
//     const startIndex = (page - 1) * limit;
//     const paginatedProducts = filteredProducts.slice(startIndex, startIndex + parseInt(limit));

//     logger.info(`Returning ${paginatedProducts.length} products for page ${page}`, {
//       requestId,
//       pageNumber: page,
//       pageLimit: limit,
//       resultsCount: paginatedProducts.length,
//     });

//     return res.json({
//       products: {
//         items: paginatedProducts,
//         total: filteredProducts.length,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         has_next: startIndex + limit < filteredProducts.length,
//       },
//     });``
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