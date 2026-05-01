-- Quick check: Are report comments actually in the database?

-- 1. Check if processed_primary_exam_results has ANY comments
SELECT 
  COUNT(*) as total_rows,
  COUNT(class_teacher_comment) as rows_with_class_comment,
  COUNT(headteacher_comment) as rows_with_head_comment,
  SUM(CASE WHEN class_teacher_comment IS NOT NULL AND class_teacher_comment != '' THEN 1 ELSE 0 END) as non_empty_class_comment,
  SUM(CASE WHEN headteacher_comment IS NOT NULL AND headteacher_comment != '' THEN 1 ELSE 0 END) as non_empty_head_comment
FROM processed_primary_exam_results
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1);

-- 2. Show actual comment values for a few students
SELECT 
  student_id,
  class_name,
  subject,
  class_teacher_comment,
  headteacher_comment,
  LENGTH(COALESCE(class_teacher_comment, '')) as class_comment_length,
  LENGTH(COALESCE(headteacher_comment, '')) as head_comment_length
FROM processed_primary_exam_results
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
  AND class_name NOT IN ('Baby Class', 'Middle Class', 'Top Class')  -- Non-nursery
LIMIT 10;

-- 3. Check if comment settings exist
SELECT 'class_teacher_comments_settings' as table_name, COUNT(*) as count
FROM class_teacher_comments_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
UNION ALL
SELECT 'headteacher_comments_settings' as table_name, COUNT(*) as count
FROM headteacher_comments_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1);

-- 4. Show the comment settings
SELECT 'class_teacher' as type, class_name, min_percent, max_percent, comment_text
FROM class_teacher_comments_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY class_name, min_percent
UNION ALL
SELECT 'headteacher' as type, NULL as class_name, min_percent, max_percent, comment_text
FROM headteacher_comments_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY min_percent;
