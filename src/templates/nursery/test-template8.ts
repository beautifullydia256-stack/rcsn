/**
 * Test Script for Template 8: Detail Colour Marks Report Template
 * 
 * This script generates a sample HTML output for Template 8 to verify
 * the implementation matches the design specifications.
 */

import { generateTemplate8HTML } from './generators';
import { getSampleTemplate8Data } from './sampleData';
import * as fs from 'fs';
import * as path from 'path';

// Generate the HTML
const sampleData = getSampleTemplate8Data();
const html = generateTemplate8HTML(sampleData);

// Write to file
const outputPath = path.join(__dirname, 'template8-test-output.html');
fs.writeFileSync(outputPath, html, 'utf-8');

console.log('✅ Template 8 HTML generated successfully!');
console.log(`📄 Output file: ${outputPath}`);
console.log('\nOpen the file in a browser to preview the template.');
