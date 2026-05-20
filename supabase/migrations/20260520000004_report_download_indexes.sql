-- Indexes to speed up report-records page queries.
-- student_pdf_records is a VIEW over published_student_reports — indexes go on the base table.
-- The page always filters by school_id and orders by published_at DESC.
-- Without these, every page load sorts the full result set in memory.
-- APPLIED TO LIVE DB: 2026-05-20

-- ── published_student_reports ─────────────────────────────────────────────────
-- (school_id, published_at DESC): covers the default "all reports for school, newest first"
-- query. Existing idx_published_student_reports_scope starts with school_id but
-- doesn't include published_at, so Postgres still needs a sort step without this.
CREATE INDEX IF NOT EXISTS idx_published_student_reports_school_date
  ON public.published_student_reports (school_id, published_at DESC);

-- ── published_class_report_bundles ────────────────────────────────────────────
-- Same pattern for the class ZIP tab — school_id filter + newest-first sort.
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_school_date
  ON public.published_class_report_bundles (school_id, published_at DESC);
