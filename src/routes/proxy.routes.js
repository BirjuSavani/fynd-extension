const express = require('express');
const proxyController = require('../controllers/proxy.controller');

const router = express.Router();

router.post('/', proxyController.createProxy);
router.delete('/', proxyController.deleteProxy);

router.get('/applications/:application_id', proxyController.createFilter);

module.exports = router;
