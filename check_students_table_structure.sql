-- Check students table structure to fix the policy
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'students'
ORDER BY ordinal_position;

-- Also check published_student_reports table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'published_student_reports'
ORDER BY ordinal_position;