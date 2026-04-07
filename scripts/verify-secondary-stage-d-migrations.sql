-- Secondary Stage D verification (run on Supabase SQL editor, one section at a time).
-- Expect these applied: 20260526120000_exam_results_line_keys_uace_papers.sql
--                       20260527120000_fix_alevel_upsert_grant_signature.sql (optional idempotent GRANT)

-- -----------------------------------------------------------------------------
-- V1) Unique INDEX on exam_results (line-level key) — expect row: exam_results_exam_student_subject_line_uidx
-- (B1 lists table CONSTRAINTS only; the line key may be a UNIQUE INDEX without a named constraint.)
-- -----------------------------------------------------------------------------
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'exam_results'
  AND indexname LIKE '%line%'
ORDER BY indexname;

-- -----------------------------------------------------------------------------
-- V2) B6 — teacher_upsert_exam_result_secondary overloads (expect paper/topic args on long form)
-- -----------------------------------------------------------------------------
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'teacher_upsert_exam_result_secondary'
ORDER BY args;

-- -----------------------------------------------------------------------------
-- V3) teacher_upsert_exam_result_alevel — expect exactly ONE function with 13 identity args ending in
--     p_paper_number, p_paper_code (or text defaults)
-- -----------------------------------------------------------------------------
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'teacher_upsert_exam_result_alevel'
ORDER BY args;

-- -----------------------------------------------------------------------------
-- V4) school_uace_class_subject_papers exists
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'school_uace_class_subject_papers'
ORDER BY ordinal_position;
