-- Add next_term_begins_date to processed_primary_exam_results table
ALTER TABLE public.processed_primary_exam_results 
ADD COLUMN IF NOT EXISTS next_term_begins_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.processed_primary_exam_results.next_term_begins_date IS 'Date when the next term begins, populated from school_terms table';

-- Update existing processed results with next term begins date
UPDATE public.processed_primary_exam_results 
SET next_term_begins_date = (
  SELECT st.start_date 
  FROM school_terms st 
  WHERE st.school_id = processed_primary_exam_results.school_id 
    AND st.year = (
      CASE 
        WHEN processed_primary_exam_results.term = 3 THEN processed_primary_exam_results.year + 1
        ELSE processed_primary_exam_results.year
      END
    )
    AND st.term = (
      CASE 
        WHEN processed_primary_exam_results.term = 3 THEN 1
        ELSE processed_primary_exam_results.term + 1
      END
    )
  LIMIT 1
)
WHERE next_term_begins_date IS NULL;


