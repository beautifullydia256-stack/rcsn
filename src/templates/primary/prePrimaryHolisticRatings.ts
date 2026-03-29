/**
 * Pre-primary holistic performance grid (Baby Class, Middle Class, Top Class).
 * Five strand subjects × three skills = 15 cells; colour-coded ratings.
 * Applies to whatever exam set the teacher selects (BOT, Mid Term, End of Term, etc.).
 *
 * Reference layout: `beginning_of_term_report.reference.html` (static art + oval grades).
 */

import { sanitizeNurseryKey } from './nurseryPerformance';

export type PrePrimaryHolisticSkill = { key: string; label: string };

export type PrePrimaryHolisticStrand = {
  subject: string;
  skills: PrePrimaryHolisticSkill[];
};

/** Stored in `exam_results.nursery_skill_performance` JSON (per skill key). Matches DB enum `pre_primary_holistic_grade`. */
export const PRE_PRIMARY_HOLISTIC_GRADE_ENUMS = ['VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES'] as const;
export type PrePrimaryHolisticGradeEnum = (typeof PRE_PRIMARY_HOLISTIC_GRADE_ENUMS)[number];

/** UI labels (human-readable). */
export type PrePrimaryHolisticRating = 'Very Good' | 'Good' | 'Needs Improvement' | 'Tries';

/** Colours aligned with `beginning_of_term_report.reference.html` (.grade-VERY_GOOD, etc.). */
export const PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM: Record<PrePrimaryHolisticRating, PrePrimaryHolisticGradeEnum> = {
  'Very Good': 'VERY_GOOD',
  Good: 'GOOD',
  'Needs Improvement': 'NEEDS_IMPROVEMENT',
  Tries: 'TRIES',
};

export const PRE_PRIMARY_HOLISTIC_ENUM_TO_LABEL: Record<PrePrimaryHolisticGradeEnum, PrePrimaryHolisticRating> = {
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  TRIES: 'Tries',
};

/** Buttons / legend: label + fill colour (reference HTML). */
export const PRE_PRIMARY_HOLISTIC_RATINGS: ReadonlyArray<{ label: PrePrimaryHolisticRating; color: string }> = [
  { label: 'Very Good', color: '#c0392b' },
  { label: 'Good', color: '#d4ac0d' },
  { label: 'Needs Improvement', color: '#1a7a35' },
  { label: 'Tries', color: '#1a5fa0' },
];

export function prePrimaryHolisticLabelToEnum(label: PrePrimaryHolisticRating): PrePrimaryHolisticGradeEnum {
  return PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM[label];
}

export function prePrimaryHolisticEnumToLabel(e: PrePrimaryHolisticGradeEnum): PrePrimaryHolisticRating {
  return PRE_PRIMARY_HOLISTIC_ENUM_TO_LABEL[e];
}

/** Short keys from the reference HTML `<script>` (for PDF/HTML injection). Maps to canonical skill keys. */
export const PRE_PRIMARY_HOLISTIC_HTML_KEY_TO_SKILL_KEY: Record<string, string> = {
  social: 'relating_with_others',
  games: 'games',
  helping: 'helping',
  language1: 'naming',
  cleanliness: 'cleanliness',
  environment: 'caring_for_the_environment',
  health: 'taking_care_of_myself',
  toilet: 'toilet_habits',
  hygiene: 'body_hygiene',
  math: 'reciting_numbers',
  counting: 'counting_concepts',
  addition: 'addition_concepts',
  language2: 'development_and_using_language',
  reading: 'reading',
  attendance: 'attendance',
};

