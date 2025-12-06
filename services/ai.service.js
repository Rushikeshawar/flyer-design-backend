const openai = require('../config/openai');
const cloudinaryService = require('./cloudinary.service');
const axios = require('axios');

// Generate taglines using GPT-4
exports.generateTaglines = async (query, categories, numOptions) => {
  try {
    const categoryText = categories.length > 0 ? `in the ${categories.join(', ')} categories` : '';
    
    const prompt = `Generate exactly ${numOptions} professional, creative, and catchy taglines for a flyer about "${query}" ${categoryText}. 
    
Requirements:
- Each tagline should be memorable and impactful
- Keep them concise (5-10 words each)
- Make them suitable for business flyers
- Return ONLY the taglines, one per line, numbered

Format:
1. [tagline]
2. [tagline]
3. [tagline]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 300
    });

    const content = response.choices[0].message.content.trim();
    
    const taglines = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, numOptions);

    return taglines;

  } catch (error) {
    console.error('Error in generateTaglines:', error);
    throw new Error('Failed to generate taglines with AI');
  }
};

// Generate background using DALL-E 3
exports.generateBackground = async (prompt) => {
  try {
    const enhancedPrompt = `Create a high-quality background image for a professional A4 flyer. 
${prompt}

REQUIREMENTS:
- Full frame composition with no borders or margins
- Suitable as a background (not too busy or distracting)
- High contrast and vibrant colors
- Professional and modern aesthetic
- Abstract or minimal style that works well with text overlay
- No text, no logos, no people
- Edge-to-edge coverage, no white space
- A4 portrait orientation suitable`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1792',
      quality: 'hd',
      style: 'vivid'
    });

    const imageUrl = response.data[0].url;

    // Download and upload to Cloudinary
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    const cloudinaryUrl = await cloudinaryService.uploadToCloudinary(
      imageBuffer,
      'flygen/backgrounds',
      'image'
    );

    return cloudinaryUrl;

  } catch (error) {
    console.error('Error in generateBackground:', error);
    throw new Error('Failed to generate background with DALL-E');
  }
};

// Helper function to truncate prompt intelligently
function truncatePrompt(prompt, maxLength = 3800) {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  console.log(`⚠️ Prompt too long (${prompt.length} chars). Truncating to ${maxLength}...`);

  // Try to preserve critical sections
  const criticalMarkers = [
    '✨ MAIN TAGLINE',
    '🔒 LOCKED ELEMENTS',
    '✅ FINAL DESIGN REQUIREMENTS'
  ];

  // Find positions of critical sections
  const sections = [];
  criticalMarkers.forEach(marker => {
    const pos = prompt.indexOf(marker);
    if (pos !== -1) {
      sections.push({ marker, pos });
    }
  });

  // If prompt is way too long, use aggressive truncation
  if (prompt.length > maxLength * 1.5) {
    // Keep only the most essential parts
    let truncated = '';
    
    // Add header
    const headerEnd = prompt.indexOf('\n\n');
    if (headerEnd !== -1) {
      truncated += prompt.substring(0, headerEnd) + '\n\n';
    }

    // Add tagline section
    const taglineStart = prompt.indexOf('✨ MAIN TAGLINE');
    const taglineEnd = prompt.indexOf('━━━━', taglineStart + 10);
    if (taglineStart !== -1 && taglineEnd !== -1) {
      truncated += prompt.substring(taglineStart, taglineEnd + 30) + '\n\n';
    }

    // Add simplified locked elements
    const lockedStart = prompt.indexOf('🔒 LOCKED ELEMENTS');
    if (lockedStart !== -1) {
      const lockedSection = prompt.substring(lockedStart, lockedStart + 1500);
      truncated += lockedSection.substring(0, lockedSection.lastIndexOf('\n')) + '\n\n';
    }

    // Add essential requirements
    truncated += `✅ REQUIREMENTS:\n`;
    truncated += `- A4 Portrait (1200×1697px), full bleed, no margins\n`;
    truncated += `- Professional print quality, clear hierarchy\n`;
    truncated += `- Preserve all locked elements exactly\n`;
    truncated += `- High contrast for readability\n`;

    return truncated;
  }

  // Standard truncation - remove less important sections
  const removeableKeywords = [
    'FLEXIBLE ELEMENTS',
    'ADDITIONAL DESIGN RULES',
    '💡 Suggested Styling'
  ];

  let workingPrompt = prompt;
  
  for (const keyword of removeableKeywords) {
    if (workingPrompt.length <= maxLength) break;
    
    const start = workingPrompt.indexOf(keyword);
    if (start === -1) continue;
    
    // Find the next major section
    let end = workingPrompt.length;
    for (const marker of criticalMarkers) {
      const pos = workingPrompt.indexOf(marker, start);
      if (pos !== -1 && pos < end) {
        end = pos;
      }
    }
    
    // Remove this section
    workingPrompt = workingPrompt.substring(0, start) + workingPrompt.substring(end);
  }

  // If still too long, truncate from the end
  if (workingPrompt.length > maxLength) {
    workingPrompt = workingPrompt.substring(0, maxLength - 100);
    workingPrompt += '\n\n✅ Create professional A4 flyer with locked elements preserved exactly.';
  }

  return workingPrompt;
}

// Generate final design using DALL-E 3
exports.generateFinalDesign = async (prompt, lockedImages = []) => {
  try {
    // Base requirements
    let enhancedPrompt = `${prompt}

CRITICAL SPECS:
- A4 portrait (1200×1697px), full bleed, no margins
- Print-ready quality, sharp text, clear hierarchy
- Background covers entire canvas edge-to-edge`;

    // Add locked images info if present
    if (lockedImages.length > 0) {
      enhancedPrompt += `\n- PRESERVE these images exactly: ${lockedImages.map(img => img.description).join(', ')}`;
    }

    // Check and truncate if necessary
    console.log(`📝 Original prompt length: ${enhancedPrompt.length}`);
    
    if (enhancedPrompt.length > 4000) {
      enhancedPrompt = truncatePrompt(enhancedPrompt, 3900);
      console.log(`📝 Truncated prompt length: ${enhancedPrompt.length}`);
    }

    console.log('🎨 Sending request to DALL-E 3...');

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1792',
      quality: 'hd',
      style: 'vivid'
    });

    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt || null;

    console.log('✅ Image generated by DALL-E 3');
    console.log('📥 Downloading and uploading to Cloudinary...');

    // Download and upload to Cloudinary
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    const cloudinaryUrl = await cloudinaryService.uploadToCloudinary(
      imageBuffer,
      'flygen/designs',
      'image'
    );

    console.log('✅ Design uploaded to Cloudinary');

    return {
      designUrl: cloudinaryUrl,
      generatedPrompt: enhancedPrompt,
      revisedPrompt: revisedPrompt,
      originalPromptLength: prompt.length,
      finalPromptLength: enhancedPrompt.length,
      wasTruncated: enhancedPrompt.length < prompt.length
    };

  } catch (error) {
    console.error('Error in generateFinalDesign:', error);
    
    if (error.response) {
      console.error('OpenAI API Error:', error.response.data);
    }
    
    throw new Error('Failed to generate final design with DALL-E: ' + error.message);
  }
};

// Build design prompt (keep existing implementation)
exports.buildDesignPrompt = (request) => {
  const {
    selectedTagline,
    backgroundUrl,
    editablePrompt,
    aiRules,
    elements
  } = request;

  let prompt = `🎨 A4 FLYER DESIGN\n\n${editablePrompt}\n\n`;

  // Add tagline
  if (selectedTagline) {
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `✨ MAIN TAGLINE (PROMINENT):\n"${selectedTagline}"\n`;
    prompt += `- PRIMARY message, LARGE BOLD typography\n`;
    prompt += `- High contrast, prominent position\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // Add background
  if (backgroundUrl) {
    prompt += `🎨 BACKGROUND: ${backgroundUrl}\n`;
    prompt += `- Full edge-to-edge coverage, no margins\n`;
    prompt += `- Sufficient contrast for text\n\n`;
  }

  // Categorize elements
  const lockedElements = elements?.filter(el => 
    el.lockPosition || el.lockText || el.lockDesign || el.lockImage
  ) || [];
  
  const unlockedElements = elements?.filter(el => 
    !el.lockPosition && !el.lockText && !el.lockDesign && !el.lockImage
  ) || [];

  // LOCKED ELEMENTS - Compact format
  if (lockedElements.length > 0) {
    prompt += `🔒 LOCKED ELEMENTS (PRESERVE EXACTLY):\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    lockedElements.forEach((el, i) => {
      prompt += `[${i + 1}] ${el.type.toUpperCase()} - ${el.elementId}\n`;
      
      if (el.lockPosition && el.coordinates) {
        const c = el.coordinates;
        prompt += `  POS: (${c.x}, ${c.y}), ${c.width}×${c.height}px`;
        if (c.rotation) prompt += `, rot:${c.rotation}°`;
        prompt += ` ⚠️FIXED\n`;
      }

      if (el.lockText && el.text) {
        prompt += `  TEXT: "${el.text}" ⚠️EXACT\n`;
      }

      if (el.lockDesign && el.properties) {
        const p = el.properties;
        if (el.type === 'text') {
          prompt += `  STYLE: ${p.fontSize || 24}px, ${p.fontFamily || 'sans'}, ${p.textColor || '#000'}`;
          if (p.isBold) prompt += ', bold';
          if (p.isItalic) prompt += ', italic';
          prompt += ` ⚠️FIXED\n`;
        } else if (el.type === 'shape') {
          prompt += `  STYLE: fill:${p.fillColor || '#ccc'}, stroke:${p.strokeColor || 'none'} ⚠️FIXED\n`;
        }
      }

      if (el.lockImage && el.assetUrl) {
        prompt += `  IMG: ${el.assetUrl} ⚠️USE EXACT\n`;
      }

      prompt += `\n`;
    });
    
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // UNLOCKED ELEMENTS - Very compact
  if (unlockedElements.length > 0) {
    prompt += `✨ FLEXIBLE: ${unlockedElements.length} elements (adaptable)\n\n`;
  }

  // AI rules
  if (aiRules && aiRules.trim()) {
    prompt += `🤖 RULES: ${aiRules}\n\n`;
  }

  // Final requirements - Compact
  prompt += `✅ REQUIREMENTS:\n`;
  prompt += `- A4 Portrait (210×297mm), 1200×1697px\n`;
  prompt += `- Full bleed, no margins or borders\n`;
  prompt += `- Professional print quality\n`;
  prompt += `- Respect all locked elements\n`;
  prompt += `- Clear hierarchy, high contrast\n`;

  return prompt;
};

// Extract locked images
exports.extractLockedImages = (elements) => {
  if (!elements || !Array.isArray(elements)) return [];
  
  return elements
    .filter(el => el.lockImage && el.assetUrl)
    .map(el => ({
      url: el.assetUrl,
      description: `${el.type} at (${el.coordinates?.x || 0}, ${el.coordinates?.y || 0})`,
      elementId: el.elementId,
      coordinates: el.coordinates
    }));
};