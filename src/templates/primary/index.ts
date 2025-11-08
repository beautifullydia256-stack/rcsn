// Primary/Nursery School Report Templates Configuration
// These templates are specifically designed for Primary schools (Baby Class - P.7)
// Each template is designed for a specific section of the primary school

export const PRIMARY_TEMPLATES = {
  template1: {
    id: 'primary_template1',
    name: 'Report For Nursery /Baby Class',
    description: 'Report card designed for Nursery /Baby Class students',
    section: 'Nursery /Baby Class',
    schoolType: 'Nursery/Primary' as const
  },
  template2: {
    id: 'primary_template2',
    name: 'Report for Middle & Top Class',
    description: 'Report card designed for Middle Class and Top Class students',
    section: 'Nursery',
    schoolType: 'Nursery/Primary' as const
  },
  template3: {
    id: 'primary_template3',
    name: 'Report for Lower Section',
    description: 'Report card designed for Lower section students',
    section: 'Lower',
    schoolType: 'Nursery/Primary' as const
  },
  template4: {
    id: 'primary_template4',
    name: 'Report for Upper Section',
    description: 'Report card designed for Upper section students',
    section: 'Upper',
    schoolType: 'Nursery/Primary' as const
  },
  template5: {
    id: 'primary_template5',
    name: 'Clean Report Card',
    description: 'Clean, elegant, and printable A4 report card template',
    section: 'All',
    schoolType: 'Nursery/Primary' as const
  }
};

export type PrimaryTemplateKey = keyof typeof PRIMARY_TEMPLATES;

export const getPrimaryTemplateOptions = () => {
  return Object.entries(PRIMARY_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.name,
    description: value.description,
    section: value.section
  }));
};

// Helper to get template by section
export const getTemplateBySection = (section: 'Nursery /Baby Class' | 'Baby Class' | 'Nursery' | 'Lower' | 'Upper') => {
  return Object.entries(PRIMARY_TEMPLATES).find(([_, template]) => template.section === section)?.[0];
};

// Class-to-Template Mapping for Primary Schools
// This determines which template is automatically selected for each class
export const PRIMARY_CLASS_TEMPLATE_MAPPING: Record<string, string> = {
  // Nursery /Baby Class Section (Template 1)
  'Nursery /Baby Class': 'template1',
  'nursery /baby class': 'template1',
  'NURSERY /BABY CLASS': 'template1',
  // Legacy support for old class names
  'Baby Class': 'template1',
  'baby class': 'template1',
  'BABY CLASS': 'template1',
  'Nursery': 'template1',
  'nursery': 'template1',
  'NURSERY': 'template1',
  
  // Middle & Top Class Section (Template 2)
  'Middle Class': 'template2',
  'middle class': 'template2',
  'MIDDLE CLASS': 'template2',
  'Top Class': 'template2',
  'top class': 'template2',
  'TOP CLASS': 'template2',
  
  // Lower Section (Template 3) - P.1 to P.3
  'Primary 1': 'template3',
  'primary 1': 'template3',
  'PRIMARY 1': 'template3',
  'P.1': 'template3',
  'P1': 'template3',
  'Primary 2': 'template3',
  'primary 2': 'template3',
  'PRIMARY 2': 'template3',
  'P.2': 'template3',
  'P2': 'template3',
  'Primary 3': 'template3',
  'primary 3': 'template3',
  'PRIMARY 3': 'template3',
  'P.3': 'template3',
  'P3': 'template3',
  
  // Upper Section (Template 4) - P.4 to P.7
  'Primary 4': 'template4',
  'primary 4': 'template4',
  'PRIMARY 4': 'template4',
  'P.4': 'template4',
  'P4': 'template4',
  'Primary 5': 'template4',
  'primary 5': 'template4',
  'PRIMARY 5': 'template4',
  'P.5': 'template4',
  'P5': 'template4',
  'Primary 6': 'template4',
  'primary 6': 'template4',
  'PRIMARY 6': 'template4',
  'P.6': 'template4',
  'P6': 'template4',
  'Primary 7': 'template4',
  'primary 7': 'template4',
  'PRIMARY 7': 'template4',
  'P.7': 'template4',
  'P7': 'template4',
};

// Helper function to get recommended template for a class
export const getTemplateForClass = (className: string): string => {
  // Try exact match first
  if (PRIMARY_CLASS_TEMPLATE_MAPPING[className]) {
    return PRIMARY_CLASS_TEMPLATE_MAPPING[className];
  }
  
  // Try case-insensitive match
  const lowerClassName = className.toLowerCase();
  const matchedKey = Object.keys(PRIMARY_CLASS_TEMPLATE_MAPPING).find(
    key => key.toLowerCase() === lowerClassName
  );
  
  if (matchedKey) {
    return PRIMARY_CLASS_TEMPLATE_MAPPING[matchedKey];
  }
  
  // Default to template1 if no match
  return 'template1';
};

// Get section name for a class
export const getSectionForClass = (className: string): string => {
  const template = getTemplateForClass(className);
  const templateData = PRIMARY_TEMPLATES[template as keyof typeof PRIMARY_TEMPLATES];
  return templateData?.section || 'Unknown';
};

