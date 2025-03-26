const express = require('express');
const proxyController = require('../controllers/proxy.controller');

const router = express.Router();

router.get('/applications/:application_id', proxyController.createFilter);

module.exports = router;
