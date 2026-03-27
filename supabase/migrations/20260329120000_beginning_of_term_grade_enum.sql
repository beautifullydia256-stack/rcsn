-- Pre-primary holistic grid: canonical grade literals for nursery_skill_performance JSON.
-- App: src/templates/primary/prePrimaryHolisticRatings.ts
-- Applies to any exam set (BOT, Mid Term, End of Term, …), not only "beginning of term".

-- 1) Upgrade path: old confusing type name from a previous revision of this migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'beginning_of_term_grade'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'pre_primary_holistic_grade'
  ) THEN
    ALTER TYPE public.beginning_of_term_grade RENAME TO pre_primary_holistic_grade;
  END IF;
END $$;

-- 2) Fresh install
DO $$ BEGIN
  CREATE TYPE public.pre_primary_holistic_grade AS ENUM (
    'VERY_GOOD',
    'GOOD',
    'NEEDS_IMPROVEMENT',
    'TRIES'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.pre_primary_holistic_grade IS
  'Pre-primary holistic (colour) ratings; JSON string values in exam_results.nursery_skill_performance per skill key. Legacy rows may use human-readable labels.';

COMMENT ON COLUMN public.exam_results.nursery_skill_performance IS
  'JSON map: skill_key -> VERY_GOOD|GOOD|NEEDS_IMPROVEMENT|TRIES (preferred) or legacy human labels (Very Good, …).';
