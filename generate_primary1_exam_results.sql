-- Generate random exam results for all Primary 1 students
-- Subjects: English, Literacy I, Literacy II, Luganda, Mathematics, Reading, Religious Education (R.E)

-- Step 1: Create exam sets for Primary 1 (Mid-term and End-of-term for 2026)
INSERT INTO exam_sets (id, school_id, exam_name, exam_type, term, year, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 1 Mid-term 2026', 'Mid-term', 'Term 2', 2026, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 1 End-of-term 2026', 'End-of-term', 'Term 2', 2026, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Step 2: Get the exam set IDs we just created
WITH exam_set_ids AS (
  SELECT 
    id as exam_set_id,
    exam_name,
    exam_type
  FROM exam_sets 
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND exam_name LIKE 'Primary 1%2026'
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
-- Function to calculate grade based on marks
grade_calculation AS (
  SELECT 
    s.student_id,
    s.name,
    s.admission_number,
    es.exam_set_id,
    es.exam_name,
    es.exam_type,
    sub.subject,
    -- Generate random marks between 40-90
    (40 + (RANDOM() * 50))::INTEGER as marks_obtained,
    100 as total_marks
  FROM primary1_students s
  CROSS JOIN exam_set_ids es
  CROSS JOIN subjects sub
),
results_with_grades AS (
  SELECT 
    *,
    CASE 
      WHEN marks_obtained >= 80 THEN 'D1'
      WHEN marks_obtained >= 70 THEN 'D2'
      WHEN marks_obtained >= 65 THEN 'C3'
      WHEN marks_obtained >= 60 THEN 'C4'
      WHEN marks_obtained >= 55 THEN 'C5'
      WHEN marks_obtained >= 50 THEN 'C6'
      WHEN marks_obtained >= 45 THEN 'P7'
      WHEN marks_obtained >= 40 THEN 'P8'
      ELSE 'F9'
    END as grade,
    CASE 
      WHEN marks_obtained >= 80 THEN 'Excellent'
      WHEN marks_obtained >= 70 THEN 'Very Good'
      WHEN marks_obtained >= 60 THEN 'Good'
      WHEN marks_obtained >= 50 THEN 'Fair'
      WHEN marks_obtained >= 40 THEN 'Pass'
      ELSE 'Fail'
    END as remarks
  FROM grade_calculation
)
-- Step 3: Insert the exam results
INSERT INTO exam_results (
  id,
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  marks_obtained,
  total_marks,
  grade,
  remarks,
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
  marks_obtained::text,
  total_marks::text,
  grade,
  remarks,
  'T.P1', -- Teacher initials for Primary 1
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM results_with_grades;

-- Step 4: Verify the results were created
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT student_id) as students_with_results,
  COUNT(DISTINCT exam_set_id) as exam_sets,
  COUNT(DISTINCT subject) as subjects
FROM exam_results 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 1';

-- Step 5: Show sample results
SELECT 
  s.name,
  s.admission_number,
  es.exam_name,
  er.subject,
  er.marks_obtained,
  er.grade,
  er.remarks
FROM exam_results er
JOIN students s ON er.student_id = s.student_id
JOIN exam_sets es ON er.exam_set_id = es.id
WHERE er.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND er.class_name = 'Primary 1'
ORDER BY s.admission_number, es.exam_name, er.subject
LIMIT 20;