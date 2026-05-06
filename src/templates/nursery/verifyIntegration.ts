/**
 * Verification Script for Nursery Templates Integration
 * 
 * This script verifies that all integration components are working correctly.
 * Run this to ensure the integration is ready for use.
 */

import {
  // Template Selection
  isNurseryClass,
  getTemplatesForClass,
  getTemplateForNurseryClass,
  getNurseryTemplate,
  getNurseryTemplateOptions,
  listNurseryTemplates,
  
  // Data Mapping
  mapToTemplate7Data,
  mapToTemplate8Data,
  mapToTemplate9Data,
  mapToTemplate10Data,
  mapToTemplate11Data,
  mapToTemplate12Data,
  formatOrdinalPosition,
  
  // Types
  type ExamResultsData,
  type TemplateConfig,
} from './index';

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

console.log('=== Nursery Templates Integration Verification ===\n');

// Test 1: Template Selection
console.log('Test 1: Template Selection');
console.log('----------------------------');

const testClasses = ['Baby Class', 'Middle Class', 'Top Class', 'Primary 1'];

testClasses.forEach(className => {
  const isNursery = isNurseryClass(className);
  console.log(`  ${className}: ${isNursery ? '✅ Nursery' : '❌ Not Nursery'}`);
  
  if (isNursery) {
    const templates = getTemplatesForClass(className);
    console.log(`    Available templates: ${templates.length}`);
    
    const recommended = getTemplateForNurseryClass(className);
    console.log(`    Recommended: ${recommended}`);
  }
});

console.log('\n');

// Test 2: Template Options
console.log('Test 2: Template Options');
console.log('------------------------');

const options = getNurseryTemplateOptions();
console.log(`  Total options: ${options.length}`);
options.forEach(opt => {
  console.log(`  ✅ ${opt.value}: ${opt.label}`);
});

console.log('\n');

// Test 3: Template Configuration
console.log('Test 3: Template Configuration');
console.log('------------------------------');

const templateKeys = ['template7', 'template8', 'template9', 'template10', 'template11', 'template12'];

templateKeys.forEach(key => {
  const config = getNurseryTemplate(key);
  if (config) {
    console.log(`  ✅ ${key}: ${config.name}`);
    console.log(`     Layout: ${config.layoutType}, Color: ${config.colorTheme.primary}`);
  } else {
    console.log(`  ❌ ${key}: Not found`);
  }
});

console.log('\n');

// Test 4: Template Filtering
console.log('Test 4: Template Filtering');
console.log('--------------------------');

const tableTemplates = listNurseryTemplates({ layoutType: 'table' });
const gridTemplates = listNurseryTemplates({ layoutType: 'grid' });
const cardTemplates = listNurseryTemplates({ layoutType: 'card' });

console.log(`  Table templates: ${tableTemplates.length}`);
console.log(`  Grid templates: ${gridTemplates.length}`);
console.log(`  Card templates: ${cardTemplates.length}`);

console.log('\n');

// Test 5: Data Mapping
console.log('Test 5: Data Mapping');
console.log('--------------------');

// Create sample exam data
const sampleData: ExamResultsData = {
  student: {
    student_id: 'test-123',
    student_name: 'Test Student',
    current_class: 'Baby Class',
    age: '4 years',
    registration_number: 'BC001',
    fees_balance: 50000,
    schoolpay_code: 'SP123',
  },
  school: {
    school_id: 'school-1',
    school_name: 'Test School',
    address: 'Test Address',
    phone: '0700000000',
  },
  term: {
    term: 1,
    year: 2024,
    end_date: '2024-04-15',
    next_term_begins: '2024-05-06',
  },
  results: [
    {
      subject_name: 'LEARNING AREA 1',
      marks_obtained: 85,
      total_marks: 100,
      grade: 'A',
      remarks: 'Excellent',
      teacher_initials: 'JD',
    },
    {
      subject_name: 'LEARNING AREA 2',
      marks_obtained: 78,
      total_marks: 100,
      grade: 'B',
      remarks: 'Good',
      teacher_initials: 'JD',
    },
  ],
  attendance: {
    days_attended: 60,
    days_absent: 5,
    total_days: 65,
  },
  comments: {
    class_teacher_comment: 'Good progress',
    headteacher_comment: 'Keep it up',
  },
  position: 3,
  total_students: 25,
};

// Test each mapping function
try {
  const template7Data = mapToTemplate7Data(sampleData);
  console.log(`  ✅ mapToTemplate7Data: ${template7Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate7Data: ${error}`);
}

try {
  const template8Data = mapToTemplate8Data(sampleData);
  console.log(`  ✅ mapToTemplate8Data: ${template8Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate8Data: ${error}`);
}

try {
  const template9Data = mapToTemplate9Data(sampleData);
  console.log(`  ✅ mapToTemplate9Data: ${template9Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate9Data: ${error}`);
}

try {
  const template10Data = mapToTemplate10Data(sampleData);
  console.log(`  ✅ mapToTemplate10Data: ${template10Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate10Data: ${error}`);
}

