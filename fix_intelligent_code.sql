-- Fix the INTELLIGENT referral code to have proper type and use_count
UPDATE referral_codes 
SET 
  type = 'ADMIN',
  use_count = COALESCE(current_uses, 0)
WHERE code = 'INTELLIGENT';