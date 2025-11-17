-- Check grades, aggregate, and division data for school: 406bf29b-d7fd-457c-aa56-e29b9ef1a16d
-- This will help diagnose why grades, aggregate, and division are empty in the report preview

-- 1. Check if grades exist in processed_primary_exam_results
SELECT 
  'Grades Check' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as records_with_grade,
  COUNT(CASE WHEN grade IS NULL OR grade = '' THEN 1 END) as records_without_grade,
  COUNT(DISTINCT grade) as unique_grades
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- 2. Check if aggregate and division exist
SELECT 
  'Aggregate/Division Check' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as records_with_aggregate,
  COUNT(CASE WHEN aggregate IS NULL THEN 1 END) as records_without_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as records_with_division,
  COUNT(CASE WHEN division IS NULL OR division = '' THEN 1 END) as records_without_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7';

-- 3. Sample data - show a few records with their grades, aggregate, and division
SELECT 
  student_name,
  exam_set_name,
  subject,
  marks_obtained,
  grade,
  aggregate,
  division,
  teacher_remark
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
ORDER BY student_name, exam_set_name, subject
LIMIT 20;

-- 4. Check by exam set - see which exam sets have data
SELECT 
  exam_set_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as with_grade,
  COUNT(CASE WHEN aggregate IS NOT NULL THEN 1 END) as with_aggregate,
  COUNT(CASE WHEN division IS NOT NULL AND division != '' THEN 1 END) as with_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
GROUP BY exam_set_name
ORDER BY exam_set_name;

-- 5. Check unique student/exam_set combinations that need aggregate/division calculation
SELECT 
  student_id,
  student_name,
  exam_set_id,
  exam_set_name,
  COUNT(*) as subject_count,
  COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as subjects_with_grade,
  MAX(aggregate) as current_aggregate,
  MAX(division) as current_division
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
GROUP BY student_id, student_name, exam_set_id, exam_set_name
ORDER BY student_name, exam_set_name
LIMIT 10;

