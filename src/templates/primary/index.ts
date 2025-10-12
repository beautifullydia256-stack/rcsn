// Primary/Nursery School Report Templates Configuration
// These templates are specifically designed for Primary schools (Baby Class - P.7)

export const PRIMARY_TEMPLATES = {
  template1: {
    id: 'primary_template1',
    name: 'Primary Template 1 - Classic',
    description: 'Traditional primary school report format with subjects and comments',
    schoolType: 'Nursery/Primary' as const
  },
  template2: {
    id: 'primary_template2',
    name: 'Primary Template 2 - Modern',
    description: 'Modern layout with visual elements for primary students',
    schoolType: 'Nursery/Primary' as const
  },
  template3: {
    id: 'primary_template3',
    name: 'Primary Template 3 - Detailed',
    description: 'Comprehensive report with detailed teacher comments',
    schoolType: 'Nursery/Primary' as const
  }
};

export type PrimaryTemplateKey = keyof typeof PRIMARY_TEMPLATES;

export const getPrimaryTemplateOptions = () => {
  return Object.entries(PRIMARY_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.name,
    description: value.description
  }));
};

