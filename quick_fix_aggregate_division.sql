-- Quick fix: Calculate and update aggregate and division for all students
-- This directly updates the database without relying on the function

-- Step 1: Update aggregate and division using a direct UPDATE with subquery
UPDATE processed_primary_exam_results ppr
SET 
  aggregate = subq.calculated_aggregate,
  division = subq.calculated_division
FROM (
  SELECT 
    school_id,
    student_id,
    exam_set_id,
    -- Calculate aggregate: sum of grade points
    SUM(
      CASE 
        WHEN grade IS NULL OR grade = '' THEN 0
        ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
      END
    ) as calculated_aggregate,
    -- Calculate division from aggregate
    CASE
      WHEN SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) >= 4 AND SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) <= 12 THEN 'Division 1'
      WHEN SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) >= 13 AND SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) <= 23 THEN 'Division 2'
      WHEN SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) >= 24 AND SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) <= 29 THEN 'Division 3'
      WHEN SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) >= 30 AND SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) <= 34 THEN 'Division 4'
      WHEN SUM(
        CASE 
          WHEN grade IS NULL OR grade = '' THEN 0
          ELSE COALESCE((regexp_match(grade, '(\d+)'))[1]::INTEGER, 0)
        END
      ) >= 35 THEN 'U (Ungraded)'
      ELSE NULL
    END as calculated_division
  FROM processed_primary_exam_results
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND class_name = 'Primary 7'
    AND grade IS NOT NULL
    AND grade != ''
  GROUP BY school_id, student_id, exam_set_id
) subq
WHERE ppr.school_id = subq.school_id
  AND ppr.student_id = subq.student_id
  AND ppr.exam_set_id = subq.exam_set_id
  AND ppr.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND ppr.class_name = 'Primary 7';

-- Step 2: Verify the update
SELECT 
  'Verification' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Step 3: Show sample results
SELECT 
  student_name,
  exam_set_name,
  subject,
  grade,
  aggregate,
  division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
  AND exam_set_id = 'b6245fb1-5d55-4d49-9614-3b3db2a71ca4'
ORDER BY subject;

