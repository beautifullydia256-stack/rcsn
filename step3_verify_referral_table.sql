-- Verify the referral_codes table structure after adding missing columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'referral_codes' 
ORDER BY ordinal_position;

-- Also check if there are any existing referral codes
SELECT COUNT(*) as total_codes FROM referral_codes;

-- Show sample of existing data if any
SELECT id, code, discount_type, discount_value, current_uses, is_active, created_at 
FROM referral_codes 
LIMIT 5;