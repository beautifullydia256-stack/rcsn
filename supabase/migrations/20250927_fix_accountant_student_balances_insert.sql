-- Fix RLS policies to allow accountants to insert into students and student_balances
-- This is needed for accountants to add students and for the auto-initialization trigger

-- 1. Add INSERT policy for accountants on students table
CREATE POLICY "students_accountant_insert" ON students
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
);

-- 2. Add UPDATE policy for accountants on students table
CREATE POLICY "students_accountant_update" ON students
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
)
WITH CHECK (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
);

-- 3. Add INSERT policy for accountants on student_balances
CREATE POLICY "student_balances_accountant_insert" ON student_balances
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
);

-- 4. Add UPDATE policy for accountants on student_balances (for balance updates)
CREATE POLICY "student_balances_accountant_update" ON student_balances
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
)
WITH CHECK (
  school_id IN (
    SELECT u.school_id 
    FROM users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'accountant'
  )
);

-- 5. Also add INSERT policy for admins on student_balances (in case they add students)
CREATE POLICY "student_balances_admin_insert" ON student_balances
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM schools 
    WHERE admin_id = auth.uid()
  )
);

-- 6. Add UPDATE policy for admins on student_balances
CREATE POLICY "student_balances_admin_update" ON student_balances
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT school_id 
    FROM schools 
    WHERE admin_id = auth.uid()
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id 
    FROM schools 
    WHERE admin_id = auth.uid()
  )
);

COMMENT ON POLICY "students_accountant_insert" ON students IS 'Allows accountants to insert student records';
COMMENT ON POLICY "students_accountant_update" ON students IS 'Allows accountants to update student records';
COMMENT ON POLICY "student_balances_accountant_insert" ON student_balances IS 'Allows accountants to insert balance records (needed for auto-initialization trigger)';
COMMENT ON POLICY "student_balances_accountant_update" ON student_balances IS 'Allows accountants to update balance records (needed for payment triggers)';
COMMENT ON POLICY "student_balances_admin_insert" ON student_balances IS 'Allows admins to insert balance records (needed for auto-initialization trigger)';
COMMENT ON POLICY "student_balances_admin_update" ON student_balances IS 'Allows admins to update balance records (needed for payment triggers)';
