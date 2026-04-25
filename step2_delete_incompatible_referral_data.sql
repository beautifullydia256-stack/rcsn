-- Delete the existing referral code that has incompatible type 'ADMIN'
-- This will allow us to add the new columns with proper constraints
DELETE FROM referral_codes 
WHERE type = 'ADMIN' AND code = 'INTELIGENT-DEFAULT';