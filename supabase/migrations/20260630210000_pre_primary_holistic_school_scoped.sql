-- Pre-primary holistic grid: strands, skills, rating labels/colours, and observation sentences
-- are stored per school so each school can edit them. Frontend reads via Supabase; JSON in
-- exam_results still uses stable grade_enum keys (VERY_GOOD, GOOD, NEEDS_IMPROVEMENT, TRIES).

-- ---------------------------------------------------------------------------
-- 1) Strand subjects (must match exam_results.subject for each row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_primary_holistic_strands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  subject text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (school_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_pre_primary_strands_school ON public.pre_primary_holistic_strands (school_id, sort_order);

COMMENT ON TABLE public.pre_primary_holistic_strands IS
  'Pre-primary holistic learning areas; subject text matches class_subjects / exam_results.subject.';

-- ---------------------------------------------------------------------------
-- 2) Skills under each strand (skill_key is stored in nursery_skill_performance JSON)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_primary_holistic_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  strand_id uuid NOT NULL REFERENCES public.pre_primary_holistic_strands(id) ON DELETE CASCADE,
  skill_key text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (school_id, skill_key),
  UNIQUE (strand_id, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_pre_primary_skills_strand ON public.pre_primary_holistic_skills (strand_id, sort_order);

COMMENT ON TABLE public.pre_primary_holistic_skills IS
  'Holistic skills per strand; skill_key is stable in nursery_skill_performance JSON.';

-- ---------------------------------------------------------------------------
-- 3) Rating level display (label + colour per grade enum)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_primary_holistic_rating_levels (
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  grade_enum text NOT NULL CHECK (grade_enum IN ('VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES')),
  display_label text NOT NULL,
  color_hex text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (school_id, grade_enum)
);

COMMENT ON TABLE public.pre_primary_holistic_rating_levels IS
  'UI labels and colours for the four holistic ratings; grade_enum matches JSON storage.';

-- ---------------------------------------------------------------------------
-- 4) nursery_detailed_observation_items: school-scoped catalogue
-- ---------------------------------------------------------------------------
ALTER TABLE public.nursery_detailed_observation_items
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(school_id) ON DELETE CASCADE;

ALTER TABLE public.nursery_detailed_observation_items DROP CONSTRAINT IF EXISTS nursery_detailed_observation_items_item_key_key;

-- Legacy global rows (or old seeds) are replaced by per-school copies.
DELETE FROM public.nursery_detailed_observation_items;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nursery_detailed_obs_school_item
  ON public.nursery_detailed_observation_items (school_id, item_key);

COMMENT ON COLUMN public.nursery_detailed_observation_items.school_id IS
  'Owning school; all comment lines are editable per school. item_key matches skill_key.';

