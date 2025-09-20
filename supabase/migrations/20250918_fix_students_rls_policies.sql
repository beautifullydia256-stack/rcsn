-- Fix RLS policies for students table to allow teachers to access students from their school

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "students admin all" ON public.students;
DROP POLICY IF EXISTS "students teacher view" ON public.students;
DROP POLICY IF EXISTS "students teacher view assigned classes" ON public.students;
DROP POLICY IF EXISTS "students student view own" ON public.students;

-- Create new RLS policies for students table

-- Policy for admins to manage all students in their school
CREATE POLICY "students admin all" ON public.students
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
    AND u.role = 'admin'
    AND u.school_id = students.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
    AND u.role = 'admin'
    AND u.school_id = students.school_id
  )
);

-- Policy for teachers to view students only in classes they are assigned to teach
CREATE POLICY "students teacher view assigned classes" ON public.students
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN auth.users au ON au.id = u.user_id
    JOIN public.teacher_class_subjects tcs ON tcs.teacher_id::text = au.raw_user_meta_data->>'teacher_id'
    WHERE u.user_id = auth.uid()
    AND u.role = 'teacher'
    AND u.school_id = students.school_id
    AND au.raw_user_meta_data->>'teacher_id' IS NOT NULL
    AND tcs.class_name = students.current_class
    AND tcs.school_id = students.school_id
  )
);

-- Policy for students to view their own record
CREATE POLICY "students student view own" ON public.students
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN auth.users au ON au.id = u.user_id
    WHERE u.user_id = auth.uid()
    AND u.role = 'student'
    AND u.school_id = students.school_id
    AND au.raw_user_meta_data->>'student_id' = students.student_id::text
  )
);

-- Ensure RLS is enabled on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
