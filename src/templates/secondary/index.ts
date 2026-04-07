// Secondary School Report Templates Configuration
// Class bands: template1–template3 = O-Level S.1–S.4 only; template4 = A-Level S.5–S.6 only.

import { isALevelClass, isOLevelClass } from '../../components/reports/templates/helpers';

export const SECONDARY_TEMPLATES = {
  template1: {
    id: 'secondary_template1',
    name: 'Secondary Template 1 - Standard',
    description:
      'O-Level S.1–S.4 only. Spec: standard-template.pdf — rich ECS-style layout (attendance, multi-page subjects, projects, grading key).',
    schoolType: 'Secondary' as const
  },
  template2: {
    id: 'secondary_template2',
    name: 'Secondary Template 2 - Basic',
    description:
      'O-Level S.1–S.4 only. Spec: basic-template.png — compact summative grid, KEY TO TERMS, comments (e.g. Kasozi-style scan).',
    schoolType: 'Secondary' as const
  },
  template3: {
    id: 'secondary_template3',
    name: 'Progressive',
    description:
      'O-Level S.1–S.4 only. End-of-term progressive report: C1/C2, LO identifier key, letter-grade scale. Spec: progressive-template.png.',
    schoolType: 'Secondary' as const
  },
  template4: {
    id: 'secondary_template4',
    name: 'Alevel',
    description:
      'A-Level S.5–S.6 only (UACE-style). Charts + multi-paper subject table, passes/points, remarks, Zoraki-style QR line. Spec: alevel-template.png. Not for O-Level.',
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

