const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assets.controller');
const upload = require('../middlewares/upload.middleware');

router.post('/upload', upload.array('files', 10), assetsController.uploadAssets);
router.get('/', assetsController.getAssets);
router.delete('/:assetId', assetsController.deleteAsset);

module.exports = router;