/**
 * Maps each pre-primary holistic skill_key → one catalogue row in nursery_detailed_observation_items.
 * After migration `20260630200000_pre_primary_nursery_catalog_and_term1_2026_reset.sql`, item_key equals skill_key.
 */

import type { PrePrimaryHolisticGradeEnum } from './prePrimaryHolisticRatings';

/** Catalogue rows use the same key as holistic JSON (`nursery_skill_performance`). */
export const PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY: Record<string, string> = {
  relating_with_others: 'relating_with_others',
  games: 'games',
  helping: 'helping',

  naming: 'naming',
  cleanliness: 'cleanliness',
  caring_for_the_environment: 'caring_for_the_environment',

  taking_care_of_myself: 'taking_care_of_myself',
  toilet_habits: 'toilet_habits',
  body_hygiene: 'body_hygiene',

  reciting_numbers: 'reciting_numbers',
  counting_concepts: 'counting_concepts',
  addition_concepts: 'addition_concepts',

  drawing: 'drawing',
  reading: 'reading',
  writing: 'writing',
};

export const ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS = [
  ...new Set(Object.values(PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY)),
] as string[];

/** Which DB column to read for each stored grade. */
export const PRE_PRIMARY_RATING_TO_RESPONSE_FIELD: Record<
  PrePrimaryHolisticGradeEnum,
  'response_yes' | 'response_good' | 'response_needs_improvement' | 'response_tries' | 'response_never'
> = {
  VERY_GOOD: 'response_yes',
  GOOD: 'response_good',
  NEEDS_IMPROVEMENT: 'response_needs_improvement',
  TRIES: 'response_never',
};

export type NurseryDetailedObservationRow = {
  item_key: string;
  prompt_text: string;
  response_yes: string;
  response_tries: string;
  response_never: string;
  response_good?: string | null;
  response_needs_improvement?: string | null;
};

export function getItemKeyForSkillKey(skillKey: string): string | undefined {
  return PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY[skillKey];
}

export function getResponseTextForGrade(
  row: NurseryDetailedObservationRow,
  grade: PrePrimaryHolisticGradeEnum
): string {
  const field = PRE_PRIMARY_RATING_TO_RESPONSE_FIELD[grade];
  const raw =
    field === 'response_good'
      ? row.response_good ?? row.response_tries
      : field === 'response_needs_improvement'
        ? row.response_needs_improvement ?? row.response_tries
        : field === 'response_yes'
          ? row.response_yes
          : field === 'response_never'
            ? row.response_never
            : row.response_tries;
  return (raw ?? '').trim();
}
