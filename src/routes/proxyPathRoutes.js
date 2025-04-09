const express = require('express');
const router = express.Router();
const proxyPathController = require('../controllers/proxyPathController');

// Add a new proxy path
router.post('/', proxyPathController.addProxyPath);

// Get all proxy paths for an application
// router.get('/:application_id', proxyPathController.getProxyPaths);

// Delete a proxy path
router.delete('/:application_id', proxyPathController.removeProxyPath);

module.exports = router;
