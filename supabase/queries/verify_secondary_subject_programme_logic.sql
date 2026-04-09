-- READ-ONLY diagnostics: confirm UCE/UACE subject programme objects exist and sample data.
-- Run in Supabase SQL Editor (or psql).
--
-- Pre-test: run section 0 first. Every row should be OK (WARN only where noted — confirm manually).
-- If you see "TABLE MISSING" in section 10/11: apply the migration(s), then re-run from section 10 downward:
--   student_alevel_subjects → supabase/migrations/20260411120000_student_alevel_subjects.sql
--   student_olevel_subjects → supabase/migrations/20260412120000_uce_compulsory_and_student_olevel.sql
-- Or: `supabase db push` from the repo so all pending migrations apply.

-- ══ 0) PRE-TEST HEALTH (one query — paste and run first) ═══════════════════
SELECT check_id, status, detail
FROM (
  SELECT '1_tables_core' AS check_id,
         CASE
           WHEN c = 5 THEN 'OK'
           ELSE 'FAIL'
         END AS status,
         format('found %s of 5 required tables (student_olevel_subjects, student_alevel_subjects, class_subjects, uce_subject_catalog, uace_subject_catalog)', c) AS detail
  FROM (
         SELECT COUNT(*)::int AS c
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN (
                 'student_olevel_subjects',
                 'student_alevel_subjects',
                 'class_subjects',
                 'uce_subject_catalog',
                 'uace_subject_catalog'
               )
       ) t

  UNION ALL
  SELECT '2_functions_rpc',
         CASE
           WHEN c = 4 THEN 'OK'
           ELSE 'FAIL'
         END,
         format('found %s of 4 (save_student_olevel_subjects, validate_student_olevel_subjects_student, student_alevel_subjects_row_guard, current_user_can_edit_student_uace_subjects)', c)
  FROM (
         SELECT COUNT(DISTINCT p.proname)::int AS c
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN (
                 'save_student_olevel_subjects',
                 'validate_student_olevel_subjects_student',
                 'student_alevel_subjects_row_guard',
                 'current_user_can_edit_student_uace_subjects'
               )
       ) f

  UNION ALL
  SELECT '3_trigger_alevel_row_guard',
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM pg_trigger t
             JOIN pg_class c ON c.oid = t.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relname = 'student_alevel_subjects'
               AND NOT t.tgisinternal
               AND t.tgname = 'student_alevel_subjects_row_guard_trg'
           ) THEN 'OK'
           ELSE 'FAIL'
         END,
         'BEFORE INSERT OR UPDATE guard on public.student_alevel_subjects'

  UNION ALL
  SELECT '4_trigger_class_subjects_protect',
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM pg_trigger t
             JOIN pg_class c ON c.oid = t.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relname = 'class_subjects'
               AND NOT t.tgisinternal
               AND t.tgname = 'class_subjects_protect_uace_subsidiaries_trg'
           ) THEN 'OK'
           ELSE 'FAIL'
         END,
         'UCE compulsories + UACE subsidiary protection on public.class_subjects'

  UNION ALL
  SELECT '5_trigger_schools_cascade_hint',
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM pg_trigger t
             JOIN pg_class c ON c.oid = t.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relname = 'schools'
               AND NOT t.tgisinternal
               AND t.tgname = 'schools_mark_cascade_deleting_trg'
           ) THEN 'OK'
           ELSE 'WARN'
         END,
         'Sets GUC so school delete can CASCADE class_subjects; if WARN, school delete may fail against UACE subsidiary rows'

  UNION ALL
  SELECT '6_rls_learner_tables',
         CASE
           WHEN (
             SELECT COUNT(*)::int
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relkind = 'r'
               AND c.relname IN ('student_olevel_subjects', 'student_alevel_subjects')
               AND c.relrowsecurity
           ) = 2 THEN 'OK'
           ELSE 'FAIL'
         END,
         'RLS must be ON for both learner subject tables'

  UNION ALL
  SELECT '7_column_uce_catalog_offering',
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'uce_subject_catalog'
               AND column_name = 'catalog_offering'
           ) THEN 'OK'
           ELSE 'FAIL'
         END,
         'Nationwide compulsory vs subsidiary default for UCE catalog'

  UNION ALL
  SELECT '8_uce_catalog_both_offerings',
         CASE
           WHEN n >= 2 THEN 'OK'
           WHEN n = 1 THEN 'WARN'
           ELSE 'FAIL'
         END,
         format('%s distinct catalog_offering value(s); expect both compulsory and subsidiary', n)
  FROM (
         SELECT COUNT(DISTINCT catalog_offering)::int AS n
         FROM public.uce_subject_catalog
       ) u

  UNION ALL
  SELECT '9_uace_general_paper_subsidiary',
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM public.uace_subject_catalog
             WHERE subject_name ILIKE '%general%paper%'
               AND subject_type = 'subsidiary'
           ) THEN 'OK'
           ELSE 'WARN'
         END,
         'Expected UACE subsidiary row matching General Paper (wording may vary)'

  UNION ALL
  SELECT '10_rpc_execute_save_student_olevel',
         CASE
           WHEN has_function_privilege(
             'authenticated',
             'public.save_student_olevel_subjects(uuid,text[])',
             'execute'
           ) THEN 'OK'
           ELSE 'FAIL'
         END,
         'authenticated must EXECUTE save_student_olevel_subjects(uuid, text[]) for the app'
) checks
ORDER BY check_id;

-- ── 1) TABLES: do the storage + catalog tables exist? ─────────────────────
SELECT '1_tables' AS section, table_name, 'present' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'student_olevel_subjects',
    'student_alevel_subjects',
    'class_subjects',
    'uce_subject_catalog',
    'uace_subject_catalog'
  )
