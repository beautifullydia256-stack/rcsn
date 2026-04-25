-- Check if our referral_codes table structure matches what the validation logic expects

-- The validation logic expects these columns:
-- id, affiliate_id, type, is_active, expires_at, max_uses, use_count, affiliates (FK)

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'referral_codes' 
ORDER BY ordinal_position;

-- Check if we have the expected columns
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_codes' AND column_name = 'affiliate_id') 
    THEN 'EXISTS' ELSE 'MISSING' END as affiliate_id_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_codes' AND column_name = 'type') 
    THEN 'EXISTS' ELSE 'MISSING' END as type_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_codes' AND column_name = 'use_count') 
    THEN 'EXISTS' ELSE 'MISSING' END as use_count_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_codes' AND column_name = 'current_uses') 
    THEN 'EXISTS' ELSE 'MISSING' END as current_uses_status;