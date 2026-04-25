-- Check exam structure to understand how to create results

-- Step 1: Check exam_results table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check exam_sets table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exam_sets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Check existing exam sets for Mulungi Infant Primary School
SELECT *
FROM exam_sets 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check what subjects are typically used for Primary 1
SELECT DISTINCT subject
FROM exam_results 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ORDER BY subject
LIMIT 10;