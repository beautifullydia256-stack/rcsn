-- Create random exam results for all Primary 1 students
-- Subjects: English, Literacy I, Literacy II, Luganda, Mathematics, Reading, Religious Education (R.E)
-- Two exam sets: Mid-term and End-of-term for current year (2026)

-- Step 1: Check current exam structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Get all Primary 1 students from Mulungi Infant Primary School
SELECT 
  student_id,
  name,
  admission_number
FROM students 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND admission_number ~ '^RIP202604[0-9]{3}$'
ORDER BY admission_number
LIMIT 5;

-- Step 3: Check existing exam sets and results structure by looking at Primary 2
SELECT *
FROM exam_sets 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check Primary 2 exam results to understand the structure
SELECT *
FROM exam_results 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 2'
ORDER BY created_at DESC
LIMIT 10;