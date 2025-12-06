const cloudinaryService = require('../services/cloudinary.service');
const sessionStore = require('../utils/sessionStore');
const { v4: uuidv4 } = require('uuid');

exports.uploadAssets = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const url = await cloudinaryService.uploadToCloudinary(
        file.buffer,
        'flygen/assets',
        'image'
      );

      return {
        id: uuidv4(),
        url: url,
        name: file.originalname,
        type: 'image',
        uploadedAt: new Date().toISOString()
      };
    });

    const assets = await Promise.all(uploadPromises);

    // Store in session
    const sessionId = req.sessionID;
    const existingAssets = sessionStore.get(sessionId, 'assets') || [];
    sessionStore.set(sessionId, 'assets', [...existingAssets, ...assets]);

    res.json({ 
      success: true,
      assets,
      totalAssets: existingAssets.length + assets.length
    });

  } catch (error) {
    console.error('Error uploading assets:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to upload assets'
    });
  }
};

exports.getAssets = (req, res) => {
  try {
    const sessionId = req.sessionID;
    const assets = sessionStore.get(sessionId, 'assets') || [];
    res.json({ 
      success: true,
      assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Error getting assets:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get assets'
    });
  }
};

exports.deleteAsset = (req, res) => {
  try {
    const { assetId } = req.params;
    const sessionId = req.sessionID;
    
    let assets = sessionStore.get(sessionId, 'assets') || [];
    assets = assets.filter(asset => asset.id !== assetId);
    
    sessionStore.set(sessionId, 'assets', assets);

    res.json({ 
      success: true,
      message: 'Asset deleted',
      remainingAssets: assets.length
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete asset'
    });
  }
};