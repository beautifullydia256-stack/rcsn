-- Add secondary class fields to exam_results table
-- Run this in Supabase SQL Editor

-- Add new columns for secondary class format
ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS activity_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS descriptor TEXT,
ADD COLUMN IF NOT EXISTS formative_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_remark TEXT,
ADD COLUMN IF NOT EXISTS teacher_initials TEXT;

-- Add constraints for secondary fields
ALTER TABLE public.exam_results 
ADD CONSTRAINT check_activity_score CHECK (activity_score >= 0 AND activity_score <= 3),
ADD CONSTRAINT check_formative_score CHECK (formative_score >= 0 AND formative_score <= 40),
ADD CONSTRAINT check_exam_score CHECK (exam_score >= 0 AND exam_score <= 60),
ADD CONSTRAINT check_final_score CHECK (final_score >= 0 AND final_score <= 100),
ADD CONSTRAINT check_descriptor CHECK (descriptor IN ('Missed', 'Moderate', 'Outstanding') OR descriptor IS NULL);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_exam_results_topic ON public.exam_results(topic);
CREATE INDEX IF NOT EXISTS idx_exam_results_activity_score ON public.exam_results(activity_score);
CREATE INDEX IF NOT EXISTS idx_exam_results_descriptor ON public.exam_results(descriptor);

-- Update existing records to have default values for new fields
UPDATE public.exam_results 
SET 
    activity_score = 0,
    formative_score = 0,
    exam_score = 0,
    final_score = marks_obtained,
    descriptor = CASE 
        WHEN marks_obtained >= 80 THEN 'Outstanding'
        WHEN marks_obtained >= 50 THEN 'Moderate' 
        ELSE 'Missed'
    END
WHERE activity_score IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.exam_results.topic IS 'Topic covered in secondary class format';
COMMENT ON COLUMN public.exam_results.activity_score IS 'Activity score (0-3) for secondary class format';
COMMENT ON COLUMN public.exam_results.descriptor IS 'Performance descriptor: Missed, Moderate, or Outstanding';
COMMENT ON COLUMN public.exam_results.formative_score IS 'Formative assessment score (0-40) for secondary class format';
COMMENT ON COLUMN public.exam_results.exam_score IS 'Exam score (0-60) for secondary class format';
COMMENT ON COLUMN public.exam_results.final_score IS 'Final score (formative + exam) for secondary class format';
COMMENT ON COLUMN public.exam_results.overall_remark IS 'Overall remark for secondary class format';
COMMENT ON COLUMN public.exam_results.teacher_initials IS 'Teacher initials for secondary class format';
