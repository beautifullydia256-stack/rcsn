-- Fix teacher_comment_rules table and RLS issues
-- Run this in Supabase SQL Editor

-- Create teacher_comment_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.teacher_comment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  min_avg NUMERIC NOT NULL,
  max_avg NUMERIC NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_tcr_school_class ON public.teacher_comment_rules(school_id, class_name);

-- Enable RLS
ALTER TABLE public.teacher_comment_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS tcr_select_own_school ON public.teacher_comment_rules;
CREATE POLICY tcr_select_own_school ON public.teacher_comment_rules 
  FOR SELECT TO authenticated 
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

DROP POLICY IF EXISTS tcr_all_own_school ON public.teacher_comment_rules;
CREATE POLICY tcr_all_own_school ON public.teacher_comment_rules 
  FOR ALL TO authenticated 
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Insert sample teacher comment rules
INSERT INTO teacher_comment_rules (school_id, class_name, min_avg, max_avg, comment)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 80, 100, 'Excellent performance! Keep up the good work.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 60, 79, 'Good performance. Continue working hard.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 40, 59, 'Satisfactory performance. More effort needed.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 0, 39, 'Needs more effort. Try harder next time.')
ON CONFLICT DO NOTHING;

-- Also fix RLS for other tables to allow access
DROP POLICY IF EXISTS "exam_results_authenticated_access" ON public.exam_results;
CREATE POLICY "exam_results_authenticated_access" ON public.exam_results
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

DROP POLICY IF EXISTS "students_authenticated_access" ON public.students;
CREATE POLICY "students_authenticated_access" ON public.students
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

DROP POLICY IF EXISTS "exam_sets_authenticated_access" ON public.exam_sets;
CREATE POLICY "exam_sets_authenticated_access" ON public.exam_sets
  FOR ALL TO authenticated
  USING (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
  WITH CHECK (school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

-- Show what we have
SELECT 'Teacher Comment Rules' as table_name, COUNT(*) as count FROM teacher_comment_rules WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Students', COUNT(*) FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Sets', COUNT(*) FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Results', COUNT(*) FROM exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
