const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

// Get all applications
// This path should be accessible at the root of the applicationRoutes
router.get('/all-applications', applicationController.getAllApplications);

// Get products for an application with filtering
router.get('/:application_id/products', applicationController.getApplicationProducts);

// Original route - keep this for backward compatibility
router.get('/', applicationController.getApplicationProducts);

module.exports = router;
