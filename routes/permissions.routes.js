const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissions.controller');

// Initialize permissions for elements
router.post('/set', permissionsController.setPermissions);

// Lock/Unlock specific permissions
router.post('/lock', permissionsController.lockPermission);
router.post('/unlock', permissionsController.unlockPermission);

// Get all permissions
router.get('/', permissionsController.getPermissions);

// Get single element permission
router.get('/:elementId', permissionsController.getElementPermission);

module.exports = router;