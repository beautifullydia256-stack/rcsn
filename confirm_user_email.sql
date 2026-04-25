-- Confirm the user's email if it's not confirmed
-- This is often the cause of 406 errors

UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, NOW())
WHERE email = 'kimulidaudi5@gmail.com' 
AND email_confirmed_at IS NULL;

-- Check the result
SELECT 
    id,
    email,
    email_confirmed_at,
    phone_confirmed_at,
    created_at,
    raw_user_meta_data->'role' as metadata_role
FROM auth.users 
WHERE email = 'kimulidaudi5@gmail.com';