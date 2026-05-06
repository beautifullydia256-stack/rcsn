# Nursery Templates Integration Guide

This guide explains how to integrate the 6 nursery report card templates (Templates 7-12) with the Add Results system.

## Overview

The nursery templates are designed to work seamlessly with the existing report generation infrastructure. They follow the same patterns as primary and secondary templates but are specifically optimized for nursery classes (Baby Class, Middle Class, Top Class).

## Template Selection

### Available Templates

All 6 nursery templates are available for all nursery classes:

1. **Template 7**: Junior Nursery Report Template (Simple green-bordered)
2. **Template 8**: Detail Colour Marks Report Template (Skills grid + academic)
3. **Template 9**: Academy Professional Report (Navy blue professional)
4. **Template 10**: Excellent Nursery Clean Template (Split-view with activities)
5. **Template 11**: Simple Nursery Template (Grid-based with watermark)
6. **Template 12**: Modern Nursery Template (Linear progress layout)

### Getting Available Templates

```typescript
import { getTemplatesForClass, isNurseryClass } from '@/templates/nursery';

// Check if a class is a nursery class
const isNursery = isNurseryClass('Baby Class'); // true

// Get all available templates for a class
const availableTemplates = getTemplatesForClass('Baby Class');
// Returns all 6 templates

// Get recommended default template
const defaultTemplate = getTemplateForNurseryClass('Baby Class');
// Returns 'template7'
```

### Template Selection Logic

```typescript
import { 
  getNurseryTemplateOptions, 
  getNurseryTemplate,
  getTemplateForNurseryClass 
} from '@/templates/nursery';

// Get all template options for dropdown
const options = getNurseryTemplateOptions();
// Returns: [{ value: 'template7', label: 'Junior Nursery Report Template', ... }, ...]

// Get specific template configuration
const template = getNurseryTemplate('template7');
// Returns: { key: 'template7', name: '...', colorTheme: {...}, ... }

// Get recommended template for a class
const recommended = getTemplateForNurseryClass('Middle Class');
// Returns: 'template8'
```

## Data Mapping

### Converting Exam Results to Template Data

The `dataMapping.ts` module provides functions to convert database exam results into template-specific data structures:

```typescript
import { 
  mapToTemplate7Data,
  mapToTemplate8Data,
  mapToTemplate9Data,
  mapToTemplate10Data,
  mapToTemplate11Data,
  mapToTemplate12Data,
  type ExamResultsData 
} from '@/templates/nursery';

// Prepare exam results data
const examData: ExamResultsData = {
  student: {
    student_id: '123',
    student_name: 'John Doe',
    current_class: 'Baby Class',
    age: '4 years',
    registration_number: 'BC001',
    photo_url: 'https://...',
    fees_balance: 50000,
    schoolpay_code: 'SP123',
  },
  school: {
    school_id: 'school-1',
    school_name: 'Cindrelinah Junior School',
    address: 'Location Gangu Kimwanyi',
    phone: '0751 230190',
    email: 'info@school.com',
    website: 'www.school.com',
    motto: 'Excellence in Education',
    logo_url: 'https://...',
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
      remarks: 'Excellent performance',
      teacher_initials: 'JD',
    },
    // ... more results
  ],
  attendance: {
    days_attended: 60,
    days_absent: 5,
    total_days: 65,
  },
  comments: {
    class_teacher_comment: 'Good progress this term',
    headteacher_comment: 'Keep up the good work',
    behaviors_comment: 'Well behaved',
  },
  position: 3,
  total_students: 25,
};

// Map to specific template format
const template7Data = mapToTemplate7Data(examData);
const template8Data = mapToTemplate8Data(examData);
const template9Data = mapToTemplate9Data(examData);
// ... etc
```

### Template-Specific Mapping

Each template has unique data requirements:

#### Template 7 (Junior Nursery)
- Simple subject-based assessment
- Learning areas with marks and grades
- Class teacher and headteacher comments

#### Template 8 (Detail Colour Marks)
- Skills assessment grid (24 skills)
- Academic subjects table
- Boarding and day requirements

```typescript
// Template 8 requires skills assessment
const skillsAssessment = [
  { skill: 'Toilet', status: 'Very Good' },
  { skill: 'Recognition of numbers', status: 'Good' },
  // ... 22 more skills
];

const template8Data = mapToTemplate8Data(examData, skillsAssessment);
```

#### Template 9 (Academy Professional)
- Student photo support
- MOT (Mid of Term) and EOT (End of Term) scores
- Grading scale display

#### Template 10 & 12 (Excellent/Modern)
- 5 learning areas with detailed descriptions
- Activities assessment
- Split-view layout

#### Template 11 (Simple)
- Activities-based (not subject-based)
- Central watermark support
- Grid layout for 10 activities

## Integration with Add Results System

### Step 1: Detect Nursery Class

```typescript
import { isNurseryClass } from '@/templates/nursery';

function handleClassSelection(className: string) {
  if (isNurseryClass(className)) {
    // Show nursery template options
    showNurseryTemplateSelector();
  } else {
    // Show primary/secondary template options
    showRegularTemplateSelector();
  }
}
```

### Step 2: Display Template Options

```typescript
import { getNurseryTemplateOptions, getTemplateForNurseryClass } from '@/templates/nursery';

function NurseryTemplateSelector({ className }: { className: string }) {
  const options = getNurseryTemplateOptions();
  const recommended = getTemplateForNurseryClass(className);
  
  return (
    <select defaultValue={recommended}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
          {opt.value === recommended && ' (Recommended)'}
        </option>
      ))}
    </select>
  );
}
```

