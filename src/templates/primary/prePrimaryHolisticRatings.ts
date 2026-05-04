/**
 * Pre-primary holistic performance grid (Baby Class, Middle Class, Top Class).
 * Strand subjects, skill labels, rating labels, and colours are loaded from the database
 * per school; this module keeps stable grade enums for JSON storage and parsing helpers.
 */

import type { PrePrimaryRatingLevelRow } from '@/lib/prePrimaryHolisticDb';
import { sanitizeNurseryKey } from './nurseryPerformance';

export type PrePrimaryHolisticSkill = { key: string; label: string };

export type PrePrimaryHolisticStrand = {
  subject: string;
  skills: PrePrimaryHolisticSkill[];
};

/** Stored in `exam_results.nursery_skill_performance` JSON (per skill key). */
export const PRE_PRIMARY_HOLISTIC_GRADE_ENUMS = ['VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES'] as const;
export type PrePrimaryHolisticGradeEnum = (typeof PRE_PRIMARY_HOLISTIC_GRADE_ENUMS)[number];

/** @deprecated Prefer school-specific labels from `pre_primary_holistic_rating_levels`. */
export type PrePrimaryHolisticRating = 'Very Good' | 'Good' | 'Needs Improvement' | 'Tries';

/** @deprecated Use DB-driven levels. */
export const PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM: Record<PrePrimaryHolisticRating, PrePrimaryHolisticGradeEnum> = {
  'Very Good': 'VERY_GOOD',
  Good: 'GOOD',
  'Needs Improvement': 'NEEDS_IMPROVEMENT',
  Tries: 'TRIES',
};

/** @deprecated Use `prePrimaryGradeEnumToDisplayLabel` with school levels. */
export const PRE_PRIMARY_HOLISTIC_ENUM_TO_LABEL: Record<PrePrimaryHolisticGradeEnum, PrePrimaryHolisticRating> = {
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  TRIES: 'Tries',
};

/** Fallback legend if config not loaded (matches default seed colours). */
export const FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS: ReadonlyArray<{ label: PrePrimaryHolisticRating; color: string }> = [
  { label: 'Very Good', color: '#c0392b' },
  { label: 'Good', color: '#d4ac0d' },
  { label: 'Needs Improvement', color: '#1a7a35' },
  { label: 'Tries', color: '#1a5fa0' },
];

/** @deprecated Alias of fallback — UI should use `PrePrimaryHolisticRuntimeConfig.ratingLevels`. */
export const PRE_PRIMARY_HOLISTIC_RATINGS = FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS;

const LEGACY_GRADE_TO_LABEL: Record<PrePrimaryHolisticGradeEnum, PrePrimaryHolisticRating> = {
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  TRIES: 'Tries',
};

export function prePrimaryHolisticLabelToEnum(label: PrePrimaryHolisticRating): PrePrimaryHolisticGradeEnum {
  return PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM[label];
}

export function prePrimaryHolisticEnumToLabel(e: PrePrimaryHolisticGradeEnum): PrePrimaryHolisticRating {
  return PRE_PRIMARY_HOLISTIC_ENUM_TO_LABEL[e];
}

export function prePrimaryGradeEnumToDisplayLabel(
  grade: PrePrimaryHolisticGradeEnum,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): string {
  const row = ratingLevels?.find((r) => r.grade_enum === grade);
  if (row) return row.display_label;
  return LEGACY_GRADE_TO_LABEL[grade];
}

export function prePrimaryGradeEnumToColorHex(
  grade: PrePrimaryHolisticGradeEnum,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): string | undefined {
  const row = ratingLevels?.find((r) => r.grade_enum === grade);
  if (row) return row.color_hex;
  const legacy = FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS.find((r) => prePrimaryHolisticLabelToEnum(r.label) === grade);
  return legacy?.color;
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
  language2: 'drawing',
  drawing: 'drawing',
  reading: 'reading',
  writing: 'writing',
  attendance: 'writing',
};

export const PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES: Readonly<Record<string, string>> = {
  attendance: 'writing',
  development_and_using_language: 'drawing',
};

/** Default strands (used only when DB config is missing). */
export const FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS: PrePrimaryHolisticStrand[] = [
  {
    subject: 'Relating with others (Social development)',
    skills: [
      { key: 'relating_with_others', label: 'Relating with others' },
      { key: 'games', label: 'Games' },
      { key: 'helping', label: 'Helping others' },
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
      { key: 'addition_concepts', label: 'Additional concepts' },
    ],
  },
  {
    subject: 'Development and using language (Language II)',
    skills: [
      { key: 'drawing', label: 'Drawing' },
      { key: 'reading', label: 'Reading' },
      { key: 'writing', label: 'Writing' },
    ],
  },
  {
    subject: 'Writing',
    skills: [
      { key: 'writing', label: 'Writing' },
    ],
  },
];

