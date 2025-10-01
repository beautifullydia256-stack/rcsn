-- Sync user roles from users table to auth.users metadata
-- This fixes login redirect issues after role updates

-- This is a one-time fix to ensure all users have their role in user_metadata
-- Note: This uses a DO block since we can't directly update auth.users from SQL
-- You'll need to run this through Supabase Dashboard or use the Management API

-- For now, let's just document what needs to be done:
-- IMPORTANT: After running the previous migrations, you may need to:
-- 1. Log out completely
-- 2. Clear your browser cookies/cache
-- 3. Log back in
-- 
-- Alternatively, run this in Supabase SQL Editor:
--
-- SELECT auth.uid() AS current_user_id;
-- 
-- Then check if your role is in the users table:
-- SELECT user_id, email, role FROM users WHERE user_id = '<your-user-id>';
--
-- If the role is correct in users table but login still fails, 
-- you may need to refresh the auth user metadata using Supabase's Management API

COMMENT ON TABLE users IS 'User roles must match between auth.users.user_metadata.role and users.role';

