-- Fix admission number constraint issue
-- This removes the global unique constraint and replaces it with per-school uniqueness

-- Step 1: Drop the problematic global unique indexes
DROP INDEX IF EXISTS public.idx_students_admission_number;
DROP INDEX IF EXISTS public.students_admission_number_key;

-- Step 2: Create per-school uniqueness constraint instead
-- This allows the same admission number pattern in different schools
CREATE UNIQUE INDEX IF NOT EXISTS students_school_admission_number_key
  ON public.students (school_id, lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- Step 3: Verify the fix worked
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'students' 
  AND indexname LIKE '%admission%';

-- Step 4: Check if there are any remaining constraint conflicts
SELECT 
  school_id,
  admission_number,
  COUNT(*) as duplicate_count
FROM students 
WHERE admission_number IS NOT NULL 
  AND trim(admission_number) <> ''
GROUP BY school_id, admission_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;