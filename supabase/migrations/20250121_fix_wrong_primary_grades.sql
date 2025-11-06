-- Fix wrong grades in exam_results and processed_primary_exam_results
-- Convert secondary school grades (A, B, C, D, E) to primary school grades (D1, D2, C3, C4, C5, C6, P7, P8, F9)
-- Based on marks_obtained percentage

-- Function to calculate primary school grade from marks
CREATE OR REPLACE FUNCTION calculate_primary_grade_from_marks(
  p_marks_obtained NUMERIC,
  p_total_marks NUMERIC
)
RETURNS TEXT AS $$
DECLARE
  percentage NUMERIC;
BEGIN
  IF p_total_marks IS NULL OR p_total_marks = 0 THEN
    RETURN 'F9';
  END IF;
  
  percentage := (p_marks_obtained / p_total_marks) * 100;
  
  -- Primary school grading scale:
  -- D1: 75-100, D2: 70-74, C3: 65-69, C4: 60-64, C5: 55-59, C6: 50-54, P7: 45-49, P8: 40-44, F9: 0-39
  RETURN CASE
    WHEN percentage >= 75 AND percentage <= 100 THEN 'D1'
    WHEN percentage >= 70 AND percentage <= 74 THEN 'D2'
    WHEN percentage >= 65 AND percentage <= 69 THEN 'C3'
    WHEN percentage >= 60 AND percentage <= 64 THEN 'C4'
    WHEN percentage >= 55 AND percentage <= 59 THEN 'C5'
    WHEN percentage >= 50 AND percentage <= 54 THEN 'C6'
    WHEN percentage >= 45 AND percentage <= 49 THEN 'P7'
    WHEN percentage >= 40 AND percentage <= 44 THEN 'P8'
    WHEN percentage >= 0 AND percentage <= 39 THEN 'F9'
    ELSE 'F9'
  END;
END;
$$ LANGUAGE plpgsql;

-- Fix exam_results table - only update grades that are wrong (A, B, C, D, E, F)
UPDATE exam_results
SET grade = calculate_primary_grade_from_marks(marks_obtained, total_marks)
WHERE grade IN ('A', 'B', 'C', 'D', 'E', 'F')
  AND school_id IN (
    SELECT school_id FROM schools WHERE type = 'Nursery/Primary'
  );

-- Fix processed_primary_exam_results table - recalculate grades from marks
UPDATE processed_primary_exam_results
SET grade = calculate_primary_grade_from_marks(marks_obtained, total_marks)
WHERE grade IN ('A', 'B', 'C', 'D', 'E', 'F')
  AND school_id IN (
    SELECT school_id FROM schools WHERE type = 'Nursery/Primary'
  );

-- Verify the fix
SELECT 
  'Fixed Grades Summary' as info,
  COUNT(*) as total_fixed,
  COUNT(CASE WHEN grade IN ('D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9') THEN 1 END) as primary_grades,
  COUNT(CASE WHEN grade IN ('A', 'B', 'C', 'D', 'E', 'F') THEN 1 END) as secondary_grades
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Show sample fixed grades
SELECT 
  'Sample Fixed Grades' as info,
  student_name,
  exam_set_name,
  subject,
  marks_obtained,
  total_marks,
  grade,
  (marks_obtained / NULLIF(total_marks, 0)) * 100 as percentage
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
ORDER BY student_name, subject
LIMIT 20;

-- After fixing grades, we need to recalculate aggregate and division
-- This will be done automatically by the trigger, but we can also manually trigger it
DO $$
DECLARE
  student_exam_set RECORD;
  school_uuid UUID := '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
BEGIN
  FOR student_exam_set IN
    SELECT DISTINCT student_id, exam_set_id
    FROM processed_primary_exam_results
    WHERE school_id = school_uuid
      AND class_name = 'Primary 7'
  LOOP
    PERFORM calculate_aggregate_and_division(
      school_uuid,
      student_exam_set.student_id,
      student_exam_set.exam_set_id
    );
  END LOOP;
END;
$$;