### Step 3: Generate Report Data

```typescript
import { mapToTemplate7Data, type ExamResultsData } from '@/templates/nursery';

async function generateNurseryReport(
  studentId: string,
  examSetId: string,
  templateKey: string
) {
  // Fetch exam results from database
  const examData = await fetchExamResults(studentId, examSetId);
  
  // Map to appropriate template format
  let templateData;
  switch (templateKey) {
    case 'template7':
      templateData = mapToTemplate7Data(examData);
      break;
    case 'template8':
      templateData = mapToTemplate8Data(examData);
      break;
    // ... other templates
  }
  
  // Generate HTML
  const html = generateTemplateHTML(templateKey, templateData);
  
  // Generate PDF
  const pdf = await generatePDF(html);
  
  return pdf;
}
```

### Step 4: PDF Generation

The nursery templates use the same PDF generation pipeline as existing templates:

```typescript
import { NURSERY_TEMPLATES } from '@/templates/nursery';

function getPdfOptions(templateKey: string) {
  const template = NURSERY_TEMPLATES[templateKey];
  return template.pdfOptions;
}

// Use with Puppeteer
const pdfOptions = getPdfOptions('template7');
const pdf = await page.pdf({
  format: pdfOptions.format,
  margin: pdfOptions.margin,
  printBackground: pdfOptions.printBackground,
  preferCSSPageSize: pdfOptions.preferCSSPageSize,
});
```

## Template Metadata

Each template includes metadata for filtering and display:

```typescript
const template = getNurseryTemplate('template7');

console.log(template.section);      // 'All Nursery'
console.log(template.schoolType);   // 'Nursery/Primary'
console.log(template.layoutType);   // 'table' | 'grid' | 'card'
console.log(template.colorTheme);   // { primary: '#006b4d', ... }
console.log(template.subjects);     // ['LEARNING AREA 1', ...]
```

### Filtering Templates

```typescript
import { listNurseryTemplates } from '@/templates/nursery';

// Get all table-based templates
const tableTemplates = listNurseryTemplates({ layoutType: 'table' });

// Get templates for specific section
const babyClassTemplates = listNurseryTemplates({ section: 'Baby Class' });
// Note: All templates have section 'All Nursery', so this returns all templates
```

## Default Values and Optional Fields

The data mapping functions handle missing data gracefully:

- **Optional fields**: Set to empty strings or default values
- **Missing comments**: Empty strings
- **Missing attendance**: Zeros
- **Missing photos/logos**: Undefined (templates handle gracefully)

```typescript
// Minimal data example
const minimalData: ExamResultsData = {
  student: {
    student_id: '123',
    student_name: 'John Doe',
    current_class: 'Baby Class',
  },
  school: {
    school_id: 'school-1',
    school_name: 'My School',
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

// Mapping functions fill in defaults
const template7Data = mapToTemplate7Data(minimalData);
// Missing fields get sensible defaults
```

## Best Practices

1. **Always check if class is nursery** before showing nursery templates
2. **Provide all 6 templates** as options for flexibility
3. **Use recommended template** as default but allow user choice
4. **Handle missing data** gracefully with defaults
5. **Validate data** before mapping to template format
6. **Cache template configurations** for performance
7. **Test with real data** from your database

## Example: Complete Integration

```typescript
import {
  isNurseryClass,
  getTemplatesForClass,
  getTemplateForNurseryClass,
  getNurseryTemplate,
  mapToTemplate7Data,
  type ExamResultsData,
} from '@/templates/nursery';

async function generateReport(
  className: string,
  studentId: string,
  examSetId: string,
  selectedTemplate?: string
) {
  // Step 1: Check if nursery class
  if (!isNurseryClass(className)) {
    throw new Error('Not a nursery class');
  }
  
  // Step 2: Get available templates
  const availableTemplates = getTemplatesForClass(className);
  
  // Step 3: Determine template to use
  const templateKey = selectedTemplate || getTemplateForNurseryClass(className);
  
  // Step 4: Get template configuration
  const templateConfig = getNurseryTemplate(templateKey);
  if (!templateConfig) {
    throw new Error('Template not found');
  }
  
  // Step 5: Fetch exam data
  const examData: ExamResultsData = await fetchExamData(studentId, examSetId);
  
  // Step 6: Map to template format
  const templateData = mapToTemplate7Data(examData); // Use appropriate mapper
  
  // Step 7: Generate HTML
  const html = generateHTML(templateKey, templateData);
  
  // Step 8: Generate PDF
  const pdf = await generatePDF(html, templateConfig.pdfOptions);
  
  return pdf;
}
```

## Future Enhancements

Potential areas for extension:

1. **Custom template mapping**: Allow schools to customize data mapping
2. **Template themes**: Support custom color themes per school
3. **Additional templates**: Easy to add more templates following the same pattern
4. **Template preview**: Generate preview with sample data
5. **Batch generation**: Generate reports for entire class
6. **Template analytics**: Track which templates are most popular

## Support

For questions or issues with nursery template integration:

1. Check this guide first
2. Review the type definitions in `types.ts`
3. Examine the data mapping functions in `dataMapping.ts`
4. Look at existing primary/secondary template integration patterns
5. Test with the preview system in the Teachers section
