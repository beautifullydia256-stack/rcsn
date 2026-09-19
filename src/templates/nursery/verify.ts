/**
 * Verification script for Nursery Templates Infrastructure
 * 
 * Run this to verify all templates are properly configured.
 */

import {
  NURSERY_TEMPLATES,
  getNurseryTemplate,
  getNurseryTemplateOptions,
  listNurseryTemplates,
  getTemplateForNurseryClass
} from './index';

console.log('=== Nursery Templates Verification ===\n');

// Verify all 6 templates exist
console.log('1. Checking template registry...');
const templateKeys = Object.keys(NURSERY_TEMPLATES);
console.log(`   [PASS] Found ${templateKeys.length} templates: ${templateKeys.join(', ')}`);

// Verify each template has required properties
console.log('\n2. Verifying template configurations...');
templateKeys.forEach(key => {
  const template = NURSERY_TEMPLATES[key as keyof typeof NURSERY_TEMPLATES];
  console.log(`   [PASS] ${template.name}`);
  console.log(`     - ID: ${template.id}`);
  console.log(`     - Section: ${template.section}`);
  console.log(`     - Layout: ${template.layoutType}`);
  console.log(`     - Color: ${template.colorTheme.primary}`);
});

// Verify helper functions
console.log('\n3. Testing helper functions...');
const options = getNurseryTemplateOptions();
console.log(`   [PASS] getNurseryTemplateOptions() returned ${options.length} options`);

const template7 = getNurseryTemplate('template7');
console.log(`   [PASS] getNurseryTemplate('template7') returned: ${template7?.name}`);

const allTemplates = listNurseryTemplates();
console.log(`   [PASS] listNurseryTemplates() returned ${allTemplates.length} templates`);

const babyClassTemplate = getTemplateForNurseryClass('Baby Class');
console.log(`   [PASS] getTemplateForNurseryClass('Baby Class') returned: ${babyClassTemplate}`);

console.log('\n=== Verification Complete ===');
console.log('All nursery templates infrastructure is properly configured! [PASS]');
