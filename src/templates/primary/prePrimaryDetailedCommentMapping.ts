/**
 * Maps each pre-primary holistic skill_key → one catalogue row in nursery_detailed_observation_items.
 * Review against docs/NURSERY_LEARNING_AREAS_COMMENT_ALIGNMENT.md when changing.
 */

import type { PrePrimaryHolisticGradeEnum } from './prePrimaryHolisticRatings';

/** Verified against migration seed item_key values (20260325100000_nursery_detailed_observation_items.sql). */
export const PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY: Record<string, string> = {
  relating_with_others: 'social_observes_rules',
  games: 'social_loves_class_activities',
  helping: 'social_sympathetic',

  naming: 'env_define_theme_transport',
  cleanliness: 'env_recite_rhymes_alone',
  caring_for_the_environment: 'env_theme_transport',

  taking_care_of_myself: 'phys_interest_class_activities',
  toilet_habits: 'social_calm_toilet_turn',
  body_hygiene: 'phys_handles_materials_care',

  reciting_numbers: 'num_match_recognize',
  counting_concepts: 'num_colors_shapes',
  addition_concepts: 'num_add_1_10',

  development_and_using_language: 'sl_instructions_stories',
  reading: 'read_interpret_sentence',
  attendance: 'sl_questions_answers',
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
