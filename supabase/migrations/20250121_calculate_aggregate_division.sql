-- Function to calculate and update aggregate and division for a student/exam_set combination
-- Aggregate = sum of grade points (e.g., C5+C4+D1+F9 = 5+4+1+9 = 19)
-- Division = calculated from aggregate points using Primary Divisions logic
-- This function should be called after all subjects (including MISSED entries) are processed

CREATE OR REPLACE FUNCTION calculate_aggregate_and_division(
  p_school_id UUID,
  p_student_id UUID,
  p_exam_set_id UUID
)
RETURNS VOID AS $$
DECLARE
  aggregate_sum INTEGER := 0;
  calculated_division TEXT;
BEGIN
  -- Calculate aggregate: sum of grade points from all subjects
  -- Extract number from grade string (e.g., "C5" -> 5, "D1" -> 1, "F9" -> 9)
  -- Only count subjects that have a grade (exclude NULL or empty grades)
  -- Note: MISSED entries have grade = 'F9', so they count as 9 points
  SELECT COALESCE(SUM(
    CASE 
      WHEN grade IS NULL OR grade = '' THEN 0
      ELSE (
        -- Extract number from grade string using regex
        -- Match pattern: letter(s) followed by number (e.g., "C5", "D1", "F9", "Credit 5", "Division 1")
        COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
      )
    END
  ), 0)
  INTO aggregate_sum
  FROM processed_primary_exam_results
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND grade IS NOT NULL
    AND grade != '';
  
  -- Calculate division from aggregate points (Primary Divisions logic)
  -- Division 1: 4-12, Division 2: 13-23, Division 3: 24-29, Division 4: 30-34, U: 35-36+
  calculated_division := CASE
    WHEN aggregate_sum >= 4 AND aggregate_sum <= 12 THEN 'Division 1'
    WHEN aggregate_sum >= 13 AND aggregate_sum <= 23 THEN 'Division 2'
    WHEN aggregate_sum >= 24 AND aggregate_sum <= 29 THEN 'Division 3'
    WHEN aggregate_sum >= 30 AND aggregate_sum <= 34 THEN 'Division 4'
    WHEN aggregate_sum >= 35 THEN 'U (Ungraded)'
    ELSE NULL
  END;
  
  -- Update all rows for this student/exam_set with the same aggregate and division
  -- (since aggregate and division are the same for all subjects for a given student/exam_set)
  UPDATE processed_primary_exam_results
  SET 
    aggregate = CASE WHEN aggregate_sum > 0 THEN aggregate_sum ELSE NULL END,
    division = calculated_division
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id;
    
END;
$$ LANGUAGE plpgsql;

-- Update the auto_process_exam_results function to calculate aggregate and division after processing
-- This ensures aggregate and division are calculated after all subjects (including MISSED entries) are created
CREATE OR REPLACE FUNCTION auto_process_exam_results()
RETURNS TRIGGER AS $$
DECLARE
  affected_student_id UUID;
  affected_exam_set_id UUID;
  affected_school_id UUID;
  affected_class_name TEXT;
  student_id_val UUID;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_student_id := NEW.student_id;
    affected_exam_set_id := NEW.exam_set_id;
    affected_school_id := NEW.school_id;
    affected_class_name := NEW.class_name;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    affected_student_id := OLD.student_id;
    affected_exam_set_id := OLD.exam_set_id;
    affected_school_id := OLD.school_id;
    affected_class_name := OLD.class_name;
    
    -- Delete processed results for this student and exam set
    DELETE FROM processed_primary_exam_results
    WHERE school_id = affected_school_id
      AND student_id = affected_student_id
      AND exam_set_id = affected_exam_set_id;
    
    -- After delete, ensure all students still have all subjects
    PERFORM ensure_all_students_have_all_subjects(
      affected_school_id,
      affected_exam_set_id,
      affected_class_name
    );
    
    -- Recalculate aggregate and division for all students in the class after delete
    FOR student_id_val IN
      SELECT student_id
      FROM students
      WHERE school_id = affected_school_id
        AND current_class = affected_class_name
        AND status = 'active'
    LOOP
      PERFORM calculate_aggregate_and_division(
        affected_school_id,
        student_id_val,
        affected_exam_set_id
      );
    END LOOP;
    
    RETURN OLD;
  END IF;
  
  -- Process results for the affected student
  PERFORM process_exam_results_for_student(
    affected_school_id,
    affected_student_id,
    affected_exam_set_id
  );
  
  -- After processing, ensure all students in the class have all subjects for THIS exam set
  -- This creates MISSED entries for students who don't have results for subjects that other students have
  IF affected_class_name IS NOT NULL AND affected_exam_set_id IS NOT NULL THEN
    BEGIN
      PERFORM ensure_all_students_have_all_subjects(
        affected_school_id,
        affected_exam_set_id,
        affected_class_name
      );
      
      -- After ensuring all students have all subjects, calculate aggregate and division for all students
      FOR student_id_val IN
        SELECT student_id
        FROM students
        WHERE school_id = affected_school_id
          AND current_class = affected_class_name
          AND status = 'active'
      LOOP
        PERFORM calculate_aggregate_and_division(
          affected_school_id,
          student_id_val,
          affected_exam_set_id
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error ensuring all students have all subjects for class % exam_set %: %', 
        affected_class_name, affected_exam_set_id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update aggregate and division when processed_primary_exam_results is updated
-- This ensures aggregate and division are recalculated when grades change
CREATE OR REPLACE FUNCTION update_aggregate_division_on_grade_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if grade changed
  IF TG_OP = 'UPDATE' AND (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    PERFORM calculate_aggregate_and_division(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM calculate_aggregate_and_division(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update aggregate and division when grades change
DROP TRIGGER IF EXISTS trigger_update_aggregate_division ON processed_primary_exam_results;
CREATE TRIGGER trigger_update_aggregate_division
  AFTER INSERT OR UPDATE OF grade ON processed_primary_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION update_aggregate_division_on_grade_change();

-- Add comments
COMMENT ON FUNCTION calculate_aggregate_and_division IS 'Calculates and updates aggregate (sum of grade points) and division for a student/exam_set combination';
COMMENT ON FUNCTION update_aggregate_division_on_grade_change IS 'Trigger function that recalculates aggregate and division when grades change';
