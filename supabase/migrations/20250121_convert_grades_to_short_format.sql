-- Convert grades from full format to short format
-- Credit 5 -> C5, Credit 4 -> C4, Division 1 -> D1, etc.
-- This ensures consistency across the system

-- Update exam_results table
UPDATE exam_results
SET grade = CASE
  WHEN grade = 'Division 1' THEN 'D1'
  WHEN grade = 'Division 2' THEN 'D2'
  WHEN grade = 'Credit 3' THEN 'C3'
  WHEN grade = 'Credit 4' THEN 'C4'
  WHEN grade = 'Credit 5' THEN 'C5'
  WHEN grade = 'Credit 6' THEN 'C6'
  WHEN grade = 'Pass 7' THEN 'P7'
  WHEN grade = 'Pass 8' THEN 'P8'
  WHEN grade = 'F9' THEN 'F9'
  WHEN grade = 'U (Ungraded)' THEN 'U'
  ELSE grade  -- Keep other formats as-is
END
WHERE grade IN ('Division 1', 'Division 2', 'Credit 3', 'Credit 4', 'Credit 5', 'Credit 6', 'Pass 7', 'Pass 8', 'U (Ungraded)');

-- Update processed_primary_exam_results table
UPDATE processed_primary_exam_results
SET grade = CASE
  WHEN grade = 'Division 1' THEN 'D1'
  WHEN grade = 'Division 2' THEN 'D2'
  WHEN grade = 'Credit 3' THEN 'C3'
  WHEN grade = 'Credit 4' THEN 'C4'
  WHEN grade = 'Credit 5' THEN 'C5'
  WHEN grade = 'Credit 6' THEN 'C6'
  WHEN grade = 'Pass 7' THEN 'P7'
  WHEN grade = 'Pass 8' THEN 'P8'
  WHEN grade = 'F9' THEN 'F9'
  WHEN grade = 'U (Ungraded)' THEN 'U'
  ELSE grade  -- Keep other formats as-is
END
WHERE grade IN ('Division 1', 'Division 2', 'Credit 3', 'Credit 4', 'Credit 5', 'Credit 6', 'Pass 7', 'Pass 8', 'U (Ungraded)');

-- Update the calculate_aggregate_and_division function to handle both formats
-- The regex already handles both formats, but we should ensure it works correctly
-- The regex '(\d+)' extracts numbers from both "C5" and "Credit 5", so it should work

-- Verify the conversion
SELECT 
  'Conversion Summary' as info,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade LIKE 'D%' OR grade LIKE 'C%' OR grade LIKE 'P%' OR grade = 'F9' OR grade = 'U' THEN 1 END) as short_format_count,
  COUNT(CASE WHEN grade LIKE '%Credit%' OR grade LIKE '%Division%' OR grade LIKE '%Pass%' THEN 1 END) as full_format_count
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- Show sample converted grades
SELECT 
  'Sample Converted Grades' as info,
  student_name,
  exam_set_name,
  subject,
  grade,
  marks_obtained
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
ORDER BY student_name, exam_set_name, subject
LIMIT 20;

