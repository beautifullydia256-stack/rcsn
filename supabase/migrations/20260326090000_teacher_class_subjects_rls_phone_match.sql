-- teacher_class_subjects SELECT for teachers was email-only (users ↔ teachers).
-- Staff with no email or mismatched email could not read their rows even when
-- resolveTeacherId matched by phone in the app. Align RLS with phone fallback.

CREATE OR REPLACE FUNCTION public.phone_digits_last9(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
    THEN right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9)
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.phone_digits_last9(text) IS
  'Last 9 digits for phone match (e.g. +256 vs 07…); used by teacher_class_subjects RLS.';

DROP POLICY IF EXISTS "teachers_read_own_assignments" ON public.teacher_class_subjects;

CREATE POLICY "teachers_read_own_assignments" ON public.teacher_class_subjects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.teachers t
      ON t.school_id = u.school_id
    WHERE u.user_id = (SELECT auth.uid())
      AND u.role = 'teacher'
      AND t.teacher_id = teacher_class_subjects.teacher_id
      AND t.school_id = teacher_class_subjects.school_id
      AND (
        (
          t.email IS NOT NULL
          AND u.email IS NOT NULL
          AND lower(trim(t.email)) = lower(trim(u.email))
        )
        OR (
          public.phone_digits_last9(t.phone) IS NOT NULL
          AND public.phone_digits_last9(u.phone) IS NOT NULL
          AND public.phone_digits_last9(t.phone) = public.phone_digits_last9(u.phone)
        )
      )
  )
);

COMMENT ON POLICY "teachers_read_own_assignments" ON public.teacher_class_subjects IS
  'Teachers read rows where users links to teachers by email or by matching phone (last 9 digits).';
