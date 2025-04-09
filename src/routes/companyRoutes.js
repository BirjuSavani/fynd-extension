const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// Get company token
router.get('/all-token', companyController.getAllToken);

module.exports = router;
