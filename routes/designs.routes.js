const express = require('express');
const router = express.Router();
const designsController = require('../controllers/designs.controller');

// Generate prompt for DALL-E
router.post('/generate-prompt', designsController.generatePrompt);

// // Generate final design image with DALL-E
// router.post('/generate', designsController.generateDesign);

// Get current design state
router.get('/state', designsController.getDesignState);

// // Generate SVG from session elements
// router.post('/generate-svg', designsController.generateSVG);

// // Generate SVG from session elements and convert to Image
// router.post('/generate-svg-image', designsController.generateSVGAsImage);

// 🆕🆕 NEW: Generate image from AI prompt (AI decides everything)
// This endpoint uses GPT-4 to determine layout, positions, and styling
router.post('/generate-from-prompt', designsController.generateImageFromPrompt);

// Clear session data
router.post('/clear', designsController.clearDesignData);

module.exports = router;