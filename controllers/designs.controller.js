const aiService = require('../services/ai.service');
const promptBuilderService = require('../services/promptBuilder.service');
// const svgGeneratorService = require('../services/svgGenerator.service');
// const svgToImageService = require('../services/svgToImage.service'); // NEW
const cloudinaryService = require('../services/cloudinary.service');
const sessionStore = require('../utils/sessionStore');

// Generate prompt (Step 1)
// Generate prompt (Step 1) - IMPROVED VERSION
exports.generatePrompt = async (req, res) => {
  try {
    const {
      selectedTagline,
      backgroundUrl,
      editablePrompt,
      aiRules,
      elementIds  // 🆕 NEW: Array of element IDs to include
    } = req.body;

    if (!editablePrompt) {
      return res.status(400).json({
        error: true,
        message: 'editablePrompt is required'
      });
    }

    const sessionId = req.sessionID;

    // Get all permissions and properties from session
    const allPermissions = sessionStore.get(sessionId, 'permissions') || [];
    const allProperties = sessionStore.get(sessionId, 'properties') || {};

    // 🎯 Filter elements based on elementIds if provided
    let permissions = allPermissions;
    if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
      permissions = allPermissions.filter(el => elementIds.includes(el.elementId));
      
      console.log(`📋 Filtering elements: ${elementIds.length} IDs provided`);
      console.log(`✅ Found ${permissions.length} matching elements`);
      
      // Check for missing elements
      const foundIds = permissions.map(el => el.elementId);
      const missingIds = elementIds.filter(id => !foundIds.includes(id));
      
      if (missingIds.length > 0) {
        console.warn(`⚠️ Warning: ${missingIds.length} elements not found in session:`, missingIds);
      }
    } else {
      console.log(`📋 No elementIds provided, using all ${allPermissions.length} elements from session`);
    }

    // Merge permissions with properties
    const mergedElements = permissions.map(element => ({
      ...element,
      properties: allProperties[element.elementId] || {}
    }));

    console.log(`\n📊 ELEMENT SUMMARY:`);
    console.log(`Total elements in session: ${allPermissions.length}`);
    console.log(`Elements requested: ${elementIds?.length || 'ALL'}`);
    console.log(`Elements in prompt: ${mergedElements.length}`);
    console.log(`\n🔒 LOCK STATUS:`);
    mergedElements.forEach((el, i) => {
      console.log(`  [${i + 1}] ${el.elementId} (${el.type})`);
      console.log(`      Position: ${el.lockPosition ? '🔒 LOCKED' : '🔓 Unlocked'}`);
      console.log(`      Text: ${el.lockText ? '🔒 LOCKED' : '🔓 Unlocked'}`);
      console.log(`      Design: ${el.lockDesign ? '🔒 LOCKED' : '🔓 Unlocked'}`);
      console.log(`      Image: ${el.lockImage ? '🔒 LOCKED' : '🔓 Unlocked'}`);
      console.log(`      Properties: ${Object.keys(el.properties).length} defined`);
    });

    // Build design request
    const designRequest = {
      selectedTagline: selectedTagline || '',
      backgroundUrl: backgroundUrl || '',
      editablePrompt,
      aiRules: aiRules || '',
      elements: mergedElements
    };

    // Generate prompt using service
    const generatedPrompt = promptBuilderService.buildDesignPrompt(designRequest);
    const lockedImages = promptBuilderService.extractLockedImages(mergedElements);

    // Store in session for later use
    sessionStore.set(sessionId, 'lastGeneratedPrompt', generatedPrompt);
    sessionStore.set(sessionId, 'lockedImages', lockedImages);
    sessionStore.set(sessionId, 'lastDesignRequest', designRequest);
    sessionStore.set(sessionId, 'lastUsedElementIds', elementIds || allPermissions.map(el => el.elementId));

    // Prepare detailed response
    const lockedCount = mergedElements.filter(el => 
      el.lockPosition || el.lockText || el.lockDesign || el.lockImage
    ).length;

    const unlockedCount = mergedElements.length - lockedCount;

    res.json({
      success: true,
      prompt: generatedPrompt,
      summary: {
        totalElements: mergedElements.length,
        lockedElements: lockedCount,
        unlockedElements: unlockedCount,
        lockedImagesCount: lockedImages.length,
        elementsRequested: elementIds?.length || 'ALL',
        elementsFound: mergedElements.length
      },
      elements: mergedElements.map(el => ({
        elementId: el.elementId,
        type: el.type,
        locks: {
          position: el.lockPosition,
          text: el.lockText,
          design: el.lockDesign,
          image: el.lockImage
        },
        hasProperties: Object.keys(el.properties).length > 0
      })),
      message: 'Prompt generated successfully with all element data included'
    });

  } catch (error) {
    console.error('❌ Error generating prompt:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to generate prompt'
    });
  }
};

