-- Check the actual structure of teacher_comment_rules table
-- Run this in Supabase SQL Editor to see what columns exist

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'teacher_comment_rules' 
AND table_schema = 'public'
ORDER BY ordinal_position;
