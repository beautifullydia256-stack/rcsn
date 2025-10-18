-- Update the auto-processing functions to include headteacher comments

-- Function to process exam results for a specific student and exam set (updated)
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
  headteacher_comment TEXT;
  student_average NUMERIC;
  total_marks NUMERIC;
  total_possible NUMERIC;
  remark_settings RECORD;
  class_comment_settings RECORD;
  headteacher_comment_settings RECORD;
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
  
  -- Calculate student average for class teacher and headteacher comments
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
  
  -- Get headteacher comment settings
  SELECT comment_text INTO headteacher_comment_settings
  FROM headteacher_comments_settings
  WHERE school_id = p_school_id 
    AND student_average >= min_percent 
    AND student_average <= max_percent
  ORDER BY min_percent DESC
  LIMIT 1;
  
  -- Set default headteacher comment if no settings found
  headteacher_comment := COALESCE(
    headteacher_comment_settings.comment_text,
    CASE 
      WHEN student_average >= 81 THEN 'An excellent performance that shows hard work, focus, and discipline. Maintain this level of commitment for continued success.'
      WHEN student_average >= 61 THEN 'A good performance reflecting steady progress. Keep encouraging consistent effort to reach higher levels.'
      WHEN student_average >= 41 THEN 'A fair performance. With greater consistency and focus, the student can improve significantly.'
      ELSE 'The student needs to put in more effort. With proper guidance and hard work, better results can be achieved next term.'
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
    
    -- Get next term begins date
    DECLARE
      next_term_begins_date DATE;
    BEGIN
      -- Calculate next term year and term
      DECLARE
        next_term_year INTEGER;
        next_term_number INTEGER;
      BEGIN
        IF exam_set_record.term = 3 THEN
          next_term_year := exam_set_record.year + 1;
          next_term_number := 1;
        ELSE
          next_term_year := exam_set_record.year;
          next_term_number := exam_set_record.term + 1;
        END IF;
        
        -- Get next term begins date from school_terms
        SELECT start_date INTO next_term_begins_date
        FROM school_terms
        WHERE school_id = p_school_id
          AND year = next_term_year
          AND term = next_term_number
        LIMIT 1;
      END;
    END;

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
      class_teacher_comment,
      headteacher_comment,
      next_term_begins_date
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
      class_teacher_comment,
      headteacher_comment,
      next_term_begins_date
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
      headteacher_comment = EXCLUDED.headteacher_comment,
      processed_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update processed results when headteacher comments settings change
CREATE OR REPLACE FUNCTION update_processed_results_on_headteacher_comments_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_school_id UUID;
BEGIN
  -- Get the affected school
  IF TG_OP = 'DELETE' THEN
    affected_school_id := OLD.school_id;
  ELSE
    affected_school_id := NEW.school_id;
  END IF;
  
  -- Update all processed results for this school with new headteacher comments
  -- We need to recalculate the average for each student
  WITH student_averages AS (
    SELECT 
      student_id,
      exam_set_id,
      (SUM(marks_obtained) / NULLIF(SUM(total_marks), 0)) * 100 as average
    FROM processed_primary_exam_results
    WHERE school_id = affected_school_id
    GROUP BY student_id, exam_set_id
  )
  UPDATE processed_primary_exam_results
  SET 
    headteacher_comment = CASE 
      WHEN EXISTS (
        SELECT 1 FROM headteacher_comments_settings hcs
        WHERE hcs.school_id = affected_school_id 
          AND sa.average >= hcs.min_percent 
          AND sa.average <= hcs.max_percent
        ORDER BY hcs.min_percent DESC
        LIMIT 1
      ) THEN (
        SELECT hcs.comment_text FROM headteacher_comments_settings hcs
        WHERE hcs.school_id = affected_school_id 
          AND sa.average >= hcs.min_percent 
          AND sa.average <= hcs.max_percent
        ORDER BY hcs.min_percent DESC
        LIMIT 1
      )
      ELSE CASE 
        WHEN sa.average >= 81 THEN 'An excellent performance that shows hard work, focus, and discipline. Maintain this level of commitment for continued success.'
        WHEN sa.average >= 61 THEN 'A good performance reflecting steady progress. Keep encouraging consistent effort to reach higher levels.'
        WHEN sa.average >= 41 THEN 'A fair performance. With greater consistency and focus, the student can improve significantly.'
        ELSE 'The student needs to put in more effort. With proper guidance and hard work, better results can be achieved next term.'
      END
    END,
    processed_at = NOW()
  FROM student_averages sa
  WHERE processed_primary_exam_results.school_id = affected_school_id
    AND processed_primary_exam_results.student_id = sa.student_id
    AND processed_primary_exam_results.exam_set_id = sa.exam_set_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates when headteacher comments settings change
DROP TRIGGER IF EXISTS trigger_update_processed_on_headteacher_comments_change ON headteacher_comments_settings;
CREATE TRIGGER trigger_update_processed_on_headteacher_comments_change
  AFTER INSERT OR UPDATE OR DELETE ON headteacher_comments_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_processed_results_on_headteacher_comments_change();

-- Add comments for documentation
COMMENT ON FUNCTION update_processed_results_on_headteacher_comments_change IS 'Updates processed results when headteacher comments settings are changed';
