-- Test referral functionality
-- 1. Check existing referral codes
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

-- 2. Check if INTELLIGENT code exists
SELECT 
  id,
  code,
  is_active,
  expires_at,
  max_uses,
  current_uses,
  affiliate_id
FROM referral_codes 
WHERE UPPER(code) = 'INTELLIGENT';

-- 3. Check affiliates table
SELECT 
  affiliate_id,
  name,
  email,
  status,
  created_at
FROM affiliates 
ORDER BY created_at DESC 
LIMIT 5;