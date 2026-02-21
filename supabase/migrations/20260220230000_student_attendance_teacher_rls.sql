-- student_attendance RLS: replace permissive "any authenticated" with school + teacher-by-class.
-- Table has no teacher_id; teachers allowed only for classes they teach (class_teachers / teacher_class_subjects).
-- Run one statement at a time if preferred: first DROP, then CREATE.

DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.student_attendance;
DROP POLICY IF EXISTS "student_attendance_school_and_teacher" ON public.student_attendance;

CREATE POLICY "student_attendance_school_and_teacher"
ON public.student_attendance
FOR ALL
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
  )
  OR (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) IN ('admin', 'owner', 'head_teacher')
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
  OR (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'teacher'
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
    AND class_name IN (
      SELECT class_name FROM public.class_teachers
      WHERE school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
        AND teacher_id IN (
          SELECT teacher_id FROM public.teachers t
          WHERE t.school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
            AND LOWER(TRIM(t.email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
        )
      UNION
      SELECT class_name FROM public.teacher_class_subjects
      WHERE school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
        AND teacher_id IN (
          SELECT teacher_id FROM public.teachers t
          WHERE t.school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
            AND LOWER(TRIM(t.email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
        )
    )
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
  )
  OR (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) IN ('admin', 'owner', 'head_teacher')
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
  OR (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'teacher'
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
    AND class_name IN (
      SELECT class_name FROM public.class_teachers
      WHERE school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
        AND teacher_id IN (
          SELECT teacher_id FROM public.teachers t
          WHERE t.school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
            AND LOWER(TRIM(t.email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
        )
      UNION
      SELECT class_name FROM public.teacher_class_subjects
      WHERE school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
        AND teacher_id IN (
          SELECT teacher_id FROM public.teachers t
          WHERE t.school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
            AND LOWER(TRIM(t.email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
        )
    )
  )
);
