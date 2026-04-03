-- Pre-primary reports: persist holistic JSON per snapshot row; optional distinct text for Good vs Needs Improvement.

ALTER TABLE public.report_snapshot_data
  ADD COLUMN IF NOT EXISTS nursery_skill_performance JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.report_snapshot_data.nursery_skill_performance IS
  'Frozen copy of exam_results.nursery_skill_performance for this subject row (pre-primary strand subjects).';

ALTER TABLE public.nursery_detailed_observation_items
  ADD COLUMN IF NOT EXISTS response_good TEXT,
  ADD COLUMN IF NOT EXISTS response_needs_improvement TEXT;

-- Backfill from response_tries so GOOD and NEEDS_IMPROVEMENT can diverge later without breaking v1.
UPDATE public.nursery_detailed_observation_items
SET
  response_good = COALESCE(response_good, response_tries),
  response_needs_improvement = COALESCE(response_needs_improvement, response_tries)
WHERE response_good IS NULL OR response_needs_improvement IS NULL;
