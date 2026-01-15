#!/usr/bin/env node
/**
 * String Resources Generation Script
 * Generates platform-specific string files from master strings.json
 */

const fs = require('fs');
const path = require('path');

const masterStringsPath = path.join(__dirname, '../shared/strings/strings.json');
const masterStrings = JSON.parse(fs.readFileSync(masterStringsPath, 'utf8'));

// Generate Web i18n JSON
function generateWeb() {
  const webStrings = {};
  
  for (const [key, value] of Object.entries(masterStrings)) {
    // Convert {count} to {{count}} for i18next
    webStrings[key] = value.replace(/{(\w+)}/g, '{{$1}}');
  }
  
  const webPath = path.join(__dirname, '../web/locales/he/common.json');
  fs.mkdirSync(path.dirname(webPath), { recursive: true });
  fs.writeFileSync(webPath, JSON.stringify(webStrings, null, 2));
  console.log('✅ Generated Web common.json');
}

// Generate Android strings.xml
function generateAndroid() {
  // This would generate Android strings.xml files
  // For now, we'll skip this as Android is not being implemented yet
  console.log('⏭️  Skipping Android strings.xml (not implemented yet)');
}

// Generate iOS Localizable.strings
function generateIOS() {
  // This would generate iOS Localizable.strings
  // For now, we'll skip this as iOS is not being implemented yet
  console.log('⏭️  Skipping iOS Localizable.strings (not implemented yet)');
}

// Generate all platforms
console.log('Generating string resources...\n');
generateWeb();
generateAndroid();
generateIOS();
console.log('\n✅ All string resources generated successfully!');
