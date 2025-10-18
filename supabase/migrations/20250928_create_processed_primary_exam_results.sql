-- Create processed primary exam results table
-- This table stores pre-processed exam results data for PDF generation
CREATE TABLE IF NOT EXISTS public.processed_primary_exam_results (
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

-- RLS Policies
DROP POLICY IF EXISTS "processed_primary_exam_results_select_own_school" ON public.processed_primary_exam_results;
CREATE POLICY "processed_primary_exam_results_select_own_school" ON public.processed_primary_exam_results
    FOR SELECT TO authenticated
    USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "processed_primary_exam_results_all_own_school" ON public.processed_primary_exam_results;
CREATE POLICY "processed_primary_exam_results_all_own_school" ON public.processed_primary_exam_results
    FOR ALL TO authenticated
    USING (school_id = public.current_school_id())
    WITH CHECK (school_id = public.current_school_id());

-- Add comments for documentation
COMMENT ON TABLE public.processed_primary_exam_results IS 'Pre-processed exam results data for primary school PDF generation';
COMMENT ON COLUMN public.processed_primary_exam_results.class_teacher_comment IS 'Comment based on average performance across all subjects';
COMMENT ON COLUMN public.processed_primary_exam_results.teacher_remark IS 'Remark from Teacher''s Remarks Settings based on percentage';