/** @deprecated Prefer DB-backed strands via `fetchPrePrimaryHolisticConfig`. */
export const PRE_PRIMARY_HOLISTIC_STRANDS = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;

export const ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS.map((s) => s.subject);

const RATING_ALIASES = new Map<string, PrePrimaryHolisticGradeEnum>([
  ['very good', 'VERY_GOOD'],
  ['verygood', 'VERY_GOOD'],
  ['vg', 'VERY_GOOD'],
  ['good', 'GOOD'],
  ['g', 'GOOD'],
  ['needs improvement', 'NEEDS_IMPROVEMENT'],
  ['needsimprovement', 'NEEDS_IMPROVEMENT'],
  ['ni', 'NEEDS_IMPROVEMENT'],
  ['tries', 'TRIES'],
  ['t', 'TRIES'],
]);

/**
 * Normalize stored or UI values to a grade enum. Pass `ratingLevels` so custom school labels resolve.
 */
/** Higher = worse outcome (matches SQL `worst_pre_primary_holistic_grade_from_json`). */
const PRE_PRIMARY_GRADE_WORSTNESS: Record<PrePrimaryHolisticGradeEnum, number> = {
  VERY_GOOD: 0,
  GOOD: 1,
  NEEDS_IMPROVEMENT: 2,
  TRIES: 3,
};

export function worstPrePrimaryHolisticGradeFromEnums(
  grades: PrePrimaryHolisticGradeEnum[]
): PrePrimaryHolisticGradeEnum | null {
  if (!grades.length) return null;
  return grades.reduce((worst, g) =>
    PRE_PRIMARY_GRADE_WORSTNESS[g] > PRE_PRIMARY_GRADE_WORSTNESS[worst] ? g : worst
  );
}

/** Worst (lowest) holistic grade from skill-key → stored grade JSON (enums or labels). */
export function worstPrePrimaryHolisticGradeFromPayload(
  payload: Record<string, string>,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): PrePrimaryHolisticGradeEnum | null {
  const enums: PrePrimaryHolisticGradeEnum[] = [];
  for (const v of Object.values(payload)) {
    const g = normalizePrePrimaryHolisticGrade(v, ratingLevels);
    if (g) enums.push(g);
  }
  return worstPrePrimaryHolisticGradeFromEnums(enums);
}

/** Stable tie-break: alphabetically first skill key whose stored grade equals `worst` (matches SQL helper). */
export function firstSkillKeyAtWorstHolisticGrade(
  payload: Record<string, string>,
  worst: PrePrimaryHolisticGradeEnum,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): string | null {
  const keys = Object.keys(payload)
    .filter((k) => normalizePrePrimaryHolisticGrade(payload[k], ratingLevels) === worst)
    .sort();
  return keys[0] ?? null;
}

export function normalizePrePrimaryHolisticGrade(
  value: unknown,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): PrePrimaryHolisticGradeEnum | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const asEnumKey = raw.toUpperCase().replace(/\s+/g, '_');
  if ((PRE_PRIMARY_HOLISTIC_GRADE_ENUMS as readonly string[]).includes(asEnumKey)) {
    return asEnumKey as PrePrimaryHolisticGradeEnum;
  }

  if (ratingLevels?.length) {
    const low = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    const byLabel = ratingLevels.find((r) => r.display_label.trim().toLowerCase() === low);
    if (byLabel) return byLabel.grade_enum;
    const collapsed = low.replace(/\s/g, '');
    const byLabelCollapsed = ratingLevels.find(
      (r) => r.display_label.trim().toLowerCase().replace(/\s/g, '') === collapsed
    );
    if (byLabelCollapsed) return byLabelCollapsed.grade_enum;
  }

  const legacyLabel = raw as PrePrimaryHolisticRating;
  if (legacyLabel in PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM) {
    return PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM[legacyLabel];
  }

  const collapsed = raw.toLowerCase().replace(/\s+/g, ' ');
  const alias = RATING_ALIASES.get(collapsed.replace(/\s/g, '')) ?? RATING_ALIASES.get(collapsed);
  if (alias) return alias;

  return null;
}

/** @deprecated Use `normalizePrePrimaryHolisticGrade` + `prePrimaryGradeEnumToDisplayLabel`. */
export function normalizePrePrimaryHolisticRating(value: unknown): PrePrimaryHolisticRating | null {
  const g = normalizePrePrimaryHolisticGrade(value, null);
  return g ? LEGACY_GRADE_TO_LABEL[g] : null;
}

