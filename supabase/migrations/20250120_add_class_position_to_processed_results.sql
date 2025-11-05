-- Add class_position column to processed_primary_exam_results table
-- Class position ranks students based on their overall performance (average percentage) for the selected exam period
-- Position 1 = best performance (highest average), higher numbers = lower performance
-- Example: If there are 30 students in the class, Position 1 means performed better than all 29 others

ALTER TABLE public.processed_primary_exam_results 
ADD COLUMN IF NOT EXISTS class_position INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.processed_primary_exam_results.class_position IS 
'Class position based on overall performance (average percentage) for the exam set. Position 1 = best performance, higher numbers = lower performance. Same value for all subject rows of the same student/exam_set combination.';

-- Create index for better performance when querying by class position
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_class_position 
ON public.processed_primary_exam_results(school_id, exam_set_id, class_name, class_position);

-- Function to calculate and update class positions for a specific exam set and class
-- This calculates positions based on average percentage across all subjects
-- Uses DENSE_RANK to handle ties (students with same average get same position)
CREATE OR REPLACE FUNCTION calculate_class_positions_for_exam_set(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate and update class positions using window function
  -- DENSE_RANK ensures students with the same average get the same position
  -- Position 1 = best performance (highest average)
  WITH student_averages AS (
    SELECT 
      student_id,
      (SUM(marks_obtained) / NULLIF(SUM(total_marks), 0)) * 100 as average
    FROM processed_primary_exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND class_name = p_class_name
      AND grade != 'MISSED' -- Only count actual results, not MISSED entries
    GROUP BY student_id
  ),
  ranked_students AS (
    SELECT 
      student_id,
      DENSE_RANK() OVER (ORDER BY average DESC NULLS LAST) as position
    FROM student_averages
  )
  UPDATE processed_primary_exam_results ppr
  SET class_position = ranked_students.position
  FROM ranked_students
  WHERE ppr.school_id = p_school_id
    AND ppr.exam_set_id = p_exam_set_id
    AND ppr.class_name = p_class_name
    AND ppr.student_id = ranked_students.student_id;
END;
$$;

-- Function to calculate and update class positions for all students in all classes for an exam set
CREATE OR REPLACE FUNCTION calculate_class_positions_for_all_classes(
  p_school_id UUID,
  p_exam_set_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  class_record RECORD;
BEGIN
  -- Process each class separately
  FOR class_record IN
    SELECT DISTINCT class_name
    FROM processed_primary_exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
  LOOP
    PERFORM calculate_class_positions_for_exam_set(
      p_school_id,
      p_exam_set_id,
      class_record.class_name
    );
  END LOOP;
END;
$$;

-- Update existing processed results with class positions
-- This will calculate positions for all existing exam sets
DO $$
DECLARE
  exam_set_record RECORD;
BEGIN
  FOR exam_set_record IN
    SELECT DISTINCT school_id, exam_set_id
    FROM processed_primary_exam_results
    WHERE class_position IS NULL
  LOOP
    PERFORM calculate_class_positions_for_all_classes(
      exam_set_record.school_id,
      exam_set_record.exam_set_id
    );
  END LOOP;
END;
$$;

-- Trigger function to recalculate class positions after processed results are updated
-- This ensures positions are always up-to-date when exam results change
CREATE OR REPLACE FUNCTION recalculate_class_positions_trigger()
RETURNS TRIGGER AS $$
DECLARE
  affected_class_name TEXT;
  affected_exam_set_id UUID;
  affected_school_id UUID;
BEGIN
  -- Get the affected class and exam set
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_class_name := NEW.class_name;
    affected_exam_set_id := NEW.exam_set_id;
    affected_school_id := NEW.school_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_class_name := OLD.class_name;
    affected_exam_set_id := OLD.exam_set_id;
    affected_school_id := OLD.school_id;
  END IF;
  
  -- Recalculate positions for all students in this class and exam set
  PERFORM calculate_class_positions_for_exam_set(
    affected_school_id,
    affected_exam_set_id,
    affected_class_name
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically recalculate class positions
-- This runs after INSERT, UPDATE, or DELETE on processed_primary_exam_results
DROP TRIGGER IF EXISTS trigger_recalculate_class_positions ON processed_primary_exam_results;
CREATE TRIGGER trigger_recalculate_class_positions
  AFTER INSERT OR UPDATE OR DELETE ON processed_primary_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_class_positions_trigger();

