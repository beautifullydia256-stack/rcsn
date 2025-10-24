-- Check the current schema of exam_results table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
AND table_schema = 'public'
ORDER BY ordinal_position;
