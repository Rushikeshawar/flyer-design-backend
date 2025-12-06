const sessionStore = require('../utils/sessionStore');

// Update or set properties for an element
exports.updateProperties = (req, res) => {
  try {
    const { elementId, properties } = req.body;

    if (!elementId || !properties) {
      return res.status(400).json({
        error: true,
        message: 'elementId and properties are required'
      });
    }

    const sessionId = req.sessionID;
    const allProperties = sessionStore.get(sessionId, 'properties') || {};
    
    allProperties[elementId] = properties;
    sessionStore.set(sessionId, 'properties', allProperties);

    res.json({
      success: true,
      message: `Properties updated for element ${elementId}`,
      properties: properties
    });

  } catch (error) {
    console.error('Error updating properties:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update properties'
    });
  }
};

// Get properties for a single element
exports.getProperties = (req, res) => {
  try {
    const { elementId } = req.params;
    const sessionId = req.sessionID;
    const allProperties = sessionStore.get(sessionId, 'properties') || {};
    
    const properties = allProperties[elementId] || null;
    res.json({ 
      success: true,
      properties 
    });
  } catch (error) {
    console.error('Error getting properties:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get properties'
    });
  }
};

// Get all properties
exports.getAllProperties = (req, res) => {
  try {
    const sessionId = req.sessionID;
    const allProperties = sessionStore.get(sessionId, 'properties') || {};
    res.json({ 
      success: true,
      properties: allProperties 
    });
  } catch (error) {
    console.error('Error getting all properties:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get all properties'
    });
  }
};

// Lock specific property type
exports.lockProperty = (req, res) => {
  try {
    const { elementId, propertyType } = req.body;

    if (!elementId || !propertyType) {
      return res.status(400).json({
        error: true,
        message: 'elementId and propertyType are required'
      });
    }

    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];

    const element = permissions.find(el => el.elementId === elementId);
    if (!element) {
      return res.status(404).json({
        error: true,
        message: `Element with id ${elementId} not found in permissions`
      });
    }

    // Lock design when any property is locked
    element.lockDesign = true;
    sessionStore.set(sessionId, 'permissions', permissions);

    res.json({
      success: true,
      message: `Property ${propertyType} locked for element ${elementId}`,
      element: element
    });

  } catch (error) {
    console.error('Error locking property:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to lock property'
    });
  }
};

// Unlock specific property type
exports.unlockProperty = (req, res) => {
  try {
    const { elementId, propertyType } = req.body;

    if (!elementId || !propertyType) {
      return res.status(400).json({
        error: true,
        message: 'elementId and propertyType are required'
      });
    }

    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];

    const element = permissions.find(el => el.elementId === elementId);
    if (!element) {
      return res.status(404).json({
        error: true,
        message: `Element with id ${elementId} not found in permissions`
      });
    }

    // Unlock design
    element.lockDesign = false;
    sessionStore.set(sessionId, 'permissions', permissions);

    res.json({
      success: true,
      message: `Property ${propertyType} unlocked for element ${elementId}`,
      element: element
    });

  } catch (error) {
    console.error('Error unlocking property:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to unlock property'
    });
  }
};