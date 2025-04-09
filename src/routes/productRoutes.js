const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products
router.get('/', productController.getProducts);

// Get products for a specific application
router.get('/application/:application_id', productController.getProductsByApplication);

module.exports = router;
