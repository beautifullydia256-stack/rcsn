-- Check if affiliates table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'affiliates';

-- If it exists, check its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'affiliates' 
ORDER BY ordinal_position;