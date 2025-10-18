-- Auto-update processed results when Teacher's Remarks Settings or Class Teacher's Comments Settings change
-- This ensures processed results stay in sync with updated settings

-- Function to update processed results when teacher remarks settings change
CREATE OR REPLACE FUNCTION update_processed_results_on_teacher_remarks_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_school_id UUID;
  affected_subject TEXT;
BEGIN
  -- Get the affected school and subject
  IF TG_OP = 'DELETE' THEN
    affected_school_id := OLD.school_id;
    affected_subject := OLD.subject;
  ELSE
    affected_school_id := NEW.school_id;
    affected_subject := NEW.subject;
  END IF;
  
  -- Update all processed results for this subject with new teacher remarks
  UPDATE processed_primary_exam_results
  SET 
    teacher_remark = CASE 
      WHEN EXISTS (
        SELECT 1 FROM teacher_remarks_settings trs
        WHERE trs.school_id = affected_school_id 
          AND trs.subject = affected_subject
          AND (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 >= trs.min_percent 
          AND (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 <= trs.max_percent
        ORDER BY trs.min_percent DESC
        LIMIT 1
      ) THEN (
        SELECT trs.comment_text FROM teacher_remarks_settings trs
        WHERE trs.school_id = affected_school_id 
          AND trs.subject = affected_subject
          AND (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 >= trs.min_percent 
          AND (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 <= trs.max_percent
        ORDER BY trs.min_percent DESC
        LIMIT 1
      )
      ELSE CASE 
        WHEN (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 >= 81 THEN 'Excellent! Keep shining!'
        WHEN (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 >= 61 THEN 'Good work. Keep it up!'
        WHEN (processed_primary_exam_results.marks_obtained / NULLIF(processed_primary_exam_results.total_marks, 0)) * 100 >= 41 THEN 'Fair work. You can do better.'
        ELSE 'Needs more effort. Try harder next time.'
      END
    END,
    processed_at = NOW()
  WHERE school_id = affected_school_id
    AND subject = affected_subject;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update processed results when class teacher comments settings change
CREATE OR REPLACE FUNCTION update_processed_results_on_class_comments_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_school_id UUID;
  affected_class_name TEXT;
BEGIN
  -- Get the affected school and class
  IF TG_OP = 'DELETE' THEN
    affected_school_id := OLD.school_id;
    affected_class_name := OLD.class_name;
  ELSE
    affected_school_id := NEW.school_id;
    affected_class_name := NEW.class_name;
  END IF;
  
  -- Update all processed results for this class with new class teacher comments
  -- We need to recalculate the average for each student
  WITH student_averages AS (
    SELECT 
      student_id,
      exam_set_id,
      (SUM(marks_obtained) / NULLIF(SUM(total_marks), 0)) * 100 as average
    FROM processed_primary_exam_results
    WHERE school_id = affected_school_id
      AND class_name = affected_class_name
    GROUP BY student_id, exam_set_id
  )
  UPDATE processed_primary_exam_results
  SET 
    class_teacher_comment = CASE 
      WHEN EXISTS (
        SELECT 1 FROM class_teacher_comments_settings ctcs
        WHERE ctcs.school_id = affected_school_id 
          AND ctcs.class_name = affected_class_name
          AND sa.average >= ctcs.min_percent 
          AND sa.average <= ctcs.max_percent
        ORDER BY ctcs.min_percent DESC
        LIMIT 1
      ) THEN (
        SELECT ctcs.comment_text FROM class_teacher_comments_settings ctcs
        WHERE ctcs.school_id = affected_school_id 
          AND ctcs.class_name = affected_class_name
          AND sa.average >= ctcs.min_percent 
          AND sa.average <= ctcs.max_percent
        ORDER BY ctcs.min_percent DESC
        LIMIT 1
      )
      ELSE CASE 
        WHEN sa.average >= 81 THEN 'Excellent performance! Keep up the good work.'
        WHEN sa.average >= 61 THEN 'Good work! Continue to improve.'
        WHEN sa.average >= 41 THEN 'Fair performance. Work harder next time.'
        ELSE 'Needs more effort. Try harder next time.'
      END
    END,
    processed_at = NOW()
  FROM student_averages sa
  WHERE processed_primary_exam_results.school_id = affected_school_id
    AND processed_primary_exam_results.class_name = affected_class_name
    AND processed_primary_exam_results.student_id = sa.student_id
    AND processed_primary_exam_results.exam_set_id = sa.exam_set_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updates
DROP TRIGGER IF EXISTS trigger_update_processed_on_teacher_remarks_change ON teacher_remarks_settings;
CREATE TRIGGER trigger_update_processed_on_teacher_remarks_change
  AFTER INSERT OR UPDATE OR DELETE ON teacher_remarks_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_processed_results_on_teacher_remarks_change();

DROP TRIGGER IF EXISTS trigger_update_processed_on_class_comments_change ON class_teacher_comments_settings;
CREATE TRIGGER trigger_update_processed_on_class_comments_change
  AFTER INSERT OR UPDATE OR DELETE ON class_teacher_comments_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_processed_results_on_class_comments_change();

-- Add comments for documentation
COMMENT ON FUNCTION update_processed_results_on_teacher_remarks_change IS 'Updates processed results when teacher remarks settings are changed';
COMMENT ON FUNCTION update_processed_results_on_class_comments_change IS 'Updates processed results when class teacher comments settings are changed';
