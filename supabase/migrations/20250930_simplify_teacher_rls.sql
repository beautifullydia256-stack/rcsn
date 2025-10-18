-- Simplify teacher RLS policies by removing conflicting ones and creating a single clear policy

-- Drop all existing teacher-related policies to avoid conflicts
DROP POLICY IF EXISTS "tcs teacher select direct" ON teacher_class_subjects;
DROP POLICY IF EXISTS "tcs teacher select via jwt email" ON teacher_class_subjects;
DROP POLICY IF EXISTS "tcs teacher read own" ON teacher_class_subjects;
DROP POLICY IF EXISTS "tcs teacher select" ON teacher_class_subjects;

-- Create a single, simple policy for teachers to read their own assignments
CREATE POLICY "teachers_read_own_assignments" ON teacher_class_subjects
FOR SELECT TO authenticated
USING (
  -- Allow if user is a teacher and the assignment belongs to them
  EXISTS (
    SELECT 1 FROM users u
    JOIN teachers t ON t.email = u.email AND t.school_id = u.school_id
    WHERE u.user_id = auth.uid()
    AND u.role = 'teacher'
    AND t.teacher_id = teacher_class_subjects.teacher_id
    AND t.school_id = teacher_class_subjects.school_id
  )
);
