// Secondary School Report Templates Configuration
// O-Level: Standard (template1) only for S.3–S.4; S.1–S.2 use Basic/Progressive. template4 = A-Level S.5–S.6.

import { isALevelClass, isOLevelClass, isSenior12Class } from '../../components/reports/templates/helpers';

/** Display names match docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md (canonical names). */
export const SECONDARY_TEMPLATES = {
  template1: {
    id: 'secondary_template1',
    name: 'Standard',
    description:
      'O-1 · O-Level Senior 3–4 only. Spec: standard-template.pdf — ECS-style layout (subjects & topics, activity, formative, exam, grading key).',
    schoolType: 'Secondary' as const
  },
  template2: {
    id: 'secondary_template2',
    name: 'Basic',
    description:
      'O-2 · O-Level S.1–S.4. Spec: basic-template.png — summative grid, KEY TO TERMS, comments (Kasozi-style).',
    schoolType: 'Secondary' as const
  },
  template3: {
    id: 'secondary_template3',
    name: 'Progressive',
    description:
      'O-3 · O-Level S.1–S.4. Spec: progressive-template.png — C1/C2, LO identifier, letter scale (Kyotera-style).',
    schoolType: 'Secondary' as const
  },
  template4: {
    id: 'secondary_template4',
    name: 'Alevel',
    description:
      'A-1 · A-Level S.5–S.6 only. Spec: alevel-template.png — charts, multi-paper table, passes/points.',
    schoolType: 'Secondary' as const
  }
};

export type SecondaryTemplateKey = keyof typeof SECONDARY_TEMPLATES;

/** Which built-in layouts apply for this class (O-Level S.1–S.2: Basic + Progressive only; S.3–S.4: all three). */
export function getSecondaryTemplateKeysForClass(className: string): SecondaryTemplateKey[] {
  const trimmed = (className || '').trim();
  if (isALevelClass(trimmed)) return ['template4'];
  if (isOLevelClass(trimmed)) {
    if (isSenior12Class(trimmed)) return ['template2', 'template3'];
    return ['template1', 'template2', 'template3'];
  }
  return ['template1', 'template2', 'template3', 'template4'];
}

/** Default layout key for SPA + PDF when class is senior secondary. */
export function getDefaultSecondaryTemplateKey(className: string): SecondaryTemplateKey {
  const trimmed = (className || '').trim();
  if (!trimmed) return 'template1';
  if (isALevelClass(trimmed)) return 'template4';
  if (isOLevelClass(trimmed)) {
    return isSenior12Class(trimmed) ? 'template2' : 'template1';
  }
  return 'template1';
}

export const getSecondaryTemplateOptions = () => {
  return Object.entries(SECONDARY_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.name,
    description: value.description
  }));
};