/** Stored JSON uses grade enums. */
export function prePrimaryHolisticRatingToStoredValue(label: PrePrimaryHolisticRating): PrePrimaryHolisticGradeEnum {
  return prePrimaryHolisticLabelToEnum(label);
}

export function allStrandSubjectsFromStrands(strands: PrePrimaryHolisticStrand[]): string[] {
  return strands.map((s) => s.subject);
}

export function allSkillKeysFromStrands(strands: PrePrimaryHolisticStrand[]): Set<string> {
  return new Set(strands.flatMap((s) => s.skills.map((sk) => sk.key)));
}

/** @deprecated Use `allSkillKeysFromStrands` with DB strands. */
export const ALL_PRE_PRIMARY_HOLISTIC_SKILL_KEYS = new Set(
  FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS.flatMap((s) => s.skills.map((sk) => sk.key))
);

export function canonicalizePrePrimaryHolisticSkillKey(
  raw: unknown,
  strands: PrePrimaryHolisticStrand[] = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS
): string | null {
  if (raw === null || raw === undefined) return null;
  const rawStr = String(raw).trim();
  const legacy = PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES[rawStr];
  if (legacy) return legacy;
  const s = sanitizeNurseryKey(raw);
  if (!s) return null;
  for (const strand of strands) {
    for (const skill of strand.skills) {
      if (skill.key === rawStr || sanitizeNurseryKey(skill.key) === s) return skill.key;
      const labelSan = sanitizeNurseryKey(skill.label);
      if (labelSan === s) return skill.key;
    }
  }
  return null;
}

export function getPrePrimaryHolisticStrandForSubject(
  subject: string | null | undefined,
  strands: PrePrimaryHolisticStrand[] = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS
): PrePrimaryHolisticStrand | null {
  const t = (subject || '').trim();
  if (!t) return null;
  return strands.find((s) => s.subject === t) ?? null;
}

export function isPrePrimaryNurseryClass(className: string | null | undefined): boolean {
  const t = String(className || '')
    .trim()
    .toLowerCase();
  return t === 'baby class' || t === 'middle class' || t === 'top class';
}

export function parsePrePrimaryGradeFromPerformanceJson(
  perf: unknown,
  skillKey: string,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): PrePrimaryHolisticGradeEnum | null {
  if (!perf || typeof perf !== 'object' || Array.isArray(perf)) return null;
  const p = perf as Record<string, unknown>;
  const legacyKey = Object.entries(PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES).find(([, v]) => v === skillKey)?.[0];
  const raw =
    p[skillKey] ??
    (legacyKey ? p[legacyKey] : undefined) ??
    (skillKey === 'writing' ? p.attendance : undefined) ??
    (skillKey === 'drawing' ? p.development_and_using_language : undefined);
  return normalizePrePrimaryHolisticGrade(raw, ratingLevels);
}

export function mergePrePrimaryHolisticFromReportResults(
  results: Array<{ subject?: string; nursery_skill_performance?: unknown }>,
  strands: PrePrimaryHolisticStrand[] = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): Partial<Record<string, PrePrimaryHolisticGradeEnum>> {
  const subjects = new Set(allStrandSubjectsFromStrands(strands));
  const skillKeys = allSkillKeysFromStrands(strands);
  const out: Partial<Record<string, PrePrimaryHolisticGradeEnum>> = {};
  for (const r of results) {
    const subj = (r.subject || '').trim();
    if (!subjects.has(subj)) continue;
    const perf = r.nursery_skill_performance;
    if (!perf || typeof perf !== 'object' || Array.isArray(perf)) continue;
    for (const rawKey of Object.keys(perf as Record<string, unknown>)) {
      const canon = canonicalizePrePrimaryHolisticSkillKey(rawKey, strands);
      if (!canon || !skillKeys.has(canon)) continue;
      const grade = normalizePrePrimaryHolisticGrade((perf as Record<string, unknown>)[rawKey], ratingLevels);
      if (!grade) continue;
      out[canon] = grade;
    }
  }
  return out;
}

export function countPrePrimaryStrandsWithData(
  results: Array<{ subject?: string; nursery_skill_performance?: unknown }>,
  strands: PrePrimaryHolisticStrand[] = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
  ratingLevels?: PrePrimaryRatingLevelRow[] | null
): number {
  let n = 0;
  for (const strand of strands) {
    const row = results.find((r) => (r.subject || '').trim() === strand.subject);
    const perf = row?.nursery_skill_performance;
    if (!perf || typeof perf !== 'object' || Array.isArray(perf)) continue;
    const hasSkill = strand.skills.some(
      (sk) => parsePrePrimaryGradeFromPerformanceJson(perf, sk.key, ratingLevels) != null
    );
    if (hasSkill) n++;
  }
  return n;
}