// Generate design image (Step 2)
// exports.generateDesign = async (req, res) => {
//   try {
//     let { prompt, selectedTagline, backgroundUrl, editablePrompt, aiRules } = req.body;

//     const sessionId = req.sessionID;

//     if (!prompt) {
//       const storedPrompt = sessionStore.get(sessionId, 'lastGeneratedPrompt');
      
//       if (!storedPrompt) {
//         if (!editablePrompt) {
//           return res.status(400).json({
//             error: true,
//             message: 'Either prompt or editablePrompt is required'
//           });
//         }

//         const permissions = sessionStore.get(sessionId, 'permissions') || [];
//         const allProperties = sessionStore.get(sessionId, 'properties') || {};

//         const mergedElements = permissions.map(element => ({
//           ...element,
//           properties: allProperties[element.elementId] || {}
//         }));

//         const designRequest = {
//           selectedTagline: selectedTagline || '',
//           backgroundUrl: backgroundUrl || '',
//           editablePrompt,
//           aiRules: aiRules || '',
//           elements: mergedElements
//         };

//         prompt = promptBuilderService.buildDesignPrompt(designRequest);
//         const lockedImages = promptBuilderService.extractLockedImages(mergedElements);
        
//         sessionStore.set(sessionId, 'lockedImages', lockedImages);
//       } else {
//         prompt = storedPrompt;
//       }
//     }

//     const lockedImages = sessionStore.get(sessionId, 'lockedImages') || [];

//     console.log('🎨 Generating design with DALL-E 3');
//     console.log('📝 Prompt length:', prompt.length);
//     console.log('🔒 Locked images:', lockedImages.length);

//     const { designUrl, generatedPrompt, revisedPrompt, wasTruncated } = await aiService.generateFinalDesign(prompt, lockedImages);

//     sessionStore.set(sessionId, 'lastGeneratedDesignUrl', designUrl);

//     res.json({
//       success: true,
//       designUrl,
//       finalPromptUsed: generatedPrompt,
//       revisedPrompt: revisedPrompt,
//       lockedImagesPreserved: lockedImages.length,
//       wasTruncated: wasTruncated,
//       message: 'Design generated successfully'
//     });

//   } catch (error) {
//     console.error('Error generating design:', error);
//     res.status(500).json({
//       error: true,
//       message: error.message || 'Failed to generate design'
//     });
//   }
// };

// Get current design state
exports.getDesignState = (req, res) => {
  try {
    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];
    const properties = sessionStore.get(sessionId, 'properties') || {};
    const assets = sessionStore.get(sessionId, 'assets') || [];
    const lastPrompt = sessionStore.get(sessionId, 'lastGeneratedPrompt') || null;
    const lockedImages = sessionStore.get(sessionId, 'lockedImages') || [];
    const lastDesignUrl = sessionStore.get(sessionId, 'lastGeneratedDesignUrl') || null;

    const mergedElements = permissions.map(element => ({
      ...element,
      properties: properties[element.elementId] || {}
    }));

    res.json({
      success: true,
      elements: mergedElements,
      assets,
      lastGeneratedPrompt: lastPrompt,
      lastGeneratedDesignUrl: lastDesignUrl,
      lockedImages,
      summary: {
        totalElements: mergedElements.length,
        lockedPositions: mergedElements.filter(el => el.lockPosition).length,
        lockedTexts: mergedElements.filter(el => el.lockText).length,
        lockedDesigns: mergedElements.filter(el => el.lockDesign).length,
        lockedImages: mergedElements.filter(el => el.lockImage).length,
        totalAssets: assets.length
      }
    });
  } catch (error) {
    console.error('Error getting design state:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get design state'
    });
  }
};

// Generate SVG (old method)
// exports.generateSVG = async (req, res) => {
//   try {
//     const { backgroundUrl, canvasWidth, canvasHeight } = req.body;
//     const sessionId = req.sessionID;
//     const permissions = sessionStore.get(sessionId, 'permissions') || [];
//     const allProperties = sessionStore.get(sessionId, 'properties') || {};

