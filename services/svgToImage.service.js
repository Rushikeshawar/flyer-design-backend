const cloudinaryService = require('./cloudinary.service');
const axios = require('axios');
const openai = require('../config/openai');
const sharp = require('sharp');

/**
 * Generate SVG based on AI prompt - AI decides positions and styling
 */
exports.generateSVGFromPrompt = async (prompt, backgroundUrl, elements = [], canvasWidth = 1200, canvasHeight = 1697) => {
  try {
    console.log('🤖 Generating SVG layout from AI prompt...');
    
    // Step 1: Ask AI to generate layout and positions
    const aiLayout = await generateLayoutFromPrompt(prompt, elements, canvasWidth, canvasHeight);
    
    console.log('✅ AI layout generated:', JSON.stringify(aiLayout, null, 2));
    
    // Step 2: Generate SVG with AI-determined positions
    const svgContent = await generateSVGWithLayout(aiLayout, backgroundUrl, canvasWidth, canvasHeight);
    
    return {
      svgContent,
      aiLayout,
      prompt
    };
    
  } catch (error) {
    console.error('❌ Error generating SVG from prompt:', error);
    throw error;
  }
};

/**
 * Use AI (GPT-4) to determine element positions and styling based on prompt
 */
async function generateLayoutFromPrompt(prompt, elements, canvasWidth, canvasHeight) {
  const systemPrompt = `You are a professional graphic designer AI. Based on the user's prompt, generate a JSON layout for an A4 flyer design.

Canvas dimensions: ${canvasWidth}x${canvasHeight}px

You must return ONLY valid JSON with this structure:
{
  "background": {
    "color": "#hexcolor",
    "imageUrl": "url or null"
  },
  "elements": [
    {
      "type": "text|image|shape",
      "elementId": "unique-id",
      "text": "text content (if type=text)",
      "imageUrl": "image url (if type=image)",
      "coordinates": {
        "x": number,
        "y": number,
        "width": number,
        "height": number,
        "rotation": number (optional)
      },
      "properties": {
        "fontSize": number,
        "fontFamily": "font name",
        "textColor": "#hexcolor",
        "isBold": boolean,
        "isItalic": boolean,
        "textAlign": "left|center|right",
        "fillColor": "#hexcolor",
        "strokeColor": "#hexcolor",
        "strokeWidth": number,
        "opacity": number,
        "shapeType": "rectangle|circle|ellipse"
      }
    }
  ]
}

Design principles:
- Create professional, balanced layouts
- Use proper visual hierarchy (large titles, smaller body text)
- Ensure good spacing and alignment
- Position important elements in focal areas
- Use complementary colors
- Make text readable with good contrast
- Follow design best practices`;

  const userPrompt = `Design a flyer with this description:
${prompt}

${elements.length > 0 ? `Include these elements in the design:\n${elements.map((el, i) => `${i+1}. ${el.type}: ${el.text || el.description || 'element'}`).join('\n')}` : ''}

Generate a complete JSON layout with positions and styling for all elements.`;

  console.log('🧠 Asking AI to generate layout...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  const layoutJson = response.choices[0].message.content;
  const layout = JSON.parse(layoutJson);
  
  return layout;
}

/**
 * Generate SVG with AI-determined layout
 */
async function generateSVGWithLayout(layout, backgroundUrl, canvasWidth, canvasHeight) {
  console.log('🎨 Building SVG from AI layout...');
  
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" 
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=Roboto:wght@400;700&amp;family=Poppins:wght@400;700&amp;family=Montserrat:wght@400;700&amp;family=Playfair+Display:wght@400;700&amp;display=swap');
    </style>
  </defs>
  
  <!-- Background Layer -->
`;

  // Add background
  const bgColor = layout.background?.color || '#ffffff';
  svgContent += `  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${bgColor}"/>\n`;

  // Add background image
  const bgImageUrl = backgroundUrl || layout.background?.imageUrl;
  if (bgImageUrl) {
    console.log('📷 Embedding background image...');
    try {
      const base64Background = await downloadAndConvertToBase64(bgImageUrl);
      svgContent += `  <image href="${base64Background}" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="xMidYMid slice"/>\n`;
    } catch (error) {
      console.error('⚠️ Failed to embed background:', error.message);
      svgContent += `  <image href="${bgImageUrl}" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="xMidYMid slice"/>\n`;
    }
  }

  svgContent += `\n  <!-- Elements -->\n`;

  // Add elements from AI layout
  for (const element of layout.elements || []) {
    const coords = element.coordinates || {};
    const x = coords.x || 0;
    const y = coords.y || 0;
    const width = coords.width || 200;
    const height = coords.height || 100;
    const rotation = coords.rotation || 0;

    let transform = `translate(${x}, ${y})`;
    if (rotation) {
      transform += ` rotate(${rotation}, ${width/2}, ${height/2})`;
    }

    svgContent += `  <g id="${element.elementId}" transform="${transform}">\n`;

    switch (element.type) {
      case 'text':
        svgContent += generateTextSVG(element, width, height);
        break;
      case 'image':
        svgContent += await generateImageSVG(element, width, height);
        break;
      case 'shape':
        svgContent += generateShapeSVG(element, width, height);
        break;
    }

    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>`;
  
  console.log('✅ SVG generation complete');
  return svgContent;
}

/**
 * Generate text element SVG
 */
function generateTextSVG(element, width, height) {
  const props = element.properties || {};
  const fontSize = props.fontSize || 24;
  const fontFamily = props.fontFamily || 'Inter, sans-serif';
  const textColor = props.textColor || '#000000';
  const fontWeight = props.isBold ? 'bold' : 'normal';
  const fontStyle = props.isItalic ? 'italic' : 'normal';
  const textAlign = props.textAlign || 'left';
  const lineHeight = props.lineHeight || 1.2;

  let textAnchor = 'start';
  let xOffset = 0;
  if (textAlign === 'center') {
    textAnchor = 'middle';
    xOffset = width / 2;
  } else if (textAlign === 'right') {
    textAnchor = 'end';
    xOffset = width;
  }

  const lines = (element.text || '').split('\n');
  let svg = '';

  lines.forEach((line, index) => {
    const yPos = fontSize + (index * fontSize * lineHeight);
    svg += `    <text x="${xOffset}" y="${yPos}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${textColor}" text-anchor="${textAnchor}">${escapeXml(line)}</text>\n`;
  });

  return svg;
}

/**
 * Generate image element SVG
 */
async function generateImageSVG(element, width, height) {
  const props = element.properties || {};
  const opacity = props.opacity || 1;
  const imageUrl = element.imageUrl || element.assetUrl;

  if (!imageUrl) {
    return `    <!-- No image URL provided -->\n`;
  }

  console.log('🖼️ Embedding image:', imageUrl);
  
  try {
    const base64Image = await downloadAndConvertToBase64(imageUrl);
    return `    <image href="${base64Image}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>\n`;
  } catch (error) {
    console.error('⚠️ Failed to embed image:', error.message);
    return `    <image href="${imageUrl}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>\n`;
  }
}

/**
 * Generate shape element SVG
 */
function generateShapeSVG(element, width, height) {
  const props = element.properties || {};
  const shapeType = props.shapeType || 'rectangle';
  const fillColor = props.fillColor || '#cccccc';
  const strokeColor = props.strokeColor || 'none';
  const strokeWidth = props.strokeWidth || 0;
  const cornerRadius = props.cornerRadius || 0;
  const opacity = props.opacity || 1;

  let svg = '';

  switch (shapeType) {
    case 'rectangle':
      svg = `    <rect width="${width}" height="${height}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" rx="${cornerRadius}" opacity="${opacity}"/>\n`;
      break;
    case 'circle':
      const radius = Math.min(width, height) / 2;
      svg = `    <circle cx="${width/2}" cy="${height/2}" r="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
      break;
    case 'ellipse':
      svg = `    <ellipse cx="${width/2}" cy="${height/2}" rx="${width/2}" ry="${height/2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
      break;
    default:
      svg = `    <rect width="${width}" height="${height}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}"/>\n`;
  }

  return svg;
}

/**
 * Convert SVG to Image using Cloudinary
 */

/**
 * Convert SVG to Image using Sharp + Cloudinary
 */
exports.convertSVGToImage = async (svgContent, format = 'png') => {
  try {
    console.log('🔄 Converting SVG to image format:', format);
    
    // Convert SVG to PNG using Sharp
    const svgBuffer = Buffer.from(svgContent, 'utf-8');
    
    let imageBuffer;
    if (format === 'png') {
      imageBuffer = await sharp(svgBuffer)
        .png({ quality: 100 })
        .toBuffer();
    } else if (format === 'jpg' || format === 'jpeg') {
      imageBuffer = await sharp(svgBuffer)
        .jpeg({ quality: 95 })
        .toBuffer();
    } else {
      imageBuffer = await sharp(svgBuffer)
        .png({ quality: 100 })
        .toBuffer();
    }

    console.log('✅ SVG converted to', format);

    // Upload image to Cloudinary
    const cloudinaryService = require('./cloudinary.service');
    const imageUrl = await cloudinaryService.uploadToCloudinary(
      imageBuffer,
      'flygen/generated-images',
      'image'
    );

    // Also upload SVG for reference
    const svgBuffer2 = Buffer.from(svgContent, 'utf-8');
    const svgUrl = await cloudinaryService.uploadToCloudinary(
      svgBuffer2,
      'flygen/svg-designs',
      'raw'
    );

    console.log('✅ Image uploaded:', imageUrl);
    console.log('✅ SVG uploaded:', svgUrl);
    
    return {
      svgUrl,
      imageUrl,
      format
    };

  } catch (error) {
    console.error('❌ Error converting SVG to image:', error);
    throw new Error('Failed to convert SVG to image: ' + error.message);
  }
};

/**
 * Complete workflow: Prompt → AI Layout → SVG → Image
 */
exports.generateImageFromPrompt = async (prompt, backgroundUrl, elements = [], canvasWidth = 1200, canvasHeight = 1697, format = 'png') => {
  try {
    console.log('🚀 Starting AI-powered image generation...');
    console.log('📝 Prompt:', prompt);
    
    // Step 1: Generate SVG from prompt
    const { svgContent, aiLayout } = await this.generateSVGFromPrompt(
      prompt,
      backgroundUrl,
      elements,
      canvasWidth,
      canvasHeight
    );

    // Step 2: Convert to image
    const { svgUrl, imageUrl } = await this.convertSVGToImage(svgContent, format);

    console.log('🎉 Image generation complete!');
    
    return {
      success: true,
      imageUrl,
      svgUrl,
      svgContent,
      aiLayout,
      format,
      dimensions: {
        width: canvasWidth,
        height: canvasHeight
      },
      prompt
    };

  } catch (error) {
    console.error('❌ Error in generateImageFromPrompt:', error);
    throw error;
  }
};

/**
 * Download image and convert to base64
 */
async function downloadAndConvertToBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const base64 = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'image/png';
    
    return `data:${mimeType};base64,${base64}`;

  } catch (error) {
    console.error('❌ Error downloading image:', imageUrl, error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = exports;