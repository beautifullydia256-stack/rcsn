-- Fix RLS policies for teacher_class_subjects table to allow teachers to read their own assignments

-- Add policy for teachers to read their own assignments
CREATE POLICY "tcs teacher read own" ON teacher_class_subjects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN auth.users au ON au.id = u.user_id
    WHERE u.user_id = auth.uid()
    AND u.role = 'teacher'
    AND u.school_id = teacher_class_subjects.school_id
    AND (
      -- Match by teacher_id in user metadata
      au.raw_user_meta_data->>'teacher_id' = teacher_class_subjects.teacher_id::text
      OR
      -- Match by email if teacher_id not in metadata
      EXISTS (
        SELECT 1 FROM public.teachers t
        WHERE t.teacher_id = teacher_class_subjects.teacher_id
        AND t.school_id = teacher_class_subjects.school_id
        AND t.email = au.email
      )
    )
  )
);