ORDER BY table_name;

-- Expected: 5 rows. Missing any row → that migration was not applied.


-- ── 2) COLUMNS: class_subjects must carry compulsory vs subsidiary ─────────
SELECT '2_class_subjects_columns' AS section, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'class_subjects'
  AND column_name IN ('uce_offering_type', 'is_non_removable_default', 'subject', 'class_name', 'school_id')
ORDER BY column_name;

-- Expected: includes uce_offering_type (text). NULL allowed on old rows until backfilled.


-- ── 3) FUNCTIONS: RPC + validation layer ───────────────────────────────────
SELECT '3_functions' AS section, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'save_student_olevel_subjects',
    'validate_student_olevel_subjects_student',
    'student_alevel_subjects_row_guard',
    'current_user_can_edit_student_uace_subjects'
  )
ORDER BY p.proname;

-- Expected: 4 rows if both UCE learner + UACE migrations ran.


-- ── 4) TRIGGERS: A-Level row guard on insert/update ───────────────────────
SELECT '4_triggers' AS section, tgname AS trigger_name, c.relname AS on_table
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname = 'student_alevel_subjects'
ORDER BY tgname;

-- Expected: at least student_alevel_subjects_row_guard_trg (name may vary slightly).


-- ── 5) COUNTS: how much data you already have ──────────────────────────────
SELECT '5_row_counts' AS section, relname AS table_name, n_live_tup::bigint AS approx_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'student_olevel_subjects',
    'student_alevel_subjects',
    'class_subjects',
    'uce_subject_catalog',
    'uace_subject_catalog'
  )
ORDER BY relname;

-- approx_rows is a statistic (can be off slightly). Zero on learner tables = nobody saved combos yet.


-- ── 6) UACE catalog: General Paper row (subsidiary) ─────────────────────────
SELECT '6_uace_general_paper' AS section, subject_name, subject_type, sort_order
FROM public.uace_subject_catalog
WHERE subject_name ILIKE '%general%paper%'
ORDER BY sort_order;

-- Expected: at least one subsidiary row for General Paper.


-- ── 7) UCE catalog: sample compulsory vs subsidiary ───────────────────────
SELECT '7_uce_catalog_mix' AS section, catalog_offering, count(*) AS n
FROM public.uce_subject_catalog
GROUP BY catalog_offering
ORDER BY catalog_offering;

-- Expected: both compulsory and subsidiary (nationwide defaults).


-- ── 8) CLASS SUBJECTS: Senior 3/4 style classes with uce_offering_type ─────
SELECT '8_class_subjects_olevel' AS section,
       trim(class_name) AS class_name,
       uce_offering_type,
       count(*) AS n_subjects
FROM public.class_subjects
WHERE trim(class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
GROUP BY trim(class_name), uce_offering_type
ORDER BY class_name, uce_offering_type
LIMIT 30;

-- Shows real school rows: compulsory vs subsidiary counts per O-Level class label.
-- Empty result can mean: no Senior1-4 class names match this regex, or no class_subjects yet.


-- ── 9) SAMPLE: one school’s Senior 3/4 subsidiary offerings ────────────────
SELECT '9_subsidiary_offerings_sample' AS section,
       school_id,
       class_name,
       subject
FROM public.class_subjects
WHERE uce_offering_type = 'subsidiary'
  AND trim(class_name) ~* '^(senior\s*[34]|s\.?\s*[34])(\s|$)'
ORDER BY class_name, subject
LIMIT 40;


-- ── 10–11) SAMPLE rows (safe if tables not migrated yet) ─────────────────
-- Uses DO + to_regclass so PostgreSQL never parses FROM a missing table.
DROP TABLE IF EXISTS _diag_subject_samples;
CREATE TEMP TABLE _diag_subject_samples (
  section text NOT NULL,
  student_id uuid,
  n_subjects int,
  principals int,
  subsidiaries int,
  total int,
  note text
);

DO $diag$
BEGIN
  IF to_regclass('public.student_olevel_subjects') IS NOT NULL THEN
    INSERT INTO _diag_subject_samples (section, student_id, n_subjects, note)
    SELECT '10_student_olevel_counts',
           student_id,
           count(*)::int,
           NULL
    FROM public.student_olevel_subjects
    GROUP BY student_id
    ORDER BY count(*) DESC
    LIMIT 15;
  ELSE
    INSERT INTO _diag_subject_samples (section, note)
    VALUES (
      '10_student_olevel_counts',
      'TABLE MISSING — apply 20260412120000_uce_compulsory_and_student_olevel.sql (or supabase db push).'
    );
  END IF;

  IF to_regclass('public.student_alevel_subjects') IS NOT NULL THEN
    INSERT INTO _diag_subject_samples (section, student_id, principals, subsidiaries, total, note)
    SELECT '11_student_alevel_summary',
           student_id,
           count(*) FILTER (WHERE subject_role = 'principal')::int,
           count(*) FILTER (WHERE subject_role = 'subsidiary')::int,
           count(*)::int,
           NULL
    FROM public.student_alevel_subjects
    GROUP BY student_id
    ORDER BY count(*) DESC
    LIMIT 15;
  ELSE
    INSERT INTO _diag_subject_samples (section, note)
    VALUES (
      '11_student_alevel_summary',
      'TABLE MISSING — apply 20260411120000_student_alevel_subjects.sql (or supabase db push).'
    );
  END IF;
END $diag$;

SELECT '10_11_samples' AS batch,
       section,
       student_id,
       n_subjects,
       principals,
       subsidiaries,
       total,
       note
FROM _diag_subject_samples
ORDER BY section, student_id NULLS LAST;
