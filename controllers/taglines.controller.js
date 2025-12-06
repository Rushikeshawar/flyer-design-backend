const aiService = require('../services/ai.service');
const { v4: uuidv4 } = require('uuid');

exports.generateTaglines = async (req, res) => {
  try {
    const { numOptions, query, categories } = req.body;

    // Validation
    if (!numOptions || !query) {
      return res.status(400).json({
        error: true,
        message: 'numOptions and query are required'
      });
    }

    if (![2, 3, 5].includes(numOptions)) {
      return res.status(400).json({
        error: true,
        message: 'numOptions must be 2, 3, or 5'
      });
    }

    // Generate taglines
    const taglineTexts = await aiService.generateTaglines(
      query,
      categories || [],
      numOptions
    );

    // Format response with IDs
    const taglines = taglineTexts.map(text => ({
      id: uuidv4(),
      text: text.trim()
    }));

    res.json({ 
      success: true,
      taglines 
    });

  } catch (error) {
    console.error('Error generating taglines:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to generate taglines'
    });
  }
};