export const PRE_PRIMARY_HOLISTIC_STRANDS: PrePrimaryHolisticStrand[] = [
  {
    subject: 'Relating with others (Social development)',
    skills: [
      { key: 'relating_with_others', label: 'Relating with others' },
      { key: 'games', label: 'Games' },
      { key: 'helping', label: 'Helping' },
    ],
  },
  {
    subject: 'Relating and knowing my environment (Language I)',
    skills: [
      { key: 'naming', label: 'Naming' },
      { key: 'cleanliness', label: 'Cleanliness' },
      { key: 'caring_for_the_environment', label: 'Caring for the environment' },
    ],
  },
  {
    subject: 'Taking care of myself (Health habits)',
    skills: [
      { key: 'taking_care_of_myself', label: 'Taking care of myself' },
      { key: 'toilet_habits', label: 'Toilet habits' },
      { key: 'body_hygiene', label: 'Body hygiene' },
    ],
  },
  {
    subject: 'Development and using mathematical concepts',
    skills: [
      { key: 'reciting_numbers', label: 'Reciting numbers' },
      { key: 'counting_concepts', label: 'Counting concepts' },
      { key: 'addition_concepts', label: 'Addition concepts' },
    ],
  },
  {
    subject: 'Development and using language (Language II)',
    skills: [
      { key: 'development_and_using_language', label: 'Development and using language' },
      { key: 'reading', label: 'Reading' },
      { key: 'attendance', label: 'Attendance' },
    ],
  },
];

/** Subject strings stored in `exam_results.subject` / `class_subjects.subject`. */
export const ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS = PRE_PRIMARY_HOLISTIC_STRANDS.map((s) => s.subject);

const RATING_ALIASES = new Map<string, PrePrimaryHolisticRating>([
  ['very good', 'Very Good'],
  ['verygood', 'Very Good'],
  ['vg', 'Very Good'],
  ['good', 'Good'],
  ['g', 'Good'],
  ['needs improvement', 'Needs Improvement'],
  ['needsimprovement', 'Needs Improvement'],
  ['ni', 'Needs Improvement'],
  ['tries', 'Tries'],
  ['t', 'Tries'],
]);

const ENUM_STRING_TO_LABEL: Record<string, PrePrimaryHolisticRating> = {
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  TRIES: 'Tries',
};

/** Normalize DB / API value to a display label (accepts enum or legacy human strings). */
export function normalizePrePrimaryHolisticRating(value: unknown): PrePrimaryHolisticRating | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const asEnumKey = raw.toUpperCase().replace(/\s+/g, '_');
  if (asEnumKey in ENUM_STRING_TO_LABEL) {
    return ENUM_STRING_TO_LABEL[asEnumKey];
  }
  const direct = PRE_PRIMARY_HOLISTIC_RATINGS.find((r) => r.label === raw);
  if (direct) return direct.label;
  const collapsed = raw.toLowerCase().replace(/\s+/g, ' ');
  const alias = RATING_ALIASES.get(collapsed.replace(/\s/g, '')) ?? RATING_ALIASES.get(collapsed);
  if (alias) return alias;
  return null;
}

/** For saves: label → enum string stored in JSONB. */
export function prePrimaryHolisticRatingToStoredValue(label: PrePrimaryHolisticRating): PrePrimaryHolisticGradeEnum {
  return prePrimaryHolisticLabelToEnum(label);
}

/** All skill keys (15) for lookups and save payloads. */
export const ALL_PRE_PRIMARY_HOLISTIC_SKILL_KEYS = new Set(
  PRE_PRIMARY_HOLISTIC_STRANDS.flatMap((s) => s.skills.map((sk) => sk.key))
);

export function canonicalizePrePrimaryHolisticSkillKey(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = sanitizeNurseryKey(raw);
  if (!s) return null;
  const rawStr = String(raw).trim();
  for (const strand of PRE_PRIMARY_HOLISTIC_STRANDS) {
    for (const skill of strand.skills) {
      if (skill.key === rawStr || sanitizeNurseryKey(skill.key) === s) return skill.key;
      const labelSan = sanitizeNurseryKey(skill.label);
      if (labelSan === s) return skill.key;
    }
  }
  return null;
}

export function getPrePrimaryHolisticStrandForSubject(subject: string | null | undefined): PrePrimaryHolisticStrand | null {
  const t = (subject || '').trim();
  if (!t) return null;
  return PRE_PRIMARY_HOLISTIC_STRANDS.find((s) => s.subject === t) ?? null;
}

/** Baby / Middle / Top — classes that use the holistic colour grid (not P1–P7). */
export function isPrePrimaryNurseryClass(className: string | null | undefined): boolean {
  const t = String(className || '')
    .trim()
    .toLowerCase();
  return t === 'baby class' || t === 'middle class' || t === 'top class';
}
