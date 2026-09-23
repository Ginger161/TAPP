const sharp = require('sharp');
const path = require('path');

async function processIcons() {
  const inputPath = path.join(__dirname, '../public/logo.png');
  const out192 = path.join(__dirname, '../public/icon-192x192.png');
  const out512 = path.join(__dirname, '../public/icon-512x512.png');

  try {
    // Trim removes surrounding transparent pixels
    const trimmed = sharp(inputPath).trim();
    
    // Resize to square while maintaining aspect ratio, adding transparent padding where necessary
    await trimmed.clone().resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }).toFile(out192);
    
    await trimmed.clone().resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }).toFile(out512);

    console.log('Icons generated successfully.');
  } catch (error) {
    console.error('Error processing icons:', error);
  }
}

processIcons();
