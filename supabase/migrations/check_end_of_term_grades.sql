-- Check if End of Term results have grades in the database
-- This will help diagnose why grades are empty when "All Exam Sets" is selected

-- Check End of Term results with grades
SELECT 
  'End of Term Results with Grades' as check_type,
  student_name,
  exam_set_name,
  exam_set_id,
  subject,
  marks_obtained,
  grade,
  teacher_remark
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
  AND grade IS NOT NULL
  AND grade != ''
ORDER BY student_name, subject, exam_set_name
LIMIT 30;

-- Check if there are multiple End of Term exam sets
SELECT 
  'Multiple End of Term Exam Sets' as check_type,
  exam_set_id,
  exam_set_name,
  COUNT(DISTINCT student_id) as students_count,
  COUNT(*) as total_records
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
GROUP BY exam_set_id, exam_set_name
ORDER BY exam_set_name;

-- Check for subjects that have End of Term marks but no grades
SELECT 
  'Subjects with Marks but No Grades' as check_type,
  student_name,
  subject,
  exam_set_name,
  marks_obtained,
  grade,
  CASE 
    WHEN marks_obtained IS NOT NULL AND marks_obtained > 0 AND (grade IS NULL OR grade = '') THEN 'MISSING GRADE'
    ELSE 'OK'
  END as status
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
  AND marks_obtained IS NOT NULL
  AND marks_obtained > 0
  AND (grade IS NULL OR grade = '')
ORDER BY student_name, subject;

