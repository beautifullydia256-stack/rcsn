-- Pre-primary (Baby / Middle / Top): replace global nursery observation catalogue with the
-- 15-skill spec (PRE_PRIMARY_NURSERY_STRAND_AND_SKILL_SPEC.md) and clear Term 1 2026
-- nursery exam / snapshot artefacts that still reference the old skill/comment model.
--
-- Data effects: DELETE (not TRUNCATE) scoped rows only; remote DBs should be reviewed before apply.

BEGIN;

-- Some hosted DBs never received 20260330120000_snapshot_and_observation_text_columns.sql; ensure columns exist.
ALTER TABLE public.nursery_detailed_observation_items
  ADD COLUMN IF NOT EXISTS response_good TEXT,
  ADD COLUMN IF NOT EXISTS response_needs_improvement TEXT;

-- ---------------------------------------------------------------------------
-- 1) Report snapshots: remove generated PDF cache + frozen rows for nursery classes, Term 1 2026
-- ---------------------------------------------------------------------------
WITH nursery_snap_rows AS (
  SELECT rsd.snapshot_id, rsd.student_id
  FROM public.report_snapshot_data rsd
  INNER JOIN public.report_snapshots rs ON rs.id = rsd.snapshot_id
  WHERE rs.year = 2026
    AND rs.term = 1
    AND lower(trim(rsd.class_name)) IN ('baby class', 'middle class', 'top class')
)
DELETE FROM public.generated_reports gr
USING nursery_snap_rows n
WHERE gr.snapshot_id = n.snapshot_id
  AND gr.student_id = n.student_id;

DELETE FROM public.report_snapshot_data rsd
USING public.report_snapshots rs
WHERE rsd.snapshot_id = rs.id
  AND rs.year = 2026
  AND rs.term = 1
  AND lower(trim(rsd.class_name)) IN ('baby class', 'middle class', 'top class');

-- ---------------------------------------------------------------------------
-- 2) Source + processed exam rows (holistic grid + remarks) for same scope
-- ---------------------------------------------------------------------------
DELETE FROM public.exam_results er
USING public.exam_sets es
WHERE er.exam_set_id = es.id
  AND es.year = 2026
  AND es.term = 1
  AND lower(trim(er.class_name)) IN ('baby class', 'middle class', 'top class');

DELETE FROM public.processed_primary_exam_results ppr
WHERE ppr.year = 2026
  AND (
    trim(both from ppr.term) = '1'
    OR lower(trim(both from ppr.term)) IN ('term 1', 'term1')
  )
  AND lower(trim(ppr.class_name)) IN ('baby class', 'middle class', 'top class');

-- ---------------------------------------------------------------------------
-- 3) Global observation catalogue: single 15-row set; item_key == holistic skill_key
-- ---------------------------------------------------------------------------
DELETE FROM public.nursery_detailed_observation_items;

