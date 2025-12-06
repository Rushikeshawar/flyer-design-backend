
exports.buildDesignPrompt = (request) => {
  const {
    selectedTagline,
    backgroundUrl,
    editablePrompt,
    aiRules,
    elements
  } = request;

  let prompt = `🎨 CREATE A PROFESSIONAL A4 FLYER DESIGN\n\n`;
  prompt += `📋 DESIGN DESCRIPTION:\n${editablePrompt}\n\n`;

  // Add tagline prominently
  if (selectedTagline) {
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `✨ MAIN TAGLINE (MUST BE PROMINENT):\n`;
    prompt += `"${selectedTagline}"\n`;
    prompt += `- This is the PRIMARY message of the flyer\n`;
    prompt += `- Use LARGE, BOLD, and eye-catching typography\n`;
    prompt += `- Position it prominently for maximum impact\n`;
    prompt += `- Ensure high contrast with background for readability\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // Add background information
  if (backgroundUrl) {
    prompt += `🎨 BACKGROUND REFERENCE:\n`;
    prompt += `Use a background style inspired by: ${backgroundUrl}\n`;
    prompt += `CRITICAL:\n`;
    prompt += `- Background MUST cover entire A4 canvas edge-to-edge\n`;
    prompt += `- NO white margins, borders, or gaps on ANY side\n`;
    prompt += `- Create cohesive visual foundation for all elements\n`;
    prompt += `- Ensure sufficient contrast for text readability\n\n`;
  }

  // Categorize elements
  const lockedElements = elements?.filter(el => 
    el.lockPosition || el.lockText || el.lockDesign || el.lockImage
  ) || [];
  
  const unlockedElements = elements?.filter(el => 
    !el.lockPosition && !el.lockText && !el.lockDesign && !el.lockImage
  ) || [];

  // LOCKED ELEMENTS - Must be preserved exactly
  if (lockedElements.length > 0) {
    prompt += `\n🔒 LOCKED ELEMENTS (⚠️ CRITICAL - MUST PRESERVE EXACTLY):\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `These elements are LOCKED and must be preserved EXACTLY as specified.\n`;
    prompt += `DO NOT modify position, text, styling, or images marked as locked.\n\n`;

    lockedElements.forEach((element, index) => {
      prompt += `┌─ [LOCKED ELEMENT ${index + 1}] ─────────────────\n`;
      prompt += `│ Type: ${element.type.toUpperCase()}\n`;
      prompt += `│ Element ID: ${element.elementId}\n`;
      
      // Position lock
      if (element.lockPosition && element.coordinates) {
        const { x, y, width, height, rotation } = element.coordinates;
        prompt += `│ \n`;
        prompt += `│ 🔒 POSITION LOCKED:\n`;
        prompt += `│   X: ${x}px, Y: ${y}px\n`;
        prompt += `│   Width: ${width}px, Height: ${height}px\n`;
        if (rotation) prompt += `│   Rotation: ${rotation}°\n`;
        prompt += `│   ⚠️ DO NOT MOVE - Keep at EXACT coordinates\n`;
      }

      // Text lock
      if (element.lockText && element.text) {
        prompt += `│ \n`;
        prompt += `│ 🔒 TEXT LOCKED:\n`;
        prompt += `│   "${element.text}"\n`;
        prompt += `│   ⚠️ DO NOT CHANGE WORDING - Use EXACT text\n`;
      } else if (element.text) {
        prompt += `│   Text: "${element.text}"\n`;
      }

      // Design/styling lock
      if (element.lockDesign && element.properties) {
        const p = element.properties;
        prompt += `│ \n`;
        prompt += `│ 🔒 DESIGN/STYLING LOCKED:\n`;
        
        if (element.type === 'text') {
          if (p.fontSize) prompt += `│   Font Size: ${p.fontSize}px (FIXED)\n`;
          if (p.fontFamily) prompt += `│   Font Family: ${p.fontFamily} (FIXED)\n`;
          if (p.textColor) prompt += `│   Text Color: ${p.textColor} (FIXED)\n`;
          if (p.isBold) prompt += `│   Font Weight: Bold (FIXED)\n`;
          if (p.isItalic) prompt += `│   Font Style: Italic (FIXED)\n`;
          if (p.textAlign) prompt += `│   Text Align: ${p.textAlign} (FIXED)\n`;
        }
        
        if (element.type === 'shape') {
          if (p.fillColor) prompt += `│   Fill Color: ${p.fillColor} (FIXED)\n`;
          if (p.strokeColor) prompt += `│   Stroke: ${p.strokeColor}, ${p.strokeWidth}px (FIXED)\n`;
          if (p.cornerRadius) prompt += `│   Corner Radius: ${p.cornerRadius}px (FIXED)\n`;
        }
        
        prompt += `│   ⚠️ DO NOT MODIFY STYLING - Use exact properties\n`;
      } else if (element.properties && Object.keys(element.properties).length > 0) {
        prompt += `│   Properties: ${JSON.stringify(element.properties)}\n`;
      }

      // Image lock
      if (element.lockImage && element.assetUrl) {
        prompt += `│ \n`;
        prompt += `│ 🔒 IMAGE LOCKED:\n`;
        prompt += `│   URL: ${element.assetUrl}\n`;
        prompt += `│   ⚠️ CRITICAL: Use this EXACT image\n`;
        prompt += `│   - DO NOT replace, regenerate, or modify\n`;
        prompt += `│   - Preserve exact appearance and quality\n`;
        prompt += `│   - Maintain aspect ratio\n`;
        prompt += `│   - Keep original colors and details\n`;
      } else if (element.type === 'image' && element.assetUrl) {
        prompt += `│   Image: ${element.assetUrl}\n`;
      }

      prompt += `└───────────────────────────────────\n\n`;
    });
    
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // UNLOCKED ELEMENTS - Can be adapted creatively
  if (unlockedElements.length > 0) {
    prompt += `\n✨ FLEXIBLE ELEMENTS (Can be creatively adapted):\n`;
    prompt += `These elements can be adjusted for better visual composition.\n\n`;

    unlockedElements.forEach((element, index) => {
      prompt += `[Flexible Element ${index + 1}] ${element.type.toUpperCase()}\n`;
      
      if (element.coordinates) {
        const { x, y, width, height, rotation } = element.coordinates;
        prompt += `  📍 Suggested Position: X=${x}px, Y=${y}px, Size=${width}×${height}px`;
        if (rotation) prompt += `, Rotation=${rotation}°`;
        prompt += ` (adjustable)\n`;
      }

      if (element.text) {
        prompt += `  📝 Content: "${element.text}" (can be styled)\n`;
      }

      if (element.properties && Object.keys(element.properties).length > 0) {
        const p = element.properties;
        prompt += `  💡 Suggested Styling (adaptable):\n`;
        
        if (p.fontSize) prompt += `    - Font Size: ~${p.fontSize}px\n`;
        if (p.fontFamily) prompt += `    - Font: ${p.fontFamily}\n`;
        if (p.textColor) prompt += `    - Color: ${p.textColor}\n`;
        if (p.fillColor) prompt += `    - Fill: ${p.fillColor}\n`;
      }

      if (element.type === 'image' && element.assetUrl) {
        prompt += `  🖼️ Image Reference: ${element.assetUrl}\n`;
        prompt += `  (Use similar style/theme but can adapt)\n`;
      }

      prompt += `\n`;
    });
  }

  // Add custom AI rules
  if (aiRules && aiRules.trim()) {
    prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `🤖 ADDITIONAL DESIGN RULES:\n`;
    prompt += `${aiRules}\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // Final requirements
  prompt += `\n✅ FINAL DESIGN REQUIREMENTS:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `1. Format: A4 Portrait (210×297mm ratio, 1200×1697px)\n`;
  prompt += `2. FULL BLEED: No white margins, borders, or gaps on ANY side\n`;
  prompt += `3. Content extends to ALL edges of the canvas\n`;
  prompt += `4. Professional print-ready quality\n`;
  prompt += `5. Clear visual hierarchy and balanced composition\n`;
  prompt += `6. High contrast for text readability\n`;
  prompt += `7. ⚠️ STRICTLY RESPECT all locked elements above\n`;
  prompt += `8. For locked images: Preserve EXACT appearance, do not regenerate\n`;
  prompt += `9. For locked positions: Keep EXACT coordinates\n`;
  prompt += `10. For locked text: Use EXACT wording\n`;
  prompt += `11. For locked design: Use EXACT styling properties\n`;
  prompt += `12. Create cohesive, professional design suitable for print\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return prompt;
};

// Extract locked images for special handling
exports.extractLockedImages = (elements) => {
  if (!elements || !Array.isArray(elements)) return [];
  
  return elements
    .filter(el => el.lockImage && el.assetUrl)
    .map(el => ({
      url: el.assetUrl,
      description: `${el.type} element at (${el.coordinates?.x || 0}, ${el.coordinates?.y || 0})`,
      elementId: el.elementId,
      coordinates: el.coordinates
    }));
};
