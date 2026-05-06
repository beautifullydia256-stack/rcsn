# Nursery Templates Quick Reference

## Import Statement

```typescript
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
  
  // Types
  type ExamResultsData,
  type TemplateConfig,
  type Template7Data,
  type Template8Data,
  // ... etc
} from '@/templates/nursery';
```

## Common Tasks

### 1. Check if Class is Nursery

```typescript
if (isNurseryClass(className)) {
  // Handle nursery class
}
```

### 2. Get Template Options for Dropdown

```typescript
const options = getNurseryTemplateOptions();
// Returns: [{ value: 'template7', label: 'Junior Nursery...', ... }, ...]
```

### 3. Get Recommended Template

```typescript
const recommended = getTemplateForNurseryClass('Baby Class');
// Returns: 'template7'
```

### 4. Get All Available Templates

```typescript
const templates = getTemplatesForClass('Baby Class');
// Returns: Array of 6 TemplateConfig objects
```

### 5. Get Specific Template Config

```typescript
const config = getNurseryTemplate('template7');
// Returns: TemplateConfig object or null
```

### 6. Map Exam Data to Template Format

```typescript
const examData: ExamResultsData = { /* ... */ };
const template7Data = mapToTemplate7Data(examData);
```

## Template Keys

- `template7` - Junior Nursery Report Template
- `template8` - Detail Colour Marks Report Template
- `template9` - Academy Professional Report
- `template10` - Excellent Nursery Clean Template
- `template11` - Simple Nursery Template
- `template12` - Modern Nursery Template

## Data Structure

### ExamResultsData (Input)

```typescript
{
  student: {
    student_id: string;
    student_name: string;
    current_class: string;
    age?: string;
    registration_number?: string;
    photo_url?: string;
    fees_balance?: number;
    schoolpay_code?: string;
  },
  school: {
    school_id: string;
    school_name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    motto?: string;
    logo_url?: string;
  },
  term: {
    term: number;
    year: number;
    end_date?: string;
    next_term_begins?: string;
  },
  results: Array<{
    subject_name: string;
    marks_obtained: number;
    total_marks: number;
    grade?: string;
    remarks?: string;
    teacher_initials?: string;
  }>,
  attendance?: {
    days_attended: number;
    days_absent: number;
    total_days: number;
  },
  comments?: {
    class_teacher_comment?: string;
    class_teacher_signature?: string;
    headteacher_comment?: string;
    headteacher_signature?: string;
    behaviors_comment?: string;
  },
  position?: number;
  total_students?: number;
}
```

### TemplateConfig (Output)

```typescript
{
  key: string;              // 'template7'
  id: string;               // 'nursery_junior_template'
  name: string;             // 'Junior Nursery Report Template'
  description: string;      // Template description
  section: string;          // 'All Nursery'
  schoolType: string;       // 'Nursery/Primary'
  subjects: string[];       // List of subjects
  colorTheme: {
    primary: string;        // '#006b4d'
    accent?: string;
    secondary?: string;
    text: string;
    border: string;
  },
  layoutType: string;       // 'table' | 'grid' | 'card'
  pdfOptions: {
    format: 'A4';
    margin: { top, right, bottom, left };
    printBackground: boolean;
    preferCSSPageSize: boolean;
  }
}
```

## Complete Example

```typescript
import {
  isNurseryClass,
  getTemplateForNurseryClass,
  getNurseryTemplate,
  mapToTemplate7Data,
  type ExamResultsData,
} from '@/templates/nursery';

async function generateReport(className: string, studentId: string) {
  // 1. Check if nursery class
  if (!isNurseryClass(className)) {
    throw new Error('Not a nursery class');
  }
  
  // 2. Get recommended template
  const templateKey = getTemplateForNurseryClass(className);
  
  // 3. Get template config
  const config = getNurseryTemplate(templateKey);
  
  // 4. Fetch exam data
  const examData: ExamResultsData = await fetchExamData(studentId);
  
  // 5. Map to template format
  const templateData = mapToTemplate7Data(examData);
  
  // 6. Generate HTML
  const html = generateHTML(templateKey, templateData);
  
  // 7. Generate PDF
  const pdf = await generatePDF(html, config.pdfOptions);
  
  return pdf;
}
```

## Template Recommendations

| Class | Recommended | Alternative Options |
|-------|-------------|---------------------|
| Baby Class | Template 7 | All 6 templates available |
| Middle Class | Template 8 | All 6 templates available |
| Top Class | Template 9 | All 6 templates available |

## PDF Options by Template

| Template | Margins | Special Features |
|----------|---------|------------------|
| Template 7 | 10mm | Green borders |
| Template 8 | 8mm | Skills grid, dense layout |
| Template 9 | 12mm | Student photo, watermark |
| Template 10 | 10mm | Split-view, activities grid |
| Template 11 | 10mm | Central watermark |
| Template 12 | 10mm | Achievement scores |

## Error Handling

```typescript
// Check if template exists
const config = getNurseryTemplate(templateKey);
if (!config) {
  throw new Error(`Template ${templateKey} not found`);
}

// Validate nursery class
if (!isNurseryClass(className)) {
  throw new Error(`${className} is not a nursery class`);
}

// Handle missing data
const examData: ExamResultsData = {
  student: { /* required fields */ },
  school: { /* required fields */ },
  term: { /* required fields */ },
  results: [ /* at least one result */ ],
  // Optional fields can be omitted
};
```

## Filtering Templates

```typescript
// Get all table-based templates
const tableTemplates = listNurseryTemplates({ layoutType: 'table' });

// Get all grid-based templates
const gridTemplates = listNurseryTemplates({ layoutType: 'grid' });

// Get all card-based templates
const cardTemplates = listNurseryTemplates({ layoutType: 'card' });
```

## Helper Functions

```typescript
// Format ordinal position
import { formatOrdinalPosition } from '@/templates/nursery';
formatOrdinalPosition(1);  // '1st'
formatOrdinalPosition(2);  // '2nd'
formatOrdinalPosition(3);  // '3rd'
formatOrdinalPosition(4);  // '4th'
```

## Testing

```typescript
// Generate preview with sample data
import { generateTemplatePreview } from '@/templates/nursery/integrationExample';

const preview = generateTemplatePreview('template7');
// Returns: { templateConfig, templateData }
```

## Documentation Files

- **README.md** - Overview and quick start
- **INTEGRATION_GUIDE.md** - Comprehensive integration guide
- **QUICK_REFERENCE.md** - This file
- **integrationExample.ts** - Code examples
- **types.ts** - Type definitions

## Support

For detailed information, see:
1. INTEGRATION_GUIDE.md - Complete integration documentation
2. integrationExample.ts - Working code examples
3. types.ts - Full type definitions with JSDoc
