-- Quick fix V2: Simpler approach using CTE
-- This is cleaner and easier to understand

WITH aggregate_calculations AS (
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
    ) as calculated_aggregate
  FROM processed_primary_exam_results
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND class_name = 'Primary 7'
    AND grade IS NOT NULL
    AND grade != ''
  GROUP BY school_id, student_id, exam_set_id
),
division_calculations AS (
  SELECT 
    school_id,
    student_id,
    exam_set_id,
    calculated_aggregate,
    -- Calculate division from aggregate
    CASE
      WHEN calculated_aggregate >= 4 AND calculated_aggregate <= 12 THEN 'Division 1'
      WHEN calculated_aggregate >= 13 AND calculated_aggregate <= 23 THEN 'Division 2'
      WHEN calculated_aggregate >= 24 AND calculated_aggregate <= 29 THEN 'Division 3'
      WHEN calculated_aggregate >= 30 AND calculated_aggregate <= 34 THEN 'Division 4'
      WHEN calculated_aggregate >= 35 THEN 'U (Ungraded)'
      ELSE NULL
    END as calculated_division
  FROM aggregate_calculations
)
UPDATE processed_primary_exam_results ppr
SET 
  aggregate = dc.calculated_aggregate,
  division = dc.calculated_division
FROM division_calculations dc
WHERE ppr.school_id = dc.school_id
  AND ppr.student_id = dc.student_id
  AND ppr.exam_set_id = dc.exam_set_id
  AND ppr.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND ppr.class_name = 'Primary 7';

-- Verify the update
SELECT 
  'After Update' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division,
  MIN(aggregate) as min_aggregate,
  MAX(aggregate) as max_aggregate
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Show sample results for the specific student
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
  AND student_id = '124868ec-37e0-406a-9a54-12e9c627320d'
ORDER BY exam_set_name, subject
LIMIT 20;

