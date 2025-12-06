const aiService = require('../services/ai.service');

exports.generateBackground = async (req, res) => {
  try {
    const { prompt, color } = req.body;

    if (!prompt && !color) {
      return res.status(400).json({
        error: true,
        message: 'Provide either prompt or color'
      });
    }

    let backgroundUrl;

    // If color is provided, create solid color background
    if (color) {
      const colorPrompt = `Create a solid ${color} color background, completely flat and uniform, no gradients, no patterns, just pure ${color} color fill for A4 flyer`;
      backgroundUrl = await aiService.generateBackground(colorPrompt);
    } 
    // If prompt is provided
    else {
      backgroundUrl = await aiService.generateBackground(prompt);
    }

    res.json({ 
      success: true,
      backgroundUrl 
    });

  } catch (error) {
    console.error('Error generating background:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to generate background'
    });
  }
};