const express = require('express');
const router = express.Router();
const taglinesController = require('../controllers/taglines.controller');

router.post('/generate', taglinesController.generateTaglines);

module.exports = router;