-- ---------------------------------------------------------------------------
-- 5) Seed / backfill (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_pre_primary_holistic_for_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
BEGIN
  SELECT type INTO v_type FROM public.schools WHERE school_id = p_school_id;
  IF v_type IS NULL THEN
    RETURN;
  END IF;
  IF v_type NOT IN ('Primary', 'Nursery/Primary') THEN
    RETURN;
  END IF;

  INSERT INTO public.pre_primary_holistic_strands (school_id, subject, sort_order)
  VALUES
    (p_school_id, 'Relating with others (Social development)', 10),
    (p_school_id, 'Relating and knowing my environment (Language I)', 20),
    (p_school_id, 'Taking care of myself (Health habits)', 30),
    (p_school_id, 'Development and using mathematical concepts', 40),
    (p_school_id, 'Development and using language (Language II)', 50)
  ON CONFLICT (school_id, subject) DO NOTHING;

  INSERT INTO public.pre_primary_holistic_skills (school_id, strand_id, skill_key, label, sort_order)
  SELECT p_school_id, st.id, x.skill_key, x.label, x.ord
  FROM public.pre_primary_holistic_strands st
  INNER JOIN (
    VALUES
      ('Relating with others (Social development)', 10, 'relating_with_others', 'Relating with others'),
      ('Relating with others (Social development)', 20, 'games', 'Games'),
      ('Relating with others (Social development)', 30, 'helping', 'Helping others'),
      ('Relating and knowing my environment (Language I)', 10, 'naming', 'Naming'),
      ('Relating and knowing my environment (Language I)', 20, 'cleanliness', 'Cleanliness'),
      ('Relating and knowing my environment (Language I)', 30, 'caring_for_the_environment', 'Caring for the environment'),
      ('Taking care of myself (Health habits)', 10, 'taking_care_of_myself', 'Taking care of myself'),
      ('Taking care of myself (Health habits)', 20, 'toilet_habits', 'Toilet habits'),
      ('Taking care of myself (Health habits)', 30, 'body_hygiene', 'Body hygiene'),
      ('Development and using mathematical concepts', 10, 'reciting_numbers', 'Reciting numbers'),
      ('Development and using mathematical concepts', 20, 'counting_concepts', 'Counting concepts'),
      ('Development and using mathematical concepts', 30, 'addition_concepts', 'Additional concepts'),
      ('Development and using language (Language II)', 10, 'drawing', 'Drawing'),
      ('Development and using language (Language II)', 20, 'reading', 'Reading'),
      ('Development and using language (Language II)', 30, 'writing', 'Writing')
  ) AS x(subject, ord, skill_key, label)
    ON st.school_id = p_school_id AND st.subject = x.subject
  ON CONFLICT (school_id, skill_key) DO NOTHING;

  INSERT INTO public.pre_primary_holistic_rating_levels (school_id, grade_enum, display_label, color_hex, sort_order)
  VALUES
    (p_school_id, 'VERY_GOOD', 'Very Good', '#c0392b', 1),
    (p_school_id, 'GOOD', 'Good', '#d4ac0d', 2),
    (p_school_id, 'NEEDS_IMPROVEMENT', 'Needs Improvement', '#1a7a35', 3),
    (p_school_id, 'TRIES', 'Tries', '#1a5fa0', 4)
  ON CONFLICT (school_id, grade_enum) DO NOTHING;

  INSERT INTO public.nursery_detailed_observation_items (
    school_id, strand, subsection, sort_order, item_key, prompt_text,
    response_yes, response_tries, response_never, response_good, response_needs_improvement
  )
  VALUES
    (p_school_id, 'social_development', NULL, 10, 'relating_with_others', 'Relating with others',
      'Shows good teamwork. And positive interaction.', 'Works well with others most of the time.', 'Beginning to join in; small steps with the group.',
      'Works well with others most of the time.', 'Still learning to work smoothly with peers; reminders help.'),
    (p_school_id, 'social_development', NULL, 20, 'games', 'Games',
      'Shows excellent participation and teamwork in games.', 'Joins games well; plays fairly most of the time.', 'Starting to take part in games; needs time to settle.',
      'Joins games well; plays fairly most of the time.', 'Joins with encouragement; skills still growing.'),
    (p_school_id, 'social_development', NULL, 30, 'helping', 'Helping others',
      'Helps others willingly and shows care.', 'Often helps classmates; care is growing.', 'Small kind gestures appear; more practice ahead.',
      'Often helps classmates; care is growing.', 'Helps when prompted; habit still forming.'),
    (p_school_id, 'knowing_environment', NULL, 10, 'naming', 'Naming',
      'Identifies and names objects correctly.', 'Names most objects with a little cue.', 'Beginning to name familiar things; praise helps.',
      'Names most objects with a little cue.', 'Names some items; confidence still building.'),
    (p_school_id, 'knowing_environment', NULL, 20, 'cleanliness', 'Cleanliness',
      'Keep self and surroundings clean all times.', 'Usually tidy; odd slip on busy days.', 'Learning tidiness routines; small gains each week.',
      'Usually tidy; odd slip on busy days.', 'Needs gentle reminders; slow steady progress.'),
    (p_school_id, 'knowing_environment', NULL, 30, 'caring_for_the_environment', 'Caring for the environment',
      'Keeps environment clean and tidy.', 'Cares for shared space most of the time.', 'Shows interest; guided practice will help.',
      'Cares for shared space most of the time.', 'Still learning daily care for shared areas.'),
    (p_school_id, 'health_habits', NULL, 10, 'taking_care_of_myself', 'Taking care of myself',
      'Performs simple, independent skills. Like cleaning the nose.', 'Does many self-care tasks with light help.', 'Early self-care steps; celebrate small wins.',
      'Does many self-care tasks with light help.', 'Tries self-care; often still needs adult support.'),
    (p_school_id, 'health_habits', NULL, 20, 'toilet_habits', 'Toilet habits',
      'Take self to the toilet on own.', 'Mostly manages; occasional reminders.', 'Learning independence; patience and habit help.',
      'Mostly manages; occasional reminders.', 'Routine improving; regular prompts still help.'),
    (p_school_id, 'health_habits', NULL, 30, 'body_hygiene', 'Body hygiene',
      'Maintains personal cleanliness.', 'Usually clean; forgets a step now and then.', 'Noticing cleanliness with support; building routine.',
      'Usually clean; forgets a step now and then.', 'Habits forming; gentle follow-ups help.'),
    (p_school_id, 'mathematical_concepts', NULL, 10, 'reciting_numbers', 'Reciting numbers',
      'Can recite all those numbers.', 'Recites most with a starter cue.', 'Beginning to recite familiar numbers; praise helps.',
      'Recites most with a starter cue.', 'Reciting still shaky; short daily practice helps.'),
    (p_school_id, 'mathematical_concepts', NULL, 20, 'counting_concepts', 'Counting concepts',
      'Can match numbers to pictures.', 'Matches well with a cue sometimes.', 'First tries at matching; praise small rights.',
      'Matches well with a cue sometimes.', 'Still learning number–picture links alone.'),
    (p_school_id, 'mathematical_concepts', NULL, 30, 'addition_concepts', 'Additional concepts',
      'Is able to add numbers. From one to 10.', 'Adds with counters or light help.', 'Trying simple adding; confidence growing slowly.',
      'Adds with counters or light help.', 'Addition fuzzy without support; practice will help.'),
    (p_school_id, 'language_development', NULL, 10, 'drawing', 'Drawing',
      'Draws big and self explanatory pictures.', 'Clear pictures most of the time.', 'Enjoys trying; detail comes with time.',
      'Clear pictures most of the time.', 'Pictures still small or unclear; room to grow.'),
    (p_school_id, 'language_development', NULL, 20, 'reading', 'Reading',
      'Can read correct words /sounds.', 'Reads many words/sounds; slips when tired.', 'Beginning to sound out; praise tiny steps.',
      'Reads many words/sounds; slips when tired.', 'Reading building slowly; little reads daily help.'),
    (p_school_id, 'language_development', NULL, 30, 'writing', 'Writing',
      'Can write words / sounds.', 'Writes many words/sounds; spacing uneven.', 'Starting to copy letters; effort shows.',
      'Writes many words/sounds; spacing uneven.', 'Writing still forming; practice and fine-motor help.')
  ON CONFLICT (school_id, item_key) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.seed_pre_primary_holistic_for_school(uuid) IS
  'Idempotent defaults for pre-primary holistic strands, skills, rating UI, and observation sentences.';

-- Backfill existing schools
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT school_id, type FROM public.schools
  LOOP
    IF r.type IN ('Primary', 'Nursery/Primary') THEN
      PERFORM public.seed_pre_primary_holistic_for_school(r.school_id);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.nursery_detailed_observation_items
  ALTER COLUMN school_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6) New school trigger (Primary / Nursery/Primary)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_seed_pre_primary_holistic_new_school()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IN ('Primary', 'Nursery/Primary') THEN
    PERFORM public.seed_pre_primary_holistic_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_seed_pre_primary_holistic ON public.schools;
