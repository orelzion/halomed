/**
 * Generate PWA icons from the mascot app_icon.png
 * Run with: cd web && node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '../public/mascot/app_icon.png');
const outputDir = path.join(__dirname, '../public');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
];

async function generateIcons() {
  console.log('Generating PWA icons from:', inputPath);
  
  for (const { name, size } of sizes) {
    const outputPath = path.join(outputDir, name);
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  Created: ${name} (${size}x${size})`);
  }
  
  // Generate ICO file (just copy the 32px version for now)
  const favicon32 = path.join(outputDir, 'favicon-32.png');
  const faviconIco = path.join(outputDir, 'favicon.ico');
  fs.copyFileSync(favicon32, faviconIco);
  console.log('  Created: favicon.ico (from 32x32)');
  
  console.log('Done!');
}

generateIcons().catch(console.error);
