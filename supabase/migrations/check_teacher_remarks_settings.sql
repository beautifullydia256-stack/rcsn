-- Check if teacher_remarks_settings table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'teacher_remarks_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
