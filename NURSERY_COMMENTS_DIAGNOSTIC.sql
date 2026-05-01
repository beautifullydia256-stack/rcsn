-- Nursery Comments Diagnostic Queries
-- Run these to diagnose why Class Teacher comments are not showing on nursery reports

-- 1. Check if nursery comment settings exist for your school
-- Replace 'YOUR_SCHOOL_ID' with your actual school_id
SELECT 'Class Teacher Nursery Comments' as setting_type, * 
FROM class_teacher_nursery_comment_settings 
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY performance_level;

SELECT 'Head Teacher Nursery Comments' as setting_type, * 
FROM headteacher_nursery_comment_settings 
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY performance_level;

-- 2. Check if a specific student has nursery_skill_performance data
-- Replace 'YOUR_STUDENT_ID' with the student whose report is missing comments
SELECT 
  student_id,
  class_name,
  subject,
  nursery_skill_performance,
  marks_obtained,
  total_marks
FROM exam_results
WHERE student_id = 'YOUR_STUDENT_ID'
  AND nursery_skill_performance IS NOT NULL
LIMIT 5;

-- 3. Check what performance levels are in the nursery_skill_performance
-- This shows the actual data structure
SELECT 
  student_id,
  class_name,
  jsonb_object_keys(nursery_skill_performance::jsonb) as skill_key,
  nursery_skill_performance::jsonb ->> jsonb_object_keys(nursery_skill_performance::jsonb) as performance_level
FROM exam_results
WHERE student_id = 'YOUR_STUDENT_ID'
  AND nursery_skill_performance IS NOT NULL
LIMIT 15;

-- 4. Count frequency of performance levels for a student (what the code does)
WITH skill_levels AS (
  SELECT 
    student_id,
    class_name,
    jsonb_each_text(nursery_skill_performance::jsonb) as skill_data
  FROM exam_results
  WHERE student_id = 'YOUR_STUDENT_ID'
    AND nursery_skill_performance IS NOT NULL
  LIMIT 1
)
SELECT 
  (skill_data).value as performance_level,
  COUNT(*) as frequency
FROM skill_levels
GROUP BY (skill_data).value
ORDER BY frequency DESC, 
  CASE (skill_data).value
    WHEN 'VERY_GOOD' THEN 1
    WHEN 'GOOD' THEN 2
    WHEN 'NEEDS_IMPROVEMENT' THEN 3
    WHEN 'TRIES' THEN 4
    ELSE 5
  END;

-- 5. Check if percentage-based comments exist as fallback
SELECT 'Class Teacher Percentage Comments' as setting_type, * 
FROM class_teacher_comments_settings 
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND class_name IN ('Baby Class', 'Middle Class', 'Top Class')
ORDER BY class_name, min_percent;

SELECT 'Head Teacher Percentage Comments' as setting_type, * 
FROM headteacher_comments_settings 
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY min_percent;

-- 6. Check if there are saved overrides in report_comments
SELECT * 
FROM report_comments
WHERE student_id = 'YOUR_STUDENT_ID'
  AND term = 1  -- Replace with current term
  AND year = 2025  -- Replace with current year
ORDER BY comment_type;

-- INSTRUCTIONS:
-- 1. Replace 'YOUR_SCHOOL_ID' with your actual school_id
-- 2. Replace 'YOUR_STUDENT_ID' with the student whose report is missing comments
-- 3. Replace term and year with the current values
-- 4. Run each query and check the results

-- EXPECTED RESULTS:
-- Query 1-2: Should return 4 rows each (VERY_GOOD, GOOD, NEEDS_IMPROVEMENT, TRIES)
-- Query 3: Should return rows showing nursery_skill_performance exists
-- Query 4: Should show which performance level appears most frequently
-- Query 5: Should return percentage-based fallback comments
-- Query 6: May be empty (no saved overrides) or show custom comments
