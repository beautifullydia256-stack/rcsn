-- Fix aggregate and division for school: 406bf29b-d7fd-457c-aa56-e29b9ef1a16d
-- This script will:
-- 1. Check current data status
-- 2. Run the backfill function to calculate aggregate and division
-- 3. Verify the results

-- Step 1: Check current status
SELECT 
  'BEFORE BACKFILL' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as records_with_grade,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Step 2: Show sample grades to verify format
SELECT 
  'Sample Grades' as info,
  student_name,
  exam_set_name,
  subject,
  grade,
  marks_obtained
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND grade IS NOT NULL
  AND grade != ''
ORDER BY student_name, exam_set_name, subject
LIMIT 10;

-- Step 3: Test grade extraction (to verify regex works)
SELECT 
  'Grade Extraction Test' as test,
  grade,
  (regexp_match(grade, '(\d+)'))[1]::INTEGER as extracted_number
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND grade IS NOT NULL
  AND grade != ''
GROUP BY grade
ORDER BY grade
LIMIT 20;

-- Step 4: Run backfill for this specific school
-- This will calculate aggregate and division for all student/exam_set combinations
DO $$
DECLARE
  student_exam_set RECORD;
  processed_count INTEGER := 0;
  school_uuid UUID := '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
BEGIN
  -- Loop through all unique student/exam_set combinations for this school
  FOR student_exam_set IN
    SELECT DISTINCT student_id, exam_set_id
    FROM processed_primary_exam_results
    WHERE school_id = school_uuid
      AND class_name = 'Primary 7'
      AND EXISTS (
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
      school_uuid,
      student_exam_set.student_id,
      student_exam_set.exam_set_id
    );
    processed_count := processed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled aggregate and division for % student/exam_set combinations', processed_count;
END;
$$;

-- Step 5: Check status after backfill
SELECT 
  'AFTER BACKFILL' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as records_with_grade,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Step 6: Show sample results with aggregate and division
SELECT 
  'Sample Results' as info,
  student_name,
  exam_set_name,
  subject,
  marks_obtained,
  grade,
  aggregate,
  division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND aggregate IS NOT NULL
ORDER BY student_name, exam_set_name, subject
LIMIT 20;

-- Step 7: Verify aggregate calculation for a specific student
SELECT 
  'Aggregate Verification' as info,
  student_name,
  exam_set_name,
  subject,
  grade,
  (regexp_match(grade, '(\d+)'))[1]::INTEGER as grade_points,
  aggregate,
  division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND student_name = (SELECT student_name FROM processed_primary_exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d' AND class_name = 'Primary 7' LIMIT 1)
  AND exam_set_name LIKE '%End%'
ORDER BY subject;

