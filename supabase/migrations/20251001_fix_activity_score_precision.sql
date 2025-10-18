-- Fix activity_score precision to preserve decimal values
-- The issue: activity_score NUMERIC without precision/scale was rounding 1.6 to 2
-- Solution: Change to NUMERIC(3,1) to allow 1 decimal place (0.0 to 3.0)

-- First, update the column to have proper precision
ALTER TABLE public.exam_results 
ALTER COLUMN activity_score TYPE NUMERIC(3,1);

-- Update the comment to reflect the precision
COMMENT ON COLUMN public.exam_results.activity_score IS 'Activity score (0.0-3.0) for secondary class format - allows 1 decimal place';

-- Also fix formative_score precision to be consistent
ALTER TABLE public.exam_results 
ALTER COLUMN formative_score TYPE NUMERIC(4,1);

-- Update exam_score precision to be consistent
ALTER TABLE public.exam_results 
ALTER COLUMN exam_score TYPE NUMERIC(4,1);

-- Update final_score precision to be consistent
ALTER TABLE public.exam_results 
ALTER COLUMN final_score TYPE NUMERIC(4,1);

-- Update comments for all score fields
COMMENT ON COLUMN public.exam_results.formative_score IS 'Formative assessment score (0.0-40.0) for secondary class format - allows 1 decimal place';
COMMENT ON COLUMN public.exam_results.exam_score IS 'Exam score (0.0-80.0) for secondary class format - allows 1 decimal place';
COMMENT ON COLUMN public.exam_results.final_score IS 'Final score (0.0-100.0) for secondary class format - allows 1 decimal place';
