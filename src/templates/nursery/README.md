# Nursery Report Templates

This directory contains 6 nursery report card templates (Templates 7-12) designed for Baby Class, Middle Class, and Top Class.

## Files

- **`index.ts`** - Main registry and template configuration
- **`types.ts`** - TypeScript type definitions for all template data structures
- **`dataMapping.ts`** - Functions to map exam results data to template formats
- **`INTEGRATION_GUIDE.md`** - Comprehensive integration guide for Add Results system
- **`integrationExample.ts`** - Code examples showing how to use the templates
- **`template7.ts` - `template12.ts`** - Individual template HTML generators
- **`sampleData.ts`** - Sample data generators for template previews

## Quick Start

### 1. Check if a class is a nursery class

```typescript
import { isNurseryClass } from '@/templates/nursery';

if (isNurseryClass('Baby Class')) {
  // Show nursery template options
}
```

### 2. Get available templates

```typescript
import { getTemplatesForClass, getNurseryTemplateOptions } from '@/templates/nursery';

// Get all templates for a class
const templates = getTemplatesForClass('Baby Class'); // Returns all 6 templates

// Get template options for dropdown
const options = getNurseryTemplateOptions();
```

### 3. Get recommended template

```typescript
import { getTemplateForNurseryClass } from '@/templates/nursery';

const recommended = getTemplateForNurseryClass('Baby Class'); // Returns 'template7'
```

### 4. Map exam data to template format

```typescript
import { mapToTemplate7Data, type ExamResultsData } from '@/templates/nursery';

const examData: ExamResultsData = {
  student: { /* ... */ },
  school: { /* ... */ },
  term: { /* ... */ },
  results: [ /* ... */ ],
  // ... other fields
};

const template7Data = mapToTemplate7Data(examData);
```

### 5. Generate report

```typescript
import { getNurseryTemplate } from '@/templates/nursery';

const templateConfig = getNurseryTemplate('template7');
const html = generateHTML(template7Data); // Your HTML generator
const pdf = await generatePDF(html, templateConfig.pdfOptions);
```

## Templates Overview

### Template 7: Junior Nursery Report Template
- **Style**: Simple green-bordered report
- **Layout**: Table-based
- **Best for**: Baby Class
- **Features**: Learning areas assessment, teacher comments

### Template 8: Detail Colour Marks Report Template
- **Style**: Complex with skills grid
- **Layout**: Grid + table hybrid
- **Best for**: Middle Class
- **Features**: 24-skill assessment grid, academic table, requirements section

### Template 9: Academy Professional Report
- **Style**: Modern professional with navy blue theme
- **Layout**: Table-based with student photo
- **Best for**: Top Class
- **Features**: Student photo, MOT/EOT scores, grading scale

### Template 10: Excellent Nursery Clean Template
- **Style**: Split-view design
- **Layout**: 60/40 split (academic/activities)
- **Best for**: All nursery classes
- **Features**: 5 learning areas, 10 activities grid, summary bar

### Template 11: Simple Nursery Template
- **Style**: Grid-based with watermark
- **Layout**: 2x5 activities grid
- **Best for**: All nursery classes
- **Features**: Central watermark, activities-based assessment

### Template 12: Modern Nursery Template
- **Style**: Linear progress layout
- **Layout**: Table-based with achievement focus
- **Best for**: All nursery classes
- **Features**: Achievement scores, position tracking, modern design

## Template Selection Logic

All 6 templates are available for all nursery classes. The system provides recommended defaults:

- **Baby Class** → Template 7 (Junior Nursery)
- **Middle Class** → Template 8 (Detail Colour Marks)
- **Top Class** → Template 9 (Academy Professional)

However, schools can choose any template for any nursery class.

## Data Requirements

### Required Fields
- Student name, class
- School name
- Term, year
- Exam results (subject, marks)

### Optional Fields
- Student photo, age, registration number
- School logo, address, phone, email, website, motto
- Attendance data
- Teacher comments
- Position/ranking
- Fees balance, SchoolPay code

All mapping functions handle missing optional fields gracefully with sensible defaults.

## Integration Points

### 1. Template Selection UI
Use `getNurseryTemplateOptions()` to populate template selector dropdown.

### 2. Data Fetching
Fetch exam results, student info, school info, attendance, and comments from database.

### 3. Data Mapping
Use appropriate `mapToTemplateXData()` function to convert database data to template format.

### 4. HTML Generation
Use template-specific HTML generator functions (template7.ts - template12.ts).

### 5. PDF Generation
Use template's `pdfOptions` configuration with Puppeteer or similar PDF generator.

## PDF Configuration

Each template includes optimized PDF generation settings:

```typescript
{
  format: 'A4',
  margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  printBackground: true,
  preferCSSPageSize: true
}
```

Margins vary by template (8mm - 12mm) to ensure content fits on single A4 page.

## Type Safety

All templates use TypeScript for type safety:

- `Template7Data` - `Template12Data`: Template-specific data structures
- `ExamResultsData`: Database result format
- `TemplateConfig`: Template metadata
- `NurseryTemplateKey`: Template key type

## Testing

Use the preview system in the Teachers section to test templates:

1. Navigate to Dashboard → Teachers → Templates
2. Select a template to preview
3. View with sample data
4. Verify layout and styling

## Documentation

- **INTEGRATION_GUIDE.md**: Comprehensive integration guide
- **integrationExample.ts**: Code examples and patterns
- **types.ts**: Complete type definitions with JSDoc comments

## Support

For questions or issues:

1. Check INTEGRATION_GUIDE.md
2. Review integrationExample.ts for code patterns
3. Examine existing primary/secondary template integration
4. Test with preview system in Teachers section

## Future Enhancements

- Custom color themes per school
- Additional template variations
- Template analytics and usage tracking
- Batch report generation optimization
- Custom data mapping configurations
