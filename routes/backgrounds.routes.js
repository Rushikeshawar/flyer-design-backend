const express = require('express');
const router = express.Router();
const backgroundsController = require('../controllers/backgrounds.controller');

router.post('/generate', backgroundsController.generateBackground);

module.exports = router;