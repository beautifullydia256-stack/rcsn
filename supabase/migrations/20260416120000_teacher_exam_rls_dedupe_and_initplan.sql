-- Remove legacy FOR ALL policies if they were re-created by an older migration after the split
-- (tegp_prefs_all + tegp_prefs_* causes duplicate permissive policies + duplicate initplan warnings).
-- Recreate split policies only: no current_school_id() in policy text; use (select auth.*) lowercase per linter.

DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;

DROP POLICY IF EXISTS tegp_prefs_insert ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_update ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_delete ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_select ON public.teacher_exam_class_prefs;

DROP POLICY IF EXISTS tegb_bands_insert ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_update ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_delete ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_select ON public.teacher_exam_grade_bands;

CREATE POLICY tegp_prefs_insert ON public.teacher_exam_class_prefs
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegp_prefs_update ON public.teacher_exam_class_prefs
  FOR UPDATE TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegp_prefs_delete ON public.teacher_exam_class_prefs
  FOR DELETE TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegp_prefs_select ON public.teacher_exam_class_prefs
  FOR SELECT TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
  );

CREATE POLICY tegb_bands_insert ON public.teacher_exam_grade_bands
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegb_bands_update ON public.teacher_exam_grade_bands
  FOR UPDATE TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegb_bands_delete ON public.teacher_exam_grade_bands
  FOR DELETE TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (select auth.uid())
          AND u.school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (select auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce((select auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY tegb_bands_select ON public.teacher_exam_grade_bands
  FOR SELECT TO authenticated
  USING (
    school_id = (select school_id from public.users where user_id = (select auth.uid()) limit 1)
  );
