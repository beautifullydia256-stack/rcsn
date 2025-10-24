-- Add missing columns for secondary exam results
-- These columns are required for the teacher_upsert_exam_result_secondary function

ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS activity_score NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS descriptor TEXT,
ADD COLUMN IF NOT EXISTS formative_score NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS exam_score NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS final_score NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS overall_remark TEXT,
ADD COLUMN IF NOT EXISTS teacher_initials TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exam_results_activity_score ON public.exam_results(activity_score) WHERE activity_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_results_formative_score ON public.exam_results(formative_score) WHERE formative_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_score ON public.exam_results(exam_score) WHERE exam_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_results_final_score ON public.exam_results(final_score) WHERE final_score IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
AND table_schema = 'public'
AND column_name IN ('activity_score', 'descriptor', 'formative_score', 'exam_score', 'final_score', 'overall_remark', 'teacher_initials', 'topic')
ORDER BY column_name;
