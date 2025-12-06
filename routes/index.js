const express = require('express');
const router = express.Router();

const taglinesRoutes = require('./taglines.routes');
const backgroundsRoutes = require('./backgrounds.routes');
const assetsRoutes = require('./assets.routes');
const permissionsRoutes = require('./permissions.routes');
const propertiesRoutes = require('./properties.routes');
const designsRoutes = require('./designs.routes');

router.use('/taglines', taglinesRoutes);
router.use('/backgrounds', backgroundsRoutes);
router.use('/assets', assetsRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/properties', propertiesRoutes);
router.use('/designs', designsRoutes);

module.exports = router;