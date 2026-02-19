-- ============================================================================
-- PWEZACORE — CURRENT RLS POLICY DEFINITIONS (READ FROM DATABASE)
-- Run in Supabase SQL Editor. Saves the EXACT current policies so we don't
-- break anything when introducing global terms / student status.
-- ============================================================================

-- 1. Full definition of ALL policies on school_terms
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'school_terms';

-- 2. Full definition of ALL policies on students
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'students';

-- 3. One-row summary: policy names and whether they have USING / WITH CHECK
SELECT
  tablename,
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL AND qual <> '' THEN 'YES' ELSE 'NO' END AS has_using,
  CASE WHEN with_check IS NOT NULL AND with_check <> '' THEN 'YES' ELSE 'NO' END AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('school_terms', 'students')
ORDER BY tablename, policyname;
