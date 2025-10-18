-- Add headteacher_comment field to processed_primary_exam_results table
ALTER TABLE public.processed_primary_exam_results 
ADD COLUMN IF NOT EXISTS headteacher_comment TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.processed_primary_exam_results.headteacher_comment IS 'Headteacher comment based on student overall average performance';