//     const mergedElements = permissions.map(element => ({
//       ...element,
//       properties: allProperties[element.elementId] || {}
//     }));

//     const svgContent = svgGeneratorService.generateEditableSVG(
//       mergedElements,
//       backgroundUrl,
//       canvasWidth || 1200,
//       canvasHeight || 1697
//     );

//     const metadata = svgGeneratorService.generateLayerMetadata(
//       mergedElements,
//       backgroundUrl,
//       canvasWidth || 1200,
//       canvasHeight || 1697
//     );

//     const svgBuffer = Buffer.from(svgContent, 'utf-8');
//     const svgUrl = await cloudinaryService.uploadToCloudinary(
//       svgBuffer,
//       'flygen/svg-designs',
//       'raw'
//     );

//     res.json({
//       success: true,
//       svgUrl: svgUrl,
//       svg: svgContent,
//       metadata: metadata,
//       elementsCount: mergedElements.length,
//       lockedCount: mergedElements.filter(el => 
//         el.lockPosition || el.lockText || el.lockDesign || el.lockImage
//       ).length
//     });
//   } catch (error) {
//     console.error('Error generating SVG:', error);
//     res.status(500).json({
//       error: true,
//       message: error.message || 'Failed to generate SVG'
//     });
//   }
// };

// 🆕 NEW: Generate SVG and convert to Image
// exports.generateSVGAsImage = async (req, res) => {
//   try {
//     const { backgroundUrl, canvasWidth, canvasHeight, format } = req.body;
//     const sessionId = req.sessionID;
    
//     console.log('🚀 Starting SVG to Image generation...');
    
//     // Get elements from session
//     const permissions = sessionStore.get(sessionId, 'permissions') || [];
//     const allProperties = sessionStore.get(sessionId, 'properties') || {};

//     const mergedElements = permissions.map(element => ({
//       ...element,
//       properties: allProperties[element.elementId] || {}
//     }));

//     console.log(`📊 Processing ${mergedElements.length} elements`);

//     // Generate SVG and convert to image
//     const result = await svgToImageService.generateAndConvertToImage(
//       mergedElements,
//       backgroundUrl,
//       canvasWidth || 1200,
//       canvasHeight || 1697,
//       format || 'png'
//     );

//     // Store in session
//     sessionStore.set(sessionId, 'lastGeneratedSVGImageUrl', result.imageUrl);

//     res.json({
//       success: true,
//       imageUrl: result.imageUrl,
//       svgUrl: result.svgUrl,
//       format: result.format,
//       dimensions: result.dimensions,
//       elementsCount: mergedElements.length,
//       message: 'SVG generated and converted to image successfully'
//     });

//   } catch (error) {
//     console.error('❌ Error generating SVG as image:', error);
//     res.status(500).json({
//       error: true,
//       message: error.message || 'Failed to generate SVG as image'
//     });
//   }
// };

exports.generateImageFromPrompt = async (req, res) => {
  try {
    const { 
      prompt, 
      backgroundUrl, 
      elements,
      canvasWidth, 
      canvasHeight, 
      format 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: true,
        message: 'prompt is required'
      });
    }

    console.log('🚀 Starting AI-powered image generation from prompt...');
    console.log('📝 Prompt:', prompt);

    const svgToImageService = require('../services/svgToImage.service');

    // Generate image using AI prompt
    const result = await svgToImageService.generateImageFromPrompt(
      prompt,
      backgroundUrl || null,
      elements || [],
      canvasWidth || 1200,
      canvasHeight || 1697,
      format || 'png'
    );

    // Store in session
    const sessionId = req.sessionID;
    sessionStore.set(sessionId, 'lastAIGeneratedImage', result.imageUrl);
    sessionStore.set(sessionId, 'lastAILayout', result.aiLayout);

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      svgUrl: result.svgUrl,
      aiLayout: result.aiLayout,
      format: result.format,
      dimensions: result.dimensions,
      prompt: result.prompt,
      message: 'Image generated from AI prompt successfully',
      elementsGenerated: result.aiLayout.elements?.length || 0
    });

  } catch (error) {
    console.error('❌ Error generating image from prompt:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to generate image from prompt'
    });
  }
};

// Clear session data
exports.clearDesignData = (req, res) => {
  try {
    const sessionId = req.sessionID;
    sessionStore.clearSession(sessionId);
    res.json({
      success: true,
      message: 'All design data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing design data:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to clear design data'
    });
  }
};