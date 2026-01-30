-- Check what columns exist in expense_categories table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'expense_categories'
ORDER BY ordinal_position;




