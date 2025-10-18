-- Populate processed_primary_exam_results with all existing exam results
-- This is a one-time migration to process all existing data

-- Function to process all existing exam results
CREATE OR REPLACE FUNCTION populate_existing_processed_results()
RETURNS VOID AS $$
DECLARE
  exam_result RECORD;
  exam_set_record RECORD;
  student_record RECORD;
  teacher_remark TEXT;
  class_teacher_comment TEXT;
  student_average NUMERIC;
  student_total_marks NUMERIC;
  student_total_possible NUMERIC;
  remark_settings RECORD;
  class_comment_settings RECORD;
BEGIN
  -- Clear existing processed results to avoid duplicates
  DELETE FROM processed_primary_exam_results;
  
  -- Process each exam result
  FOR exam_result IN 
    SELECT DISTINCT 
      er.school_id,
      er.student_id,
      er.exam_set_id
    FROM exam_results er
    ORDER BY er.school_id, er.student_id, er.exam_set_id
  LOOP
    -- Get exam set details
    SELECT name, term, year INTO exam_set_record
    FROM exam_sets 
    WHERE id = exam_result.exam_set_id AND school_id = exam_result.school_id;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Get student details
    SELECT name, admission_number, current_class INTO student_record
    FROM students 
    WHERE student_id = exam_result.student_id AND school_id = exam_result.school_id;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Calculate student average for class teacher comment
    SELECT 
      COALESCE(SUM(marks_obtained), 0) as total_marks,
      COALESCE(SUM(total_marks), 0) as total_possible
    INTO student_total_marks, student_total_possible
    FROM exam_results 
    WHERE student_id = exam_result.student_id 
      AND exam_set_id = exam_result.exam_set_id 
      AND school_id = exam_result.school_id;
    
    student_average := CASE 
      WHEN student_total_possible > 0 THEN (student_total_marks / student_total_possible) * 100 
      ELSE 0 
    END;
    
    -- Get class teacher comment settings
    SELECT comment_text INTO class_comment_settings
    FROM class_teacher_comments_settings
    WHERE school_id = exam_result.school_id 
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
    
    -- Process each subject result for this student and exam set
    FOR subject_row IN 
      SELECT 
        er.subject,
        er.marks_obtained,
        er.total_marks,
        er.grade,
        er.teacher_initials
      FROM exam_results er
      WHERE er.student_id = exam_result.student_id 
        AND er.exam_set_id = exam_result.exam_set_id 
        AND er.school_id = exam_result.school_id
    LOOP
      -- Get teacher remark settings for this subject
      SELECT comment_text INTO remark_settings
      FROM teacher_remarks_settings
      WHERE school_id = exam_result.school_id 
        AND subject = subject_row.subject
        AND (subject_row.marks_obtained / NULLIF(subject_row.total_marks, 0)) * 100 >= min_percent 
        AND (subject_row.marks_obtained / NULLIF(subject_row.total_marks, 0)) * 100 <= max_percent
      ORDER BY min_percent DESC
      LIMIT 1;
      
      -- Set default teacher remark if no settings found
      teacher_remark := COALESCE(
        remark_settings.comment_text,
        CASE 
          WHEN (subject_row.marks_obtained / NULLIF(subject_row.total_marks, 0)) * 100 >= 81 THEN 'Excellent! Keep shining!'
          WHEN (subject_row.marks_obtained / NULLIF(subject_row.total_marks, 0)) * 100 >= 61 THEN 'Good work. Keep it up!'
          WHEN (subject_row.marks_obtained / NULLIF(subject_row.total_marks, 0)) * 100 >= 41 THEN 'Fair work. You can do better.'
          ELSE 'Needs more effort. Try harder next time.'
        END
      );
      
      -- Insert processed result
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
        exam_result.school_id,
        exam_result.student_id,
        exam_result.exam_set_id,
        exam_set_record.year,
        exam_set_record.term,
        exam_set_record.name,
        student_record.name,
        student_record.current_class,
        student_record.admission_number,
        subject_row.subject,
        subject_row.marks_obtained,
        subject_row.total_marks,
        subject_row.grade,
        teacher_remark,
        subject_row.teacher_initials,
        class_teacher_comment
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Successfully populated processed_primary_exam_results with existing exam results';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate existing data
SELECT populate_existing_processed_results();

-- Clean up the function
DROP FUNCTION populate_existing_processed_results();
