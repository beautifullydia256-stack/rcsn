-- Compound index for the exam_results_for_secondary_report RPC used on every preview.
-- The RPC filters by (school_id, exam_set_id IN (...), class_name IN (...)).
-- The previous indexes covered school_id+exam_set_id and school_id+class_name separately,
-- forcing Postgres to do an index scan + filter step. This single index covers all three.
-- APPLIED TO LIVE DB: 2026-05-20
CREATE INDEX IF NOT EXISTS idx_exam_results_preview_scope
  ON public.exam_results (school_id, exam_set_id, class_name);
