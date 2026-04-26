-- Check the actual schema of referral_codes table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'referral_codes' 
ORDER BY ordinal_position;