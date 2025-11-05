-- Update auto_process_exam_results to also create MISSED entries
-- This ensures all students have entries for all subjects that ANY student has results for

CREATE OR REPLACE FUNCTION auto_process_exam_results()
RETURNS TRIGGER AS $$
DECLARE
  affected_student_id UUID;
  affected_exam_set_id UUID;
  affected_school_id UUID;
  affected_class_name TEXT;
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
    
    RETURN OLD;
  END IF;
  
  -- Process results for the affected student
  PERFORM process_exam_results_for_student(
    affected_school_id,
    affected_student_id,
    affected_exam_set_id
  );
  
  -- After processing, ensure all students in the class have all subjects
  -- This creates MISSED entries for students who don't have results for subjects that other students have
  IF affected_class_name IS NOT NULL THEN
    BEGIN
      PERFORM ensure_all_students_have_all_subjects(
        affected_school_id,
        affected_exam_set_id,
        affected_class_name
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error ensuring all students have all subjects for class %: %', 
        affected_class_name, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

