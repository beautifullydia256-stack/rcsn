-- Investigation: Why is class_teacher_comment missing but headteacher_comment showing?
-- This query will help us understand what data is in the database

-- 1. Check what's in processed_primary_exam_results for a nursery student
SELECT 
  student_id,
  class_name,
  subject,
  class_teacher_comment,
  headteacher_comment,
  exam_set_id,
  created_at
FROM processed_primary_exam_results
WHERE class_name IN ('Baby Class', 'Middle Class', 'Top Class')
  AND school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY student_id, subject
LIMIT 20;

-- 2. Check if class_teacher_comment is NULL or empty string
SELECT 
  COUNT(*) as total_rows,
  COUNT(class_teacher_comment) as non_null_class_teacher,
  COUNT(headteacher_comment) as non_null_headteacher,
  SUM(CASE WHEN class_teacher_comment IS NULL THEN 1 ELSE 0 END) as null_class_teacher,
  SUM(CASE WHEN class_teacher_comment = '' THEN 1 ELSE 0 END) as empty_class_teacher,
  SUM(CASE WHEN headteacher_comment IS NULL THEN 1 ELSE 0 END) as null_headteacher,
  SUM(CASE WHEN headteacher_comment = '' THEN 1 ELSE 0 END) as empty_headteacher
FROM processed_primary_exam_results
WHERE class_name IN ('Baby Class', 'Middle Class', 'Top Class')
  AND school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1);

-- 3. Check the nursery comment settings tables
SELECT 'class_teacher_nursery' as source, performance_level, comment_text
FROM class_teacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
UNION ALL
SELECT 'headteacher_nursery' as source, performance_level, comment_text
FROM headteacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY source, performance_level;

-- 4. Check a specific student's data to see the pattern
SELECT 
  student_id,
  subject,
  LENGTH(class_teacher_comment) as class_comment_length,
  LENGTH(headteacher_comment) as head_comment_length,
  LEFT(class_teacher_comment, 50) as class_comment_preview,
  LEFT(headteacher_comment, 50) as head_comment_preview
FROM processed_primary_exam_results
WHERE class_name IN ('Baby Class', 'Middle Class', 'Top Class')
  AND school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
  AND student_id = (
    SELECT student_id 
    FROM processed_primary_exam_results 
    WHERE class_name IN ('Baby Class', 'Middle Class', 'Top Class')
    LIMIT 1
  )
ORDER BY subject;
