-- Add RLS policies for accountant role to access payments, students, and school_terms

-- Accountant can read students from their school
CREATE POLICY "students accountant select" ON students
FOR SELECT TO authenticated USING (
  school_id IN (
    SELECT u.school_id FROM users u 
    WHERE u.user_id = auth.uid() AND u.role = 'accountant'
  )
);

-- Accountant can read and insert payments for their school
CREATE POLICY "payments accountant select" ON payments
FOR SELECT TO authenticated USING (
  school_id IN (
    SELECT u.school_id FROM users u 
    WHERE u.user_id = auth.uid() AND u.role = 'accountant'
  )
);

CREATE POLICY "payments accountant insert" ON payments
FOR INSERT TO authenticated WITH CHECK (
  school_id IN (
    SELECT u.school_id FROM users u 
    WHERE u.user_id = auth.uid() AND u.role = 'accountant'
  )
);

-- Admin can also insert payments (not just select)
CREATE POLICY "payments admin insert" ON payments
FOR INSERT TO authenticated WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

-- Accountant can read school_terms for their school
CREATE POLICY "terms accountant select" ON school_terms
FOR SELECT TO authenticated USING (
  school_id IN (
    SELECT u.school_id FROM users u 
    WHERE u.user_id = auth.uid() AND u.role = 'accountant'
  )
);

