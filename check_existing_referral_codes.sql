-- Check existing referral codes
SELECT 
  id,
  code,
  is_active,
  expires_at,
  max_uses,
  current_uses,
  discount_type,
  discount_value,
  affiliate_id,
  created_at
FROM referral_codes 
ORDER BY created_at DESC 
LIMIT 10;