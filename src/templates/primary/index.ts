// Primary/Nursery School Report Templates Configuration
// These templates are specifically designed for Primary schools (Baby Class - P.7)
// Each template is designed for a specific section of the primary school

export const PRIMARY_TEMPLATES = {
  template1: {
    id: 'primary_template1',
    name: 'Report For Baby Class',
    description: 'Report card designed for Baby Class students',
    section: 'Baby Class',
    schoolType: 'Nursery/Primary' as const
  },
  template2: {
    id: 'primary_template2',
    name: 'Report for Nursery Section',
    description: 'Report card designed for Nursery section students',
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
export const getTemplateBySection = (section: 'Baby Class' | 'Nursery' | 'Lower' | 'Upper') => {
  return Object.entries(PRIMARY_TEMPLATES).find(([_, template]) => template.section === section)?.[0];
};

