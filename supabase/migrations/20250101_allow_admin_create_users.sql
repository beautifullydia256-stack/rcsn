-- Allow admins to create user accounts for their school
-- This fixes the "User not allowed" error when admins try to create accountant/librarian accounts

-- Add policy for admins to insert users into their school
CREATE POLICY "admin insert users in school" ON users
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow if the inserter is an admin or owner in the same school
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role IN ('admin', 'owner')
  )
);

-- Add policy for admins to select users in their school (needed for checks)
DROP POLICY IF EXISTS "admin select users in school" ON users;
CREATE POLICY "admin select users in school" ON users
FOR SELECT TO authenticated
USING (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role IN ('admin', 'owner')
  )
);

-- Add policy for admins to update users in their school
DROP POLICY IF EXISTS "admin update users in school" ON users;
CREATE POLICY "admin update users in school" ON users
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role IN ('admin', 'owner')
  )
);

