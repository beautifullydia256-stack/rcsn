-- Add missing roles to users table constraint
-- This fixes "User not allowed" error when creating accountant, librarian, or head_teacher accounts

-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with all roles including accountant, librarian, head_teacher
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner','admin','teacher','parent','student','accountant','librarian','head_teacher'));

-- Add helpful comment
COMMENT ON COLUMN users.role IS 'User role: owner, admin, teacher, parent, student, accountant, librarian, or head_teacher';

