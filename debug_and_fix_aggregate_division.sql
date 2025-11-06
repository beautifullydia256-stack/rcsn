-- Debug and fix aggregate/division for specific student
-- This will help us understand why aggregate/division are NULL even though grades exist

-- Step 1: Check what grades exist for this student
SELECT 
  'Step 1: Check Grades' as step,
  student_name,
  exam_set_name,
  subject,
  marks_obtained,
  grade,
  aggregate,
  division
FROM processed_primary_exam_results
WHERE student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
  AND exam_set_id = 'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
ORDER BY subject;

-- Step 2: Test grade extraction regex
SELECT 
  'Step 2: Test Grade Extraction' as step,
  grade,
  (regexp_match(grade, '(\d+)'))[1]::INTEGER as extracted_number,
  CASE 
    WHEN grade IS NULL OR grade = '' THEN 0
    ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
  END as grade_points
FROM processed_primary_exam_results
WHERE student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
  AND exam_set_id = 'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
  AND grade IS NOT NULL
  AND grade != ''
ORDER BY subject;

-- Step 3: Manually calculate aggregate to verify logic
SELECT 
  'Step 3: Manual Aggregate Calculation' as step,
  SUM(
    CASE 
      WHEN grade IS NULL OR grade = '' THEN 0
      ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
    END
  ) as calculated_aggregate,
  COUNT(*) as subject_count,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as subjects_with_grade
FROM processed_primary_exam_results
WHERE student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
  AND exam_set_id = 'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
  AND grade IS NOT NULL
  AND grade != '';

-- Step 4: Test the calculate_aggregate_and_division function directly
-- Note: This function returns VOID, so we use PERFORM
DO $$
BEGIN
  PERFORM calculate_aggregate_and_division(
    '406bf29b-d7fd-457c-aa56-e29b9ef1a16d',
    '124868ec-37e0-406a-9a54-12e9c627320d',
    'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
  );
  RAISE NOTICE 'Function executed successfully';
END;
$$;

-- Step 5: Verify the result after calculation
SELECT 
  'Step 5: After Calculation' as step,
  student_name,
  exam_set_name,
  subject,
  grade,
  aggregate,
  division
FROM processed_primary_exam_results
WHERE student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
  AND exam_set_id = 'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
ORDER BY subject;

-- Step 6: Run for ALL student/exam_set combinations for this school
DO $$
DECLARE
  student_exam_set RECORD;
  processed_count INTEGER := 0;
  school_uuid UUID := '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
BEGIN
  RAISE NOTICE 'Starting backfill for school %', school_uuid;
  
  -- Loop through all unique student/exam_set combinations
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
    BEGIN
      -- Calculate and update aggregate and division
      PERFORM calculate_aggregate_and_division(
        school_uuid,
        student_exam_set.student_id,
        student_exam_set.exam_set_id
      );
      processed_count := processed_count + 1;
      
      -- Log every 10 records
      IF processed_count % 10 = 0 THEN
        RAISE NOTICE 'Processed % combinations...', processed_count;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing student % exam_set %: %', 
        student_exam_set.student_id, 
        student_exam_set.exam_set_id, 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Completed! Backfilled aggregate and division for % student/exam_set combinations', processed_count;
END;
$$;

-- Step 7: Final verification
SELECT 
  'Step 7: Final Verification' as step,
  COUNT(*) as total_records,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

