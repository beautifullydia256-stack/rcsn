-- ============================================================================
-- PWEZACORE — AUDIT BEFORE GLOBAL TERMS & STUDENT STATUS
-- Run this in Supabase SQL Editor and keep the results.
-- Do NOT run migrations that change terms/students until you have this output.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CURRENT COLUMNS: public.school_terms
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'school_terms'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- 2. CURRENT COLUMNS: public.students
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- 3. CONSTRAINTS ON public.school_terms
-- ---------------------------------------------------------------------------
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS ref_table,
  ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'school_terms'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ---------------------------------------------------------------------------
-- 4. CONSTRAINTS ON public.students (especially status)
-- ---------------------------------------------------------------------------
SELECT DISTINCT ON (tc.constraint_name)
  tc.constraint_name,
  tc.constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
  AND c.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = tc.table_schema)
WHERE tc.table_schema = 'public' AND tc.table_name = 'students'
ORDER BY tc.constraint_name, tc.constraint_type;

-- ---------------------------------------------------------------------------
-- 5. TABLES THAT REFERENCE school_terms (so we know what breaks if we change it)
-- ---------------------------------------------------------------------------
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS ref_table,
  ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND ccu.table_name = 'school_terms'
ORDER BY tc.table_name;

-- ---------------------------------------------------------------------------
-- 6. CURRENT TERM DATA (counts and sample) — per school
-- ---------------------------------------------------------------------------
SELECT
  st.school_id,
  sc.name AS school_name,
  COUNT(*) AS term_rows,
  MIN(st.year) AS min_year,
  MAX(st.year) AS max_year,
  array_agg(DISTINCT st.term ORDER BY st.term) AS terms_used
FROM public.school_terms st
LEFT JOIN public.schools sc ON sc.school_id = st.school_id
GROUP BY st.school_id, sc.name
ORDER BY sc.name;

-- ---------------------------------------------------------------------------
-- 7. SAMPLE school_terms ROWS (first 15) — to see current column values
-- (If is_current or is_closed missing, run: SELECT * FROM school_terms LIMIT 5; instead)
-- ---------------------------------------------------------------------------
SELECT id, school_id, year, term, start_date, end_date, is_current, created_at
FROM public.school_terms
ORDER BY school_id, year DESC, term DESC
LIMIT 15;

-- ---------------------------------------------------------------------------
-- 8. STUDENT STATUS VALUES IN USE
-- ---------------------------------------------------------------------------
SELECT status, COUNT(*) AS count
FROM public.students
GROUP BY status
ORDER BY count DESC;

-- ---------------------------------------------------------------------------
-- 9. STUDENTS: columns that might overlap with new fields
--    (current_class vs academic_class, status vs enrollment_status)
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
  AND column_name IN ('current_class', 'status', 'graduation_year', 'academic_class', 'academic_year_promoted', 'enrollment_status', 'activation_date')
ORDER BY column_name;

-- ---------------------------------------------------------------------------
-- 10. GLOBAL TERM TABLE? (spec wants central terms — check if it exists)
-- ---------------------------------------------------------------------------
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'global_terms'
) AS global_terms_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'academic_terms'
) AS academic_terms_exists;

-- ---------------------------------------------------------------------------
-- 11. USERS TABLE: super admin / role (for “created by SUPER ADMIN”)
-- ---------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('role', 'school_id', 'user_id')
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- 12. RLS POLICIES ON school_terms and students (names only)
-- ---------------------------------------------------------------------------
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('school_terms', 'students')
ORDER BY tablename, policyname;

-- ============================================================================
-- END OF AUDIT — Save or copy these results before running any new migrations.
-- ============================================================================
