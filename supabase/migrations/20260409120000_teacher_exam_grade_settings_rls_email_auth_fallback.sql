-- Further RLS fixes for teacher_exam_class_prefs / teacher_exam_grade_bands:
-- 1) Email match even when linked_teacher_id is wrong or points elsewhere (still tied to tcs.teacher_id via teachers row).
-- 2) Fallback to auth.users.email when public.users.email is empty (login email).
-- 3) Keeps trim() on class_name / subject.

DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;

CREATE POLICY tegp_prefs_all ON public.teacher_exam_class_prefs
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_class_prefs.school_id
          AND trim(tcs.class_name) = trim(teacher_exam_class_prefs.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(coalesce(
                nullif(trim(u.email), ''),
                (SELECT nullif(trim(au.email), '') FROM auth.users au WHERE au.id = auth.uid() LIMIT 1),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_class_prefs.school_id
          AND trim(tcs.class_name) = trim(teacher_exam_class_prefs.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(coalesce(
                nullif(trim(u.email), ''),
                (SELECT nullif(trim(au.email), '') FROM auth.users au WHERE au.id = auth.uid() LIMIT 1),
                ''
              )))
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;

CREATE POLICY tegb_bands_all ON public.teacher_exam_grade_bands
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_grade_bands.school_id
          AND trim(tcs.class_name) = trim(teacher_exam_grade_bands.class_name)
          AND trim(tcs.subject) = trim(teacher_exam_grade_bands.subject)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(coalesce(
                nullif(trim(u.email), ''),
                (SELECT nullif(trim(au.email), '') FROM auth.users au WHERE au.id = auth.uid() LIMIT 1),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_grade_bands.school_id
          AND trim(tcs.class_name) = trim(teacher_exam_grade_bands.class_name)
          AND trim(tcs.subject) = trim(teacher_exam_grade_bands.subject)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(coalesce(
                nullif(trim(u.email), ''),
                (SELECT nullif(trim(au.email), '') FROM auth.users au WHERE au.id = auth.uid() LIMIT 1),
                ''
              )))
            )
          )
      )
    )
  );
