/**
 * Default teacher remark lines per skill and holistic outcome — matches
 * docs/PRE_PRIMARY_NURSERY_STRAND_AND_SKILL_SPEC.md (report-card wording).
 * Teachers can override via Teacher's Remarks Settings (stored per school).
 */

import type { PrePrimaryHolisticGradeEnum } from './prePrimaryHolisticRatings';

export const DEFAULT_SKILL_TEACHER_REMARKS: Record<
  string,
  Record<PrePrimaryHolisticGradeEnum, string>
> = {
  relating_with_others: {
    VERY_GOOD: 'Shows good teamwork. And positive interaction.',
    GOOD: 'Works well with others most of the time.',
    NEEDS_IMPROVEMENT: 'Still learning to work smoothly with peers; reminders help.',
    TRIES: 'Beginning to join in; small steps with the group.',
  },
  games: {
    VERY_GOOD: 'Shows excellent participation and teamwork in games.',
    GOOD: 'Joins games well; plays fairly most of the time.',
    NEEDS_IMPROVEMENT: 'Joins with encouragement; skills still growing.',
    TRIES: 'Starting to take part in games; needs time to settle.',
  },
  helping: {
    VERY_GOOD: 'Helps others willingly and shows care.',
    GOOD: 'Often helps classmates; care is growing.',
    NEEDS_IMPROVEMENT: 'Helps when prompted; habit still forming.',
    TRIES: 'Small kind gestures appear; more practice ahead.',
  },
  naming: {
    VERY_GOOD: 'Identifies and names objects correctly.',
    GOOD: 'Names most objects with a little cue.',
    NEEDS_IMPROVEMENT: 'Names some items; confidence still building.',
    TRIES: 'Beginning to name familiar things; praise helps.',
  },
  cleanliness: {
    VERY_GOOD: 'Keep self and surroundings clean all times.',
    GOOD: 'Usually tidy; odd slip on busy days.',
    NEEDS_IMPROVEMENT: 'Needs gentle reminders; slow steady progress.',
    TRIES: 'Learning tidiness routines; small gains each week.',
  },
  caring_for_the_environment: {
    VERY_GOOD: 'Keeps environment clean and tidy.',
    GOOD: 'Cares for shared space most of the time.',
    NEEDS_IMPROVEMENT: 'Still learning daily care for shared areas.',
    TRIES: 'Shows interest; guided practice will help.',
  },
  taking_care_of_myself: {
    VERY_GOOD: 'Performs simple, independent skills. Like cleaning the nose.',
    GOOD: 'Does many self-care tasks with light help.',
    NEEDS_IMPROVEMENT: 'Tries self-care; often still needs adult support.',
    TRIES: 'Early self-care steps; celebrate small wins.',
  },
  toilet_habits: {
    VERY_GOOD: 'Take self to the toilet on own.',
    GOOD: 'Mostly manages; occasional reminders.',
    NEEDS_IMPROVEMENT: 'Routine improving; regular prompts still help.',
    TRIES: 'Learning independence; patience and habit help.',
  },
  body_hygiene: {
    VERY_GOOD: 'Maintains personal cleanliness.',
    GOOD: 'Usually clean; forgets a step now and then.',
    NEEDS_IMPROVEMENT: 'Habits forming; gentle follow-ups help.',
    TRIES: 'Noticing cleanliness with support; building routine.',
  },
  reciting_numbers: {
    VERY_GOOD: 'Can recite all those numbers.',
    GOOD: 'Recites most with a starter cue.',
    NEEDS_IMPROVEMENT: 'Reciting still shaky; short daily practice helps.',
    TRIES: 'Beginning to recite familiar numbers; praise helps.',
  },
  counting_concepts: {
    VERY_GOOD: 'Can match numbers to pictures.',
    GOOD: 'Matches well with a cue sometimes.',
    NEEDS_IMPROVEMENT: 'Still learning number–picture links alone.',
    TRIES: 'First tries at matching; praise small rights.',
  },
  addition_concepts: {
    VERY_GOOD: 'Is able to add numbers. From one to 10.',
    GOOD: 'Adds with counters or light help.',
    NEEDS_IMPROVEMENT: 'Addition fuzzy without support; practice will help.',
    TRIES: 'Trying simple adding; confidence growing slowly.',
  },
  drawing: {
    VERY_GOOD: 'Draws big and self explanatory pictures.',
    GOOD: 'Clear pictures most of the time.',
    NEEDS_IMPROVEMENT: 'Pictures still small or unclear; room to grow.',
    TRIES: 'Enjoys trying; detail comes with time.',
  },
  reading: {
    VERY_GOOD: 'Can read correct words /sounds.',
    GOOD: 'Reads many words/sounds; slips when tired.',
    NEEDS_IMPROVEMENT: 'Reading building slowly; little reads daily help.',
    TRIES: 'Beginning to sound out; praise tiny steps.',
  },
  writing: {
    VERY_GOOD: 'Can write words / sounds.',
    GOOD: 'Writes many words/sounds; spacing uneven.',
    NEEDS_IMPROVEMENT: 'Writing still forming; practice and fine-motor help.',
    TRIES: 'Starting to copy letters; effort shows.',
  },
};

export function defaultTeacherRemarkForSkill(
  skillKey: string,
  grade: PrePrimaryHolisticGradeEnum
): string {
  const block = DEFAULT_SKILL_TEACHER_REMARKS[skillKey];
  return block?.[grade] ?? '';
}