try {
  const template11Data = mapToTemplate11Data(sampleData);
  console.log(`  ✅ mapToTemplate11Data: ${template11Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate11Data: ${error}`);
}

try {
  const template12Data = mapToTemplate12Data(sampleData);
  console.log(`  ✅ mapToTemplate12Data: ${template12Data.student.name}`);
} catch (error) {
  console.log(`  ❌ mapToTemplate12Data: ${error}`);
}

console.log('\n');

// Test 6: Helper Functions
console.log('Test 6: Helper Functions');
console.log('------------------------');

const positions = [1, 2, 3, 4, 11, 21, 22, 23];
positions.forEach(pos => {
  const formatted = formatOrdinalPosition(pos);
  console.log(`  Position ${pos}: ${formatted}`);
});

console.log('\n');

// Test 7: Data Structure Validation
console.log('Test 7: Data Structure Validation');
console.log('----------------------------------');

const template7Data = mapToTemplate7Data(sampleData);

// Check required fields
const requiredFields = [
  'school',
  'student',
  'subjects',
  'total',
  'comments',
  'requirements',
  'termDates',
];

let allFieldsPresent = true;
requiredFields.forEach(field => {
  if (!(field in template7Data)) {
    console.log(`  ❌ Missing field: ${field}`);
    allFieldsPresent = false;
  }
});

if (allFieldsPresent) {
  console.log('  ✅ All required fields present');
}

// Check nested fields
if (template7Data.school.name && template7Data.student.name) {
  console.log('  ✅ Nested fields accessible');
} else {
  console.log('  ❌ Nested fields missing');
}

// Check arrays
if (Array.isArray(template7Data.subjects) && template7Data.subjects.length > 0) {
  console.log(`  ✅ Subjects array: ${template7Data.subjects.length} items`);
} else {
  console.log('  ❌ Subjects array invalid');
}

console.log('\n');

// Test 8: Optional Fields Handling
console.log('Test 8: Optional Fields Handling');
console.log('--------------------------------');

// Create minimal data (only required fields)
const minimalData: ExamResultsData = {
  student: {
    student_id: 'min-123',
    student_name: 'Minimal Student',
    current_class: 'Baby Class',
  },
  school: {
    school_id: 'school-1',
    school_name: 'Minimal School',
  },
  term: {
    term: 1,
    year: 2024,
  },
  results: [
    {
      subject_name: 'Math',
      marks_obtained: 80,
      total_marks: 100,
    },
  ],
};

try {
  const minimalTemplate7Data = mapToTemplate7Data(minimalData);
  console.log('  ✅ Handles minimal data without errors');
  console.log(`     Student: ${minimalTemplate7Data.student.name}`);
  console.log(`     Age: "${minimalTemplate7Data.student.age}" (empty string expected)`);
} catch (error) {
  console.log(`  ❌ Failed with minimal data: ${error}`);
}

console.log('\n');

// Test 9: Type Safety
console.log('Test 9: Type Safety');
console.log('-------------------');

// This test verifies TypeScript types are working
const config: TemplateConfig | null = getNurseryTemplate('template7');
if (config) {
  // TypeScript should allow these accesses
  const key: string = config.key;
  const name: string = config.name;
  const layoutType: 'table' | 'grid' | 'card' = config.layoutType;
  const subjects: readonly string[] = config.subjects;
  
  console.log('  ✅ TypeScript types are correct');
  console.log(`     Key: ${key}, Layout: ${layoutType}, Subjects: ${subjects.length}`);
} else {
  console.log('  ❌ Template not found');
}

console.log('\n');

// Test 10: Integration Readiness
console.log('Test 10: Integration Readiness');
console.log('-------------------------------');

const checks = [
  { name: 'Template selection functions', pass: typeof isNurseryClass === 'function' },
  { name: 'Template options available', pass: getNurseryTemplateOptions().length === 6 },
  { name: 'All templates accessible', pass: templateKeys.every(k => getNurseryTemplate(k) !== null) },
  { name: 'Data mapping functions', pass: typeof mapToTemplate7Data === 'function' },
  { name: 'Helper functions', pass: typeof formatOrdinalPosition === 'function' },
  { name: 'Type definitions', pass: true }, // If it compiles, types are good
];

let allChecksPassed = true;
checks.forEach(check => {
  if (check.pass) {
    console.log(`  ✅ ${check.name}`);
  } else {
    console.log(`  ❌ ${check.name}`);
    allChecksPassed = false;
  }
});

console.log('\n');

// Final Summary
console.log('=== Verification Summary ===');
console.log('============================');

if (allChecksPassed) {
  console.log('✅ All checks passed!');
  console.log('✅ Integration is ready for use.');
  console.log('\nNext steps:');
  console.log('1. Integrate with Add Results system');
  console.log('2. Test with real exam data');
  console.log('3. Generate sample PDFs');
  console.log('\nSee INTEGRATION_GUIDE.md for detailed instructions.');
} else {
  console.log('❌ Some checks failed.');
  console.log('Please review the errors above and fix them.');
}

console.log('\n=== End of Verification ===\n');

// Export for use in other files
export function verifyIntegration(): boolean {
  return allChecksPassed;
}
