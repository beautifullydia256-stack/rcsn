-- Check if the problematic global admission number constraint exists

-- This will show you the exact constraint that's causing the import errors
SELECT 
  indexname,
  indexdef,
  'This is the problematic constraint' as note
FROM pg_indexes 
WHERE tablename = 'students' 
  AND (
    indexname = 'idx_students_admission_number' 
    OR indexname = 'students_admission_number_key'
    OR indexdef LIKE '%admission_number%'
  )
ORDER BY indexname;