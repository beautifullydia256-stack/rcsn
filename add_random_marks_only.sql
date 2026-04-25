-- Add random marks for Primary 1 students using existing exam sets
-- Only adding marks_obtained and total_marks - grades will be calculated automatically

-- Step 1: Get existing exam sets for the school
SELECT 
  id as exam_set_id,
  name,
  term,
  year,
  is_active
FROM exam_sets 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND year = 2026
  AND term = 1
ORDER BY name;

-- Step 2: Add random exam results for Primary 1 students
-- Using Mid Term and End of Term exam sets
WITH existing_exam_sets AS (
  SELECT 
    id as exam_set_id,
    name as exam_name
  FROM exam_sets 
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND year = 2026
    AND term = 1
    AND name IN ('Mid Term', 'End of Term')
),
primary1_students AS (
  SELECT 
    student_id,
    name,
    admission_number
  FROM students 
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND admission_number ~ '^RIP202604[0-9]{3}$'
),
subjects AS (
  SELECT unnest(ARRAY['English', 'Literacy I', 'Literacy II', 'Luganda', 'Mathematics', 'Reading', 'Religious Education (R.E)']) as subject
),
random_results AS (
  SELECT 
    s.student_id,
    es.exam_set_id,
    sub.subject,
    -- Generate random marks between 40-90
    (40 + (RANDOM() * 50))::INTEGER as marks_obtained,
    100 as total_marks
  FROM primary1_students s
  CROSS JOIN existing_exam_sets es
  CROSS JOIN subjects sub
)
-- Insert only marks - let system calculate grades automatically
INSERT INTO exam_results (
  id,
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  marks_obtained,
  total_marks,
  teacher_initials,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d',
  exam_set_id,
  student_id,
  'Primary 1',
  subject,
  marks_obtained,
  total_marks,
  'T.P1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM random_results;

-- Step 3: Verify results were created
SELECT 
  COUNT(*) as total_results_created,
  COUNT(DISTINCT student_id) as students_with_results,
  COUNT(DISTINCT exam_set_id) as exam_sets_used,
  COUNT(DISTINCT subject) as subjects_covered
FROM exam_results 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 1'
  AND created_at >= CURRENT_DATE;