CREATE TRIGGER trg_schools_seed_pre_primary_holistic
  AFTER INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_pre_primary_holistic_new_school();

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.pre_primary_holistic_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_primary_holistic_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_primary_holistic_rating_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pre_primary_strands_school_rw ON public.pre_primary_holistic_strands;
CREATE POLICY pre_primary_strands_school_rw ON public.pre_primary_holistic_strands
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  );

DROP POLICY IF EXISTS pre_primary_skills_school_rw ON public.pre_primary_holistic_skills;
CREATE POLICY pre_primary_skills_school_rw ON public.pre_primary_holistic_skills
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  );

DROP POLICY IF EXISTS pre_primary_ratings_school_rw ON public.pre_primary_holistic_rating_levels;
CREATE POLICY pre_primary_ratings_school_rw ON public.pre_primary_holistic_rating_levels
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  );

ALTER TABLE public.nursery_detailed_observation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nursery_detailed_obs_school_rw ON public.nursery_detailed_observation_items;
CREATE POLICY nursery_detailed_obs_school_rw ON public.nursery_detailed_observation_items
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  );

COMMENT ON TABLE public.nursery_detailed_observation_items IS
  'Per-school holistic observation sentences; four levels per skill; editable by school staff with RLS.';

SELECT pg_notify('pgrst', 'reload schema');
