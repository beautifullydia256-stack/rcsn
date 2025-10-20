-- Recreate processed_primary_exam_results table with correct schema
-- Run this in Supabase SQL Editor

-- Drop the existing table
DROP TABLE IF EXISTS public.processed_primary_exam_results CASCADE;

-- Create the table with the correct schema
CREATE TABLE public.processed_primary_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  exam_set_id UUID NOT NULL REFERENCES public.exam_sets(id) ON DELETE CASCADE,
  
  -- Basic Info
  year INTEGER NOT NULL,
  term TEXT NOT NULL,
  exam_set_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  
  -- Subject Results
  subject TEXT NOT NULL,
  marks_obtained NUMERIC NOT NULL,
  total_marks NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  teacher_remark TEXT,
  teacher_initials TEXT,
  
  -- Class Teacher's Comments (calculated from average of all subjects)
  class_teacher_comment TEXT,
  
  -- Metadata
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  
  UNIQUE(school_id, student_id, exam_set_id, subject)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_school_id ON public.processed_primary_exam_results(school_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_student_id ON public.processed_primary_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_exam_set_id ON public.processed_primary_exam_results(exam_set_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_class_subject ON public.processed_primary_exam_results(class_name, subject);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_year_term ON public.processed_primary_exam_results(year, term);

-- Enable RLS
ALTER TABLE public.processed_primary_exam_results ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for authenticated users
CREATE POLICY "processed_results_allow_all" ON public.processed_primary_exam_results
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Test the table
SELECT 'Table recreated successfully' as info;
