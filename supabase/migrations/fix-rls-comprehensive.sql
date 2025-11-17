-- Comprehensive RLS fix for all tables
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily to test
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_primary_exam_results DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_primary_exam_results ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "schools_authenticated_access" ON public.schools;
DROP POLICY IF EXISTS "students_authenticated_access" ON public.students;
DROP POLICY IF EXISTS "exam_sets_authenticated_access" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_results_authenticated_access" ON public.exam_results;
DROP POLICY IF EXISTS "processed_primary_exam_results_select_own_school" ON public.processed_primary_exam_results;
DROP POLICY IF EXISTS "processed_primary_exam_results_all_own_school" ON public.processed_primary_exam_results;

-- Create new permissive policies for our school
CREATE POLICY "schools_allow_all" ON public.schools
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "students_allow_all" ON public.students
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "exam_sets_allow_all" ON public.exam_sets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "exam_results_allow_all" ON public.exam_results
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "processed_results_allow_all" ON public.processed_primary_exam_results
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Test the fix
SELECT 'Test Results' as info, COUNT(*) as count FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Students', COUNT(*) FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Sets', COUNT(*) FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Results', COUNT(*) FROM exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
