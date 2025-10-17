-- Auto-process exam results when they are inserted or updated
-- This ensures processed_primary_exam_results is always up-to-date

-- Function to process exam results for a specific student and exam set
CREATE OR REPLACE FUNCTION process_exam_results_for_student(
  p_school_id UUID,
  p_student_id UUID,
  p_exam_set_id UUID
) RETURNS VOID AS $$
DECLARE
  exam_set_record RECORD;
  student_record RECORD;
  subject_result RECORD;
  teacher_remark TEXT;
  class_teacher_comment TEXT;
  student_average NUMERIC;
  total_marks NUMERIC;
  total_possible NUMERIC;
  remark_settings RECORD;
  class_comment_settings RECORD;
BEGIN
  -- Get exam set details
  SELECT name, term, year INTO exam_set_record
  FROM exam_sets 
  WHERE id = p_exam_set_id AND school_id = p_school_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get student details
  SELECT student_name, admission_number, current_class INTO student_record
  FROM students 
  WHERE student_id = p_student_id AND school_id = p_school_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate student average for class teacher comment
  SELECT 
    COALESCE(SUM(marks_obtained), 0) as total_marks,
    COALESCE(SUM(total_marks), 0) as total_possible
  INTO total_marks, total_possible
  FROM exam_results 
  WHERE student_id = p_student_id 
    AND exam_set_id = p_exam_set_id 
    AND school_id = p_school_id;
  
  student_average := CASE 
    WHEN total_possible > 0 THEN (total_marks / total_possible) * 100 
    ELSE 0 
  END;
  
  -- Get class teacher comment settings
  SELECT comment_text INTO class_comment_settings
  FROM class_teacher_comments_settings
  WHERE school_id = p_school_id 
    AND class_name = student_record.current_class
    AND student_average >= min_percent 
    AND student_average <= max_percent
  ORDER BY min_percent DESC
  LIMIT 1;
  
  -- Set default class teacher comment if no settings found
  class_teacher_comment := COALESCE(
    class_comment_settings.comment_text,
    CASE 
      WHEN student_average >= 81 THEN 'Excellent performance! Keep up the good work.'
      WHEN student_average >= 61 THEN 'Good work! Continue to improve.'
      WHEN student_average >= 41 THEN 'Fair performance. Work harder next time.'
      ELSE 'Needs more effort. Try harder next time.'
    END
  );
  
  -- Process each subject result
  FOR subject_result IN 
    SELECT 
      er.subject,
      er.marks_obtained,
      er.total_marks,
      er.grade,
      er.teacher_initials
    FROM exam_results er
    WHERE er.student_id = p_student_id 
      AND er.exam_set_id = p_exam_set_id 
      AND er.school_id = p_school_id
  LOOP
    -- Get teacher remark settings for this subject
    SELECT comment_text INTO remark_settings
    FROM teacher_remarks_settings
    WHERE school_id = p_school_id 
      AND subject = subject_result.subject
      AND (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= min_percent 
      AND (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 <= max_percent
    ORDER BY min_percent DESC
    LIMIT 1;
    
    -- Set default teacher remark if no settings found
    teacher_remark := COALESCE(
      remark_settings.comment_text,
      CASE 
        WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 81 THEN 'Excellent! Keep shining!'
        WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 61 THEN 'Good work. Keep it up!'
        WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 41 THEN 'Fair work. You can do better.'
        ELSE 'Needs more effort. Try harder next time.'
      END
    );
    
    -- Insert or update processed result
    INSERT INTO processed_primary_exam_results (
      school_id,
      student_id,
      exam_set_id,
      year,
      term,
      exam_set_name,
      student_name,
      class_name,
      admission_number,
      subject,
      marks_obtained,
      total_marks,
      grade,
      teacher_remark,
      teacher_initials,
      class_teacher_comment
    ) VALUES (
      p_school_id,
      p_student_id,
      p_exam_set_id,
      exam_set_record.year,
      exam_set_record.term,
      exam_set_record.name,
      student_record.student_name,
      student_record.current_class,
      student_record.admission_number,
      subject_result.subject,
      subject_result.marks_obtained,
      subject_result.total_marks,
      subject_result.grade,
      teacher_remark,
      subject_result.teacher_initials,
      class_teacher_comment
    )
    ON CONFLICT (school_id, student_id, exam_set_id, subject)
    DO UPDATE SET
      year = EXCLUDED.year,
      term = EXCLUDED.term,
      exam_set_name = EXCLUDED.exam_set_name,
      student_name = EXCLUDED.student_name,
      class_name = EXCLUDED.class_name,
      admission_number = EXCLUDED.admission_number,
      marks_obtained = EXCLUDED.marks_obtained,
      total_marks = EXCLUDED.total_marks,
      grade = EXCLUDED.grade,
      teacher_remark = EXCLUDED.teacher_remark,
      teacher_initials = EXCLUDED.teacher_initials,
      class_teacher_comment = EXCLUDED.class_teacher_comment,
      processed_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process all students for an exam set when results are updated
CREATE OR REPLACE FUNCTION auto_process_exam_results()
RETURNS TRIGGER AS $$
DECLARE
  affected_student_id UUID;
  affected_exam_set_id UUID;
  affected_school_id UUID;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_student_id := NEW.student_id;
    affected_exam_set_id := NEW.exam_set_id;
    affected_school_id := NEW.school_id;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    affected_student_id := OLD.student_id;
    affected_exam_set_id := OLD.exam_set_id;
    affected_school_id := OLD.school_id;
    
    -- Delete processed results for this student and exam set
    DELETE FROM processed_primary_exam_results
    WHERE school_id = affected_school_id
      AND student_id = affected_student_id
      AND exam_set_id = affected_exam_set_id;
    
    RETURN OLD;
  END IF;
  
  -- Process results for the affected student
  PERFORM process_exam_results_for_student(
    affected_school_id,
    affected_student_id,
    affected_exam_set_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic processing
DROP TRIGGER IF EXISTS trigger_auto_process_exam_results ON exam_results;
CREATE TRIGGER trigger_auto_process_exam_results
  AFTER INSERT OR UPDATE OR DELETE ON exam_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_exam_results();

-- Add comment for documentation
COMMENT ON FUNCTION process_exam_results_for_student IS 'Processes exam results for a specific student and exam set, calculating teacher remarks and class teacher comments';
COMMENT ON FUNCTION auto_process_exam_results IS 'Trigger function that automatically processes exam results when they are inserted, updated, or deleted';
