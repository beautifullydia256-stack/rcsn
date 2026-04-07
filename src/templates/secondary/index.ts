// Secondary School Report Templates Configuration
// These templates are specifically designed for Secondary schools (S.1 - S.6)

import { isALevelClass, isOLevelClass } from '../../components/reports/templates/helpers';

export const SECONDARY_TEMPLATES = {
  template1: {
    id: 'secondary_template1',
    name: 'Secondary Template 1 - O-Level Format',
    description: 'UCE format for O-Level students (S.1-S.4) with aggregates',
    schoolType: 'Secondary' as const
  },
  template2: {
    id: 'secondary_template2',
    name: 'Secondary Template 2 - Kasozi Style',
    description: 'Professional format with detailed subject analysis',
    schoolType: 'Secondary' as const
  },
  template3: {
    id: 'secondary_template3',
    name: 'Secondary Template 3 - Kyotera Style',
    description: 'Comprehensive report with position and aggregate calculations',
    schoolType: 'Secondary' as const
  },
  template4: {
    id: 'secondary_template4',
    name: 'Secondary Template 4 - A-Level Format',
    description: 'UACE format for A-Level students (S.5-S.6)',
    schoolType: 'Secondary' as const
  }
};

export type SecondaryTemplateKey = keyof typeof SECONDARY_TEMPLATES;

/** Default layout key for SPA + PDF when class is senior secondary. */
export function getDefaultSecondaryTemplateKey(className: string): SecondaryTemplateKey {
  const trimmed = (className || '').trim();
  if (!trimmed) return 'template1';
  if (isALevelClass(trimmed)) return 'template4';
  if (isOLevelClass(trimmed)) return 'template1';
  return 'template1';
}

export const getSecondaryTemplateOptions = () => {
  return Object.entries(SECONDARY_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.name,
    description: value.description
  }));
};

