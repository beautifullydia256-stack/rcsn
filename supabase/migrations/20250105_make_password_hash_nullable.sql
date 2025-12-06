-- Make password_hash nullable since we're using Supabase Auth
-- Passwords are stored in auth.users, not public.users
ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Add a comment explaining why it's nullable
COMMENT ON COLUMN public.users.password_hash IS 'Legacy column. Passwords are stored in auth.users via Supabase Auth. This column is kept for backward compatibility but should be NULL for new users.';

