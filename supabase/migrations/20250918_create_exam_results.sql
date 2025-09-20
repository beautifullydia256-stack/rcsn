-- Create exam_results table
CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    exam_set_id UUID NOT NULL REFERENCES public.exam_sets(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    marks_obtained NUMERIC NOT NULL DEFAULT 0,
    total_marks NUMERIC NOT NULL DEFAULT 100,
    grade TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_results_school_id ON public.exam_results(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_set_id ON public.exam_results(exam_set_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_class_subject ON public.exam_results(class_name, subject);

-- Enable RLS
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users for now
-- Note: School-specific filtering will be handled at the application level
DROP POLICY IF EXISTS "exam_results_authenticated_access" ON public.exam_results;
CREATE POLICY "exam_results_authenticated_access" ON public.exam_results
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_exam_results_updated_at ON public.exam_results;
CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON public.exam_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
