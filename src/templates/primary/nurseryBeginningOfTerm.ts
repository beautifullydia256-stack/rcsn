/**
 * Beginning-of-term holistic grid for Baby Class, Middle Class, Top Class.
 * Matches the 5 subject areas × 3 sub-items layout used on printed report cards.
 */

import { sanitizeNurseryKey } from './nurseryPerformance';

export type BeginningOfTermSkill = { key: string; label: string };

export type BeginningOfTermStrand = {
  subject: string;
  skills: BeginningOfTermSkill[];
};

/** Document key: Very Good, Good, Needs Improvement, Tries (with colours on paper). */
export const BEGINNING_OF_TERM_RATINGS = [
  { label: 'Very Good', color: '#E53935' },
  { label: 'Good', color: '#FDD835' },
  { label: 'Needs Improvement', color: '#43A047' },
  { label: 'Tries', color: '#1E88E5' },
] as const;

export type BeginningOfTermRating = (typeof BEGINNING_OF_TERM_RATINGS)[number]['label'];

export const BEGINNING_OF_TERM_STRANDS: BeginningOfTermStrand[] = [
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
export const ALL_BEGINNING_OF_TERM_STRAND_SUBJECTS = BEGINNING_OF_TERM_STRANDS.map((s) => s.subject);

const RATING_ALIASES = new Map<string, BeginningOfTermRating>([
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

export function normalizeBeginningOfTermRating(value: unknown): BeginningOfTermRating | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const direct = BEGINNING_OF_TERM_RATINGS.find((r) => r.label === raw);
  if (direct) return direct.label;
  const collapsed = raw.toLowerCase().replace(/\s+/g, ' ');
  const alias = RATING_ALIASES.get(collapsed.replace(/\s/g, '')) ?? RATING_ALIASES.get(collapsed);
  if (alias) return alias;
  return null;
}

/** All skill keys (15) for lookups and save payloads. */
export const ALL_BEGINNING_OF_TERM_SKILL_KEYS = new Set(
  BEGINNING_OF_TERM_STRANDS.flatMap((s) => s.skills.map((sk) => sk.key))
);

export function canonicalizeBeginningOfTermSkillKey(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = sanitizeNurseryKey(raw);
  if (!s) return null;
  const rawStr = String(raw).trim();
  for (const strand of BEGINNING_OF_TERM_STRANDS) {
    for (const skill of strand.skills) {
      if (skill.key === rawStr || sanitizeNurseryKey(skill.key) === s) return skill.key;
      const labelSan = sanitizeNurseryKey(skill.label);
      if (labelSan === s) return skill.key;
    }
  }
  return null;
}

export function getBeginningOfTermStrandForSubject(subject: string | null | undefined): BeginningOfTermStrand | null {
  const t = (subject || '').trim();
  if (!t) return null;
  return BEGINNING_OF_TERM_STRANDS.find((s) => s.subject === t) ?? null;
}
