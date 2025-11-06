-- Backfill aggregate and division for existing data in processed_primary_exam_results
-- This function calculates and populates aggregate and division for all existing records
-- Run this after adding the aggregate and division columns

-- Function to backfill aggregate and division for all existing data
CREATE OR REPLACE FUNCTION backfill_aggregate_division()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  student_exam_set RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Loop through all unique student/exam_set combinations that have at least one grade
  FOR student_exam_set IN
    SELECT DISTINCT school_id, student_id, exam_set_id
    FROM processed_primary_exam_results
    WHERE EXISTS (
      SELECT 1 
      FROM processed_primary_exam_results ppr2
      WHERE ppr2.school_id = processed_primary_exam_results.school_id
        AND ppr2.student_id = processed_primary_exam_results.student_id
        AND ppr2.exam_set_id = processed_primary_exam_results.exam_set_id
        AND ppr2.grade IS NOT NULL
        AND ppr2.grade != ''
    )
  LOOP
    -- Calculate and update aggregate and division for this student/exam_set
    PERFORM calculate_aggregate_and_division(
      student_exam_set.school_id,
      student_exam_set.student_id,
      student_exam_set.exam_set_id
    );
    processed_count := processed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled aggregate and division for % student/exam_set combinations', processed_count;
END;
$$;

-- Run the backfill function to populate existing data
SELECT backfill_aggregate_division();

-- Add comment
COMMENT ON FUNCTION backfill_aggregate_division IS 'Backfills aggregate and division for all existing data in processed_primary_exam_results';

