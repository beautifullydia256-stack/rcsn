-- Safe migration: Add secondary class fields to exam_results table
-- This version checks for existing constraints and only adds what's missing

-- Add new columns for secondary class format (safe - only if not exists)
ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS activity_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS descriptor TEXT,
ADD COLUMN IF NOT EXISTS formative_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_remark TEXT,
ADD COLUMN IF NOT EXISTS teacher_initials TEXT;

-- Create indexes for new fields (safe - only if not exists)
CREATE INDEX IF NOT EXISTS idx_exam_results_topic ON public.exam_results(topic);
CREATE INDEX IF NOT EXISTS idx_exam_results_activity_score ON public.exam_results(activity_score);
CREATE INDEX IF NOT EXISTS idx_exam_results_descriptor ON public.exam_results(descriptor);

-- Update existing records to have default values for new fields
UPDATE public.exam_results 
SET 
    activity_score = COALESCE(activity_score, 0),
    formative_score = COALESCE(formative_score, 0),
    exam_score = COALESCE(exam_score, 0),
    final_score = COALESCE(final_score, marks_obtained),
    descriptor = COALESCE(descriptor, CASE 
        WHEN marks_obtained >= 80 THEN 'Outstanding'
        WHEN marks_obtained >= 50 THEN 'Moderate' 
        ELSE 'Missed'
    END)
WHERE activity_score IS NULL OR formative_score IS NULL;

-- Add comments for documentation (safe - won't error if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'topic' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.topic IS 'Topic covered in secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'activity_score' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.activity_score IS 'Activity score (0-3) for secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'descriptor' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.descriptor IS 'Performance descriptor: Missed, Moderate, or Outstanding';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'formative_score' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.formative_score IS 'Formative assessment score (0-40) for secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'exam_score' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.exam_score IS 'Exam score (0-60) for secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'final_score' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.final_score IS 'Final score (formative + exam) for secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'overall_remark' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.overall_remark IS 'Overall remark for secondary class format';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_description WHERE objoid = 'public.exam_results'::regclass AND objsubid = (SELECT attnum FROM pg_attribute WHERE attname = 'teacher_initials' AND attrelid = 'public.exam_results'::regclass)) THEN
        COMMENT ON COLUMN public.exam_results.teacher_initials IS 'Teacher initials for secondary class format';
    END IF;
END $$;
