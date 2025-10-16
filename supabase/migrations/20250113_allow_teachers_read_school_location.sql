-- Allow teachers to read their school's location data for attendance verification
-- This is needed for the location verification system to work for teachers

-- Add policy for teachers to read their school's location data
CREATE POLICY "teachers can read school location" ON schools
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()
    AND u.role = 'teacher'
    AND u.school_id = schools.school_id
  )
);

-- Also allow other school staff to read school location data
CREATE POLICY "school staff can read school location" ON schools
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()
    AND u.role IN ('teacher', 'accountant', 'librarian', 'head_teacher')
    AND u.school_id = schools.school_id
  )
);