INSERT INTO public.nursery_detailed_observation_items (
  strand,
  subsection,
  sort_order,
  item_key,
  prompt_text,
  response_yes,
  response_tries,
  response_never,
  response_good,
  response_needs_improvement
)
VALUES
  (
    'social_development',
    NULL,
    10,
    'relating_with_others',
    'Relating with others',
    'Shows good teamwork. And positive interaction.',
    'Works well with others most of the time.',
    'Beginning to join in; small steps with the group.',
    'Works well with others most of the time.',
    'Still learning to work smoothly with peers; reminders help.'
  ),
  (
    'social_development',
    NULL,
    20,
    'games',
    'Games',
    'Shows excellent participation and teamwork in games.',
    'Joins games well; plays fairly most of the time.',
    'Starting to take part in games; needs time to settle.',
    'Joins games well; plays fairly most of the time.',
    'Joins with encouragement; skills still growing.'
  ),
  (
    'social_development',
    NULL,
    30,
    'helping',
    'Helping others',
    'Helps others willingly and shows care.',
    'Often helps classmates; care is growing.',
    'Small kind gestures appear; more practice ahead.',
    'Often helps classmates; care is growing.',
    'Helps when prompted; habit still forming.'
  ),
  (
    'knowing_environment',
    NULL,
    10,
    'naming',
    'Naming',
    'Identifies and names objects correctly.',
    'Names most objects with a little cue.',
    'Beginning to name familiar things; praise helps.',
    'Names most objects with a little cue.',
    'Names some items; confidence still building.'
  ),
  (
    'knowing_environment',
    NULL,
    20,
    'cleanliness',
    'Cleanliness',
    'Keep self and surroundings clean all times.',
    'Usually tidy; odd slip on busy days.',
    'Learning tidiness routines; small gains each week.',
    'Usually tidy; odd slip on busy days.',
    'Needs gentle reminders; slow steady progress.'
  ),
  (
    'knowing_environment',
    NULL,
    30,
    'caring_for_the_environment',
    'Caring for the environment',
    'Keeps environment clean and tidy.',
    'Cares for shared space most of the time.',
    'Shows interest; guided practice will help.',
    'Cares for shared space most of the time.',
    'Still learning daily care for shared areas.'
  ),
  (
    'health_habits',
    NULL,
    10,
    'taking_care_of_myself',
    'Taking care of myself',
    'Performs simple, independent skills. Like cleaning the nose.',
    'Does many self-care tasks with light help.',
    'Early self-care steps; celebrate small wins.',
    'Does many self-care tasks with light help.',
    'Tries self-care; often still needs adult support.'
  ),
  (
    'health_habits',
    NULL,
    20,
    'toilet_habits',
    'Toilet habits',
    'Take self to the toilet on own.',
    'Mostly manages; occasional reminders.',
    'Learning independence; patience and habit help.',
    'Mostly manages; occasional reminders.',
    'Routine improving; regular prompts still help.'
  ),
  (
    'health_habits',
    NULL,
    30,
    'body_hygiene',
    'Body hygiene',
    'Maintains personal cleanliness.',
    'Usually clean; forgets a step now and then.',
    'Noticing cleanliness with support; building routine.',
    'Usually clean; forgets a step now and then.',
    'Habits forming; gentle follow-ups help.'
  ),
  (
    'mathematical_concepts',
    NULL,
    10,
    'reciting_numbers',
    'Reciting numbers',
    'Can recite all those numbers.',
    'Recites most with a starter cue.',
    'Beginning to recite familiar numbers; praise helps.',
    'Recites most with a starter cue.',
    'Reciting still shaky; short daily practice helps.'
  ),
  (
    'mathematical_concepts',
    NULL,
    20,
    'counting_concepts',
    'Counting concepts',
    'Can match numbers to pictures.',
    'Matches well with a cue sometimes.',
    'First tries at matching; praise small rights.',
    'Matches well with a cue sometimes.',
    'Still learning number–picture links alone.'
  ),
  (
    'mathematical_concepts',
    NULL,
    30,
    'addition_concepts',
    'Additional concepts',
    'Is able to add numbers. From one to 10.',
    'Adds with counters or light help.',
    'Trying simple adding; confidence growing slowly.',
    'Adds with counters or light help.',
    'Addition fuzzy without support; practice will help.'
  ),
  (
    'language_development',
    NULL,
    10,
    'drawing',
    'Drawing',
    'Draws big and self explanatory pictures.',
    'Clear pictures most of the time.',
    'Enjoys trying; detail comes with time.',
    'Clear pictures most of the time.',
    'Pictures still small or unclear; room to grow.'
  ),
  (
    'language_development',
    NULL,
    20,
    'reading',
    'Reading',
    'Can read correct words /sounds.',
    'Reads many words/sounds; slips when tired.',
    'Beginning to sound out; praise tiny steps.',
    'Reads many words/sounds; slips when tired.',
    'Reading building slowly; little reads daily help.'
  ),
  (
    'language_development',
    NULL,
    30,
    'writing',
    'Writing',
    'Can write words / sounds.',
    'Writes many words/sounds; spacing uneven.',
    'Starting to copy letters; effort shows.',
    'Writes many words/sounds; spacing uneven.',
    'Writing still forming; practice and fine-motor help.'
  );

COMMENT ON TABLE public.nursery_detailed_observation_items IS
  'Pre-primary holistic: 15 skills; item_key matches exam_results.nursery_skill_performance keys; four comment levels per skill.';

COMMIT;
