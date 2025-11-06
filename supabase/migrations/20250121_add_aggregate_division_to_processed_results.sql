-- Add aggregate and division columns to processed_primary_exam_results table
-- These are summary values calculated per student per exam set

-- Add aggregate column (sum of grade points)
ALTER TABLE public.processed_primary_exam_results
ADD COLUMN IF NOT EXISTS aggregate INTEGER;

-- Add division column (Division 1, Division 2, etc.)
ALTER TABLE public.processed_primary_exam_results
ADD COLUMN IF NOT EXISTS division TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.processed_primary_exam_results.aggregate IS 'Sum of grade points for all subjects (e.g., C5+C4+D1+F9 = 5+4+1+9 = 19)';
COMMENT ON COLUMN public.processed_primary_exam_results.division IS 'Division calculated from aggregate points (Division 1, Division 2, Division 3, Division 4, or U (Ungraded))';

-- Create index on aggregate for faster queries
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_aggregate 
ON public.processed_primary_exam_results(school_id, student_id, exam_set_id, aggregate);

-- Create index on division for faster queries
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_division 
ON public.processed_primary_exam_results(school_id, student_id, exam_set_id, division);

