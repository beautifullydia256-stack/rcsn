-- Run in Supabase SQL editor (or psql). Each result grid should show status = OK.
-- If any row shows FAIL, read detail and compare to repo migrations:
--   20260526120000_exam_results_line_keys_uace_papers.sql
--   20260527120000_teacher_upsert_secondary_sync_marks_obtained.sql
--   20260531120000_drop_ambiguous_teacher_upsert_secondary_overload.sql

-- 1) Line-level uniqueness on exam_results (topic/paper lines)
SELECT
  'exam_results line unique index' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'exam_results'
        AND indexname = 'exam_results_exam_student_subject_line_uidx'
    ) THEN 'OK'
    ELSE 'FAIL'
  END AS status,
  COALESCE(
    (SELECT indexdef FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'exam_results'
       AND indexname = 'exam_results_exam_student_subject_line_uidx' LIMIT 1),
    'missing index exam_results_exam_student_subject_line_uidx'
  ) AS detail;

-- 2) Exactly two public overloads for secondary teacher upsert (fixes PGRST203 ambiguity)
SELECT
  'teacher_upsert_exam_result_secondary overload count' AS check_name,
  CASE WHEN cnt = 2 THEN 'OK' ELSE 'FAIL' END AS status,
  format('%s overloads; signatures: %s', cnt, sigs) AS detail
FROM (
  SELECT
    count(*)::int AS cnt,
    string_agg(pg_get_function_identity_arguments(p.oid), ' ;; ' ORDER BY pronargs, pg_get_function_identity_arguments(p.oid)) AS sigs
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'teacher_upsert_exam_result_secondary'
) s;

-- 3) No ambiguous 17-arg uuid teacher overload (must be zero)
SELECT
  'no duplicate 17-arg uuid p_teacher_id (PGRST203)' AS check_name,
  CASE WHEN cnt = 0 THEN 'OK' ELSE 'FAIL' END AS status,
  CASE WHEN cnt = 0 THEN 'none'
       ELSE format('%s still present; run 20260531120000_drop_ambiguous_teacher_upsert_secondary_overload.sql', cnt)
  END AS detail
FROM (
  SELECT count(*)::int AS cnt
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'teacher_upsert_exam_result_secondary'
    AND p.pronargs = 17
    AND pg_get_function_identity_arguments(p.oid) LIKE '%p_teacher_id uuid%'
) x;

-- 4) 17-arg implementation uses text teacher_id (marks_obtained sync RPC)
SELECT
  '17-arg impl has p_teacher_id text' AS check_name,
  CASE WHEN cnt >= 1 THEN 'OK' ELSE 'FAIL' END AS status,
  COALESCE(sig, 'missing 17-arg text teacher function') AS detail
FROM (
  SELECT
    count(*)::int AS cnt,
    max(pg_get_function_identity_arguments(p.oid)) AS sig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'teacher_upsert_exam_result_secondary'
    AND p.pronargs = 17
    AND pg_get_function_identity_arguments(p.oid) LIKE '%p_teacher_id text%'
) sub;

-- 5) A-Level upsert exists (expect one primary signature after Stage D)
SELECT
  'teacher_upsert_exam_result_alevel count' AS check_name,
  CASE WHEN cnt >= 1 THEN 'OK' ELSE 'FAIL' END AS status,
  format('%s overload(s): %s', cnt, sigs) AS detail
FROM (
  SELECT
    count(*)::int AS cnt,
    string_agg(pg_get_function_identity_arguments(p.oid), ' ;; ' ORDER BY pg_get_function_identity_arguments(p.oid)) AS sigs
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'teacher_upsert_exam_result_alevel'
) a;

-- 6) UACE papers config table (expect 10 columns per migration)
SELECT
  'school_uace_class_subject_papers columns' AS check_name,
  CASE WHEN col_count = 10 THEN 'OK' ELSE 'FAIL' END AS status,
  format('%s columns (expect 10)', col_count) AS detail
FROM (
  SELECT count(*)::int AS col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'school_uace_class_subject_papers'
) t;

-- -----------------------------------------------------------------------------
-- All checks in one result grid (same expectations as above; every status should be OK)
-- -----------------------------------------------------------------------------
SELECT * FROM (
  SELECT
    'exam_results line unique index' AS check_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'exam_results'
          AND indexname = 'exam_results_exam_student_subject_line_uidx'
      ) THEN 'OK' ELSE 'FAIL'
    END AS status,
    COALESCE(
      (SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'exam_results'
         AND indexname = 'exam_results_exam_student_subject_line_uidx' LIMIT 1),
      'missing index'
    ) AS detail
  UNION ALL
  SELECT
    'teacher_upsert_exam_result_secondary overload count',
    CASE WHEN cnt = 2 THEN 'OK' ELSE 'FAIL' END,
    format('%s overloads: %s', cnt, sigs)
  FROM (
    SELECT count(*)::int AS cnt,
           string_agg(pg_get_function_identity_arguments(p.oid), ' ;; ' ORDER BY pronargs, pg_get_function_identity_arguments(p.oid)) AS sigs
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'teacher_upsert_exam_result_secondary'
  ) s
  UNION ALL
  SELECT
    'no 17-arg uuid p_teacher_id duplicate',
    CASE WHEN cnt = 0 THEN 'OK' ELSE 'FAIL' END,
    CASE WHEN cnt = 0 THEN 'none' ELSE format('%s bad overload(s)', cnt) END
  FROM (
    SELECT count(*)::int AS cnt
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'teacher_upsert_exam_result_secondary'
      AND p.pronargs = 17
      AND pg_get_function_identity_arguments(p.oid) LIKE '%p_teacher_id uuid%'
  ) x
  UNION ALL
  SELECT
    '17-arg impl p_teacher_id text',
    CASE WHEN cnt >= 1 THEN 'OK' ELSE 'FAIL' END,
    COALESCE(sig, 'missing')
  FROM (
    SELECT count(*)::int AS cnt, max(pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'teacher_upsert_exam_result_secondary'
      AND p.pronargs = 17
      AND pg_get_function_identity_arguments(p.oid) LIKE '%p_teacher_id text%'
  ) sub
  UNION ALL
  SELECT
    'teacher_upsert_exam_result_alevel',
    CASE WHEN cnt >= 1 THEN 'OK' ELSE 'FAIL' END,
    format('%s: %s', cnt, sigs)
  FROM (
    SELECT count(*)::int AS cnt,
           string_agg(pg_get_function_identity_arguments(p.oid), ' ;; ' ORDER BY pg_get_function_identity_arguments(p.oid)) AS sigs
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'teacher_upsert_exam_result_alevel'
  ) a
  UNION ALL
  SELECT
    'school_uace_class_subject_papers columns',
    CASE WHEN col_count = 10 THEN 'OK' ELSE 'FAIL' END,
    format('%s columns', col_count)
  FROM (
    SELECT count(*)::int AS col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_uace_class_subject_papers'
  ) t
) checks
ORDER BY check_name;
