-- Populate headteacher comments in existing processed results
-- This updates all existing processed results with headteacher comments based on student averages

-- Function to update existing processed results with headteacher comments
CREATE OR REPLACE FUNCTION populate_headteacher_comments_in_existing_results()
RETURNS VOID AS $$
DECLARE
  result_record RECORD;
  student_average NUMERIC;
  total_marks NUMERIC;
  total_possible NUMERIC;
  headteacher_comment_settings RECORD;
  headteacher_comment TEXT;
BEGIN
  -- Process each unique student-exam_set combination
  FOR result_record IN 
    SELECT DISTINCT 
      school_id,
      student_id,
      exam_set_id
    FROM processed_primary_exam_results
    WHERE headteacher_comment IS NULL
  LOOP
    -- Calculate student average for this exam set
    SELECT 
      COALESCE(SUM(marks_obtained), 0) as total_marks,
      COALESCE(SUM(total_marks), 0) as total_possible
    INTO total_marks, total_possible
    FROM processed_primary_exam_results
    WHERE school_id = result_record.school_id
      AND student_id = result_record.student_id
      AND exam_set_id = result_record.exam_set_id
      AND grade != 'MISSED'; -- Only count actual results, not MISSED entries
    
    student_average := CASE 
      WHEN total_possible > 0 THEN (total_marks / total_possible) * 100 
      ELSE 0 
    END;
    
    -- Get headteacher comment settings for this school and average
    SELECT comment_text INTO headteacher_comment_settings
    FROM headteacher_comments_settings
    WHERE school_id = result_record.school_id 
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
    
    -- Update all processed results for this student-exam_set combination
    UPDATE processed_primary_exam_results
    SET 
      headteacher_comment = headteacher_comment,
      processed_at = NOW()
    WHERE school_id = result_record.school_id
      AND student_id = result_record.student_id
      AND exam_set_id = result_record.exam_set_id;
  END LOOP;
  
  RAISE NOTICE 'Successfully populated headteacher comments in existing processed results';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate existing data
SELECT populate_headteacher_comments_in_existing_results();

-- Clean up the function
DROP FUNCTION populate_headteacher_comments_in_existing_results();
