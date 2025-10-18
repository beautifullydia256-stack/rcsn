-- Check processed results for primary schools only
-- Filter by school type to see only primary school data

-- First, let's see which schools are primary schools
SELECT 
  s.school_id,
  s.name,
  s.type
FROM schools s
WHERE s.type = 'Nursery/Primary';

-- Now check processed results for primary schools only
SELECT 
  pper.school_id,
  s.name as school_name,
  s.type as school_type,
  pper.subject,
  pper.teacher_initials,
  pper.teacher_remark,
  pper.marks_obtained,
  pper.total_marks,
  pper.exam_set_name,
  pper.student_name,
  pper.class_name
FROM processed_primary_exam_results pper
JOIN schools s ON s.school_id = pper.school_id
WHERE s.type = 'Nursery/Primary'
ORDER BY s.name, pper.student_name, pper.subject
LIMIT 20;

-- Count processed results by school type
SELECT 
  s.type as school_type,
  COUNT(*) as processed_results_count
FROM processed_primary_exam_results pper
JOIN schools s ON s.school_id = pper.school_id
GROUP BY s.type;
