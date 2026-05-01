-- URGENT: Both class teacher and head teacher comments are showing as empty dots
-- We need to trace the data flow from settings → processed_primary_exam_results → report

-- Step 1: Verify comment settings exist
SELECT 'CLASS_TEACHER_NURSERY_SETTINGS' as check_name, COUNT(*) as count
FROM class_teacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
UNION ALL
SELECT 'HEADTEACHER_NURSERY_SETTINGS' as check_name, COUNT(*) as count
FROM headteacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1);

-- Step 2: Show actual comment settings
SELECT 'class_teacher' as type, performance_level, comment_text
FROM class_teacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY performance_level
UNION ALL
SELECT 'headteacher' as type, performance_level, comment_text
FROM headteacher_nursery_comment_settings
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
ORDER BY performance_level;

-- Step 3: Check if processed_primary_exam_results has ANY comments for nursery
SELECT 
  class_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN class_teacher_comment IS NOT NULL AND class_teacher_comment != '' THEN 1 END) as rows_with_class_comment,
  COUNT(CASE WHEN headteacher_comment IS NOT NULL AND headteacher_comment != '' THEN 1 END) as rows_with_head_comment
FROM processed_primary_exam_results
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
  AND class_name IN ('Baby Class', 'Middle Class', 'Top Class')
GROUP BY class_name;

-- Step 4: Show actual data for ONE nursery student (all subjects)
SELECT 
  student_id,
  class_name,
  subject,
  COALESCE(class_teacher_comment, 'NULL') as class_comment,
  COALESCE(headteacher_comment, 'NULL') as head_comment,
  LENGTH(COALESCE(class_teacher_comment, '')) as class_comment_length,
  LENGTH(COALESCE(headteacher_comment, '')) as head_comment_length
FROM processed_primary_exam_results
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
  AND class_name IN ('Baby Class', 'Middle Class', 'Top Class')
  AND student_id = (
    SELECT student_id 
    FROM processed_primary_exam_results 
    WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1)
      AND class_name IN ('Baby Class', 'Middle Class', 'Top Class')
    LIMIT 1
  )
ORDER BY subject;

-- Step 5: Check if resolve_processed_comments function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%resolve%comment%'
ORDER BY routine_name;

-- Step 6: Manually test the nursery performance level resolution for one student
-- Replace STUDENT_ID_HERE with an actual student_id from step 4
/*
SELECT public.resolve_nursery_overall_performance_level(
  'STUDENT_ID_HERE'::uuid,
  (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1),
  (SELECT id FROM exam_sets WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1) ORDER BY created_at DESC LIMIT 1)
);
*/

-- Step 7: Check if triggers are set up on comment settings tables
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN (
  'class_teacher_nursery_comment_settings',
  'headteacher_nursery_comment_settings',
  'headteacher_comments_settings',
  'class_teacher_comments_settings'
)
ORDER BY event_object_table, trigger_name;
