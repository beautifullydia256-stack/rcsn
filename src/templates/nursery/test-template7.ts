/**
 * Test Template 7 HTML Generation
 * 
 * This script tests the Template 7 HTML generator with sample data.
 */

import { generateTemplate7HTML } from './generators';
import { getSampleTemplate7Data } from './sampleData';
import { writeFileSync } from 'fs';
import { join } from 'path';

console.log('=== Testing Template 7 HTML Generation ===\n');

// Get sample data
const sampleData = getSampleTemplate7Data();
console.log('✓ Sample data loaded');

// Generate HTML
const html = generateTemplate7HTML(sampleData);
console.log('✓ HTML generated successfully');
console.log(`  HTML length: ${html.length} characters`);

// Save to file for inspection
const outputPath = join(__dirname, 'template7-test-output.html');
writeFileSync(outputPath, html, 'utf-8');
console.log(`✓ HTML saved to: ${outputPath}`);

// Verify HTML contains key elements
const checks = [
  { name: 'School name', test: html.includes(sampleData.school.name) },
  { name: 'Student name', test: html.includes(sampleData.student.name) },
  { name: 'Forest green color', test: html.includes('#006b4d') },
  { name: 'Assessment table', test: html.includes('assessment-table') },
  { name: 'Comments section', test: html.includes('comments-section') },
  { name: 'Footer', test: html.includes('footer') }
];

console.log('\n=== HTML Content Verification ===');
checks.forEach(check => {
  const status = check.test ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
});

const allPassed = checks.every(check => check.test);
if (allPassed) {
  console.log('\n✓ All checks passed! Template 7 is working correctly.');
} else {
  console.log('\n✗ Some checks failed. Please review the HTML output.');
}
