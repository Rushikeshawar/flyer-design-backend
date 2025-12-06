const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/properties.controller');

// Update properties for an element
router.post('/update', propertiesController.updateProperties);

// Lock/Unlock properties
router.post('/lock', propertiesController.lockProperty);
router.post('/unlock', propertiesController.unlockProperty);

// Get properties for single element
router.get('/:elementId', propertiesController.getProperties);

// Get all properties
router.get('/', propertiesController.getAllProperties);

module.exports = router;