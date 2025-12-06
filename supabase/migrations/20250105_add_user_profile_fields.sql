-- Add phone, department, and position columns to users table
-- These fields are useful for admin, accountant, and librarian accounts

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT;

-- Add index on phone for faster lookups (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;

-- Add index on department for filtering (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department) WHERE department IS NOT NULL;

