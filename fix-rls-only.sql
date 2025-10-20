-- Fix RLS policies only (skip teacher_comment_rules for now)
-- Run this in Supabase SQL Editor

-- Fix RLS for exam_results to allow access
DROP POLICY IF EXISTS "exam_results_authenticated_access" ON public.exam_results;
CREATE POLICY "exam_results_authenticated_access" ON public.exam_results
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Fix RLS for students to allow access
DROP POLICY IF EXISTS "students_authenticated_access" ON public.students;
CREATE POLICY "students_authenticated_access" ON public.students
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Fix RLS for exam_sets to allow access
DROP POLICY IF EXISTS "exam_sets_authenticated_access" ON public.exam_sets;
CREATE POLICY "exam_sets_authenticated_access" ON public.exam_sets
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Fix RLS for schools to allow access
DROP POLICY IF EXISTS "schools_authenticated_access" ON public.schools;
CREATE POLICY "schools_authenticated_access" ON public.schools
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Fix RLS for processed_primary_exam_results to allow access
DROP POLICY IF EXISTS "processed_primary_exam_results_select_own_school" ON public.processed_primary_exam_results;
CREATE POLICY "processed_primary_exam_results_select_own_school" ON public.processed_primary_exam_results
  FOR SELECT TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

DROP POLICY IF EXISTS "processed_primary_exam_results_all_own_school" ON public.processed_primary_exam_results;
CREATE POLICY "processed_primary_exam_results_all_own_school" ON public.processed_primary_exam_results
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Show what we have now
SELECT 'Schools' as table_name, COUNT(*) as count FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Students', COUNT(*) FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Sets', COUNT(*) FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Results', COUNT(*) FROM exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
