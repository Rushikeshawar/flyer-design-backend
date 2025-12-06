const sessionStore = require('../utils/sessionStore');

// Set initial permissions (elements structure)
exports.setPermissions = (req, res) => {
  try {
    const { elements } = req.body;

    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({
        error: true,
        message: 'elements array is required'
      });
    }

    // Initialize elements with all locks as false by default
    const initializedElements = elements.map(element => ({
      elementId: element.elementId || `element-${Date.now()}-${Math.random()}`,
      type: element.type || 'text',
      text: element.text || '',
      assetUrl: element.assetUrl || '',
      coordinates: element.coordinates || { x: 0, y: 0, width: 200, height: 100 },
      lockPosition: false,
      lockText: false,
      lockDesign: false,
      lockImage: false
    }));

    const sessionId = req.sessionID;
    sessionStore.set(sessionId, 'permissions', initializedElements);

    res.json({
      success: true,
      message: `Permissions initialized for ${elements.length} elements`,
      elements: initializedElements
    });

  } catch (error) {
    console.error('Error setting permissions:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to set permissions'
    });
  }
};

// Lock specific permission for an element
exports.lockPermission = (req, res) => {
  try {
    const { elementId, lockType } = req.body;

    if (!elementId || !lockType) {
      return res.status(400).json({
        error: true,
        message: 'elementId and lockType are required'
      });
    }

    const validLockTypes = ['lockPosition', 'lockText', 'lockDesign', 'lockImage'];
    if (!validLockTypes.includes(lockType)) {
      return res.status(400).json({
        error: true,
        message: `lockType must be one of: ${validLockTypes.join(', ')}`
      });
    }

    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];

    const element = permissions.find(el => el.elementId === elementId);
    if (!element) {
      return res.status(404).json({
        error: true,
        message: `Element with id ${elementId} not found`
      });
    }

    element[lockType] = true;
    sessionStore.set(sessionId, 'permissions', permissions);

    res.json({
      success: true,
      message: `${lockType} locked for element ${elementId}`,
      element: element
    });

  } catch (error) {
    console.error('Error locking permission:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to lock permission'
    });
  }
};

// Unlock specific permission for an element
exports.unlockPermission = (req, res) => {
  try {
    const { elementId, lockType } = req.body;

    if (!elementId || !lockType) {
      return res.status(400).json({
        error: true,
        message: 'elementId and lockType are required'
      });
    }

    const validLockTypes = ['lockPosition', 'lockText', 'lockDesign', 'lockImage'];
    if (!validLockTypes.includes(lockType)) {
      return res.status(400).json({
        error: true,
        message: `lockType must be one of: ${validLockTypes.join(', ')}`
      });
    }

    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];

    const element = permissions.find(el => el.elementId === elementId);
    if (!element) {
      return res.status(404).json({
        error: true,
        message: `Element with id ${elementId} not found`
      });
    }

    element[lockType] = false;
    sessionStore.set(sessionId, 'permissions', permissions);

    res.json({
      success: true,
      message: `${lockType} unlocked for element ${elementId}`,
      element: element
    });

  } catch (error) {
    console.error('Error unlocking permission:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to unlock permission'
    });
  }
};

// Get all permissions
exports.getPermissions = (req, res) => {
  try {
    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];
    res.json({ 
      success: true,
      elements: permissions,
      count: permissions.length
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get permissions'
    });
  }
};

// Get single element permission
exports.getElementPermission = (req, res) => {
  try {
    const { elementId } = req.params;
    const sessionId = req.sessionID;
    const permissions = sessionStore.get(sessionId, 'permissions') || [];
    
    const element = permissions.find(el => el.elementId === elementId);
    
    if (!element) {
      return res.status(404).json({
        error: true,
        message: `Element with id ${elementId} not found`
      });
    }

    res.json({ 
      success: true,
      element 
    });
  } catch (error) {
    console.error('Error getting element permission:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get element permission'
    });
  }
};