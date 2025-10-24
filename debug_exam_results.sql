-- Debug query to check exam results in database
-- Run this in Supabase SQL Editor to see what's actually saved

-- Check all exam results for the specific school, class, and exam set
SELECT 
  id,
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  teacher_id,
  activity_score,
  formative_score,
  exam_score,
  final_score,
  created_at,
  updated_at
FROM exam_results 
WHERE school_id = '092f1f06-4d10-452f-8ede-779add44d193'
  AND class_name = 'Senior 1'
  AND exam_set_id = 'feda023d-ccc4-4a9e-b47d-b00c8c75dbd5'
  AND subject = 'English Language'
  AND teacher_id = 'd2280c6c-7d9e-45e3-bac5-1a7c095d5b07';

-- Also check without teacher_id filter to see if data exists
SELECT 
  id,
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  teacher_id,
  activity_score,
  formative_score,
  exam_score,
  final_score,
  created_at,
  updated_at
FROM exam_results 
WHERE school_id = '092f1f06-4d10-452f-8ede-779add44d193'
  AND class_name = 'Senior 1'
  AND exam_set_id = 'feda023d-ccc4-4a9e-b47d-b00c8c75dbd5'
  AND subject = 'English Language';

-- Check all exam results for this school to see the pattern
SELECT 
  id,
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  teacher_id,
  activity_score,
  formative_score,
  exam_score,
  final_score,
  created_at,
  updated_at
FROM exam_results 
WHERE school_id = '092f1f06-4d10-452f-8ede-779add44d193'
ORDER BY created_at DESC
LIMIT 10;
