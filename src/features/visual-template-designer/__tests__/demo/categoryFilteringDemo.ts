/**
 * Demonstration of Category-Based Component Filtering
 * 
 * This file demonstrates how the getComponentsForCategory function works
 * for each template category, showing which components are available.
 */

import {
  getComponentsForCategory,
  isComponentAllowedForCategory,
  CATEGORY_COMPONENT_RESTRICTIONS
} from '../../domain/models/categoryRestrictions';
import type { TemplateCategory } from '../../domain/types/enums';

/**
 * Demo: Show all allowed components for each category
 */
export function demonstrateCategoryFiltering() {
  const categories: TemplateCategory[] = [
    'REPORT_CARD',
    'CERTIFICATE',
    'ID_CARD',
    'RECEIPT',
    'FEE_STATEMENT',
    'ADMISSION_FORM',
    'RESULT_SLIP'
  ];

  console.log('=== Category-Based Component Filtering Demo ===\n');

  categories.forEach(category => {
    const allowedComponents = getComponentsForCategory(category);
    console.log(`${category}:`);
    console.log(`  Total components: ${allowedComponents.length}`);
    console.log(`  Components: ${allowedComponents.join(', ')}`);
    console.log('');
  });
}

/**
 * Demo: Check if specific components are allowed for specific categories
 */
export function demonstrateComponentChecking() {
  console.log('=== Component Checking Demo ===\n');

  const testCases = [
    { category: 'ID_CARD' as TemplateCategory, component: 'STUDENT_NAME' as const },
    { category: 'ID_CARD' as TemplateCategory, component: 'RESULTS_TABLE' as const },
    { category: 'REPORT_CARD' as TemplateCategory, component: 'RESULTS_TABLE' as const },
    { category: 'CERTIFICATE' as TemplateCategory, component: 'FEES_BALANCE' as const },
    { category: 'RECEIPT' as TemplateCategory, component: 'PAYMENT_SUMMARY' as const },
  ];

  testCases.forEach(({ category, component }) => {
    const isAllowed = isComponentAllowedForCategory(category, component);
    console.log(`${component} in ${category}: ${isAllowed ? '✓ Allowed' : '✗ Not Allowed'}`);
  });
}

/**
 * Demo: Show the difference between categories
 */
export function demonstrateCategoryDifferences() {
  console.log('\n=== Category Differences Demo ===\n');

  const reportCardComponents = getComponentsForCategory('REPORT_CARD');
  const idCardComponents = getComponentsForCategory('ID_CARD');
  const certificateComponents = getComponentsForCategory('CERTIFICATE');

  console.log(`Report Card has ${reportCardComponents.length} components`);
  console.log(`ID Card has ${idCardComponents.length} components`);
  console.log(`Certificate has ${certificateComponents.length} components`);

  console.log('\nComponents in Report Card but NOT in ID Card:');
  const reportCardOnly = reportCardComponents.filter(c => !idCardComponents.includes(c));
  console.log(`  ${reportCardOnly.join(', ')}`);

  console.log('\nComponents in both Report Card and Certificate:');
  const commonComponents = reportCardComponents.filter(c => certificateComponents.includes(c));
  console.log(`  ${commonComponents.length} common components`);
}

// Run demos if this file is executed directly
if (require.main === module) {
  demonstrateCategoryFiltering();
  demonstrateComponentChecking();
  demonstrateCategoryDifferences();
}
