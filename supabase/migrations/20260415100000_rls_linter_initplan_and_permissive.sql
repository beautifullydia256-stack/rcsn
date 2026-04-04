-- Supabase linter: auth_rls_initplan (wrap auth.* in sub-SELECT for stable plan)
-- + multiple_permissive_policies (split FOR ALL that overlaps SELECT; merge duplicate SELECT/INSERT where safe).
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Helper used by exam prefs/bands RLS: initplan-safe auth.uid() inside function body.
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 1) user_in_app_notifications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "in_app_notif_select_own" ON public.user_in_app_notifications;
CREATE POLICY "in_app_notif_select_own"
  ON public.user_in_app_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "in_app_notif_update_own" ON public.user_in_app_notifications;
CREATE POLICY "in_app_notif_update_own"
  ON public.user_in_app_notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) teachers — initplan + ensure INSERT policy exists for school staff
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "teachers_select" ON public.teachers;
CREATE POLICY "teachers_select" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND school_id IS NOT NULL
    )
    OR (
      (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'teacher'
      AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
      AND LOWER(TRIM(email)) = LOWER(
        TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1))
      )
    )
  );

DROP POLICY IF EXISTS teachers_insert_school_staff ON public.teachers;
CREATE POLICY teachers_insert_school_staff ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) expense_subcategories — initplan + single SELECT (split admin FOR ALL → IUD)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "expense_subcategories_select_school" ON public.expense_subcategories;
CREATE POLICY "expense_subcategories_select_school"
  ON public.expense_subcategories FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "expense_subcategories_admin_write" ON public.expense_subcategories;
DROP POLICY IF EXISTS "expense_subcategories_admin_insert" ON public.expense_subcategories;
DROP POLICY IF EXISTS "expense_subcategories_admin_update" ON public.expense_subcategories;
DROP POLICY IF EXISTS "expense_subcategories_admin_delete" ON public.expense_subcategories;

CREATE POLICY "expense_subcategories_admin_insert" ON public.expense_subcategories
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT s.school_id FROM public.schools s WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "expense_subcategories_admin_update" ON public.expense_subcategories
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT s.school_id FROM public.schools s WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT s.school_id FROM public.schools s WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "expense_subcategories_admin_delete" ON public.expense_subcategories
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT s.school_id FROM public.schools s WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4) teacher exam prefs / bands — initplan; tegp_* / tegb_* = INSERT|UPDATE|DELETE only (SELECT stays *_select)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_insert ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_update ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_delete ON public.teacher_exam_class_prefs;

CREATE POLICY tegp_prefs_insert ON public.teacher_exam_class_prefs
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
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
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
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
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_insert ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_update ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_delete ON public.teacher_exam_grade_bands;

CREATE POLICY tegb_bands_insert ON public.teacher_exam_grade_bands
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
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
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
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
    school_id = (SELECT public.current_school_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = (SELECT public.current_school_id())
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
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
                nullif(trim(coalesce(((SELECT auth.jwt()) ->> 'email'), '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

-- 4b) teacher exam SELECT policies — wrap current_school_id() for auth_rls_initplan
DROP POLICY IF EXISTS tegp_prefs_select ON public.teacher_exam_class_prefs;
CREATE POLICY tegp_prefs_select ON public.teacher_exam_class_prefs
  FOR SELECT TO authenticated
  USING (school_id = (SELECT public.current_school_id()));

DROP POLICY IF EXISTS tegb_bands_select ON public.teacher_exam_grade_bands;
CREATE POLICY tegb_bands_select ON public.teacher_exam_grade_bands
  FOR SELECT TO authenticated
  USING (school_id = (SELECT public.current_school_id()));

-- ---------------------------------------------------------------------------
-- 5) grading_scale — one SELECT (grading_scale_select); writers split (drop overlapping FOR ALL modify)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "grading_scale_modify" ON public.grading_scale;
DROP POLICY IF EXISTS "grading_scale_insert" ON public.grading_scale;
DROP POLICY IF EXISTS "grading_scale_update" ON public.grading_scale;
DROP POLICY IF EXISTS "grading_scale_delete" ON public.grading_scale;

CREATE POLICY "grading_scale_insert" ON public.grading_scale
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "grading_scale_update" ON public.grading_scale
  FOR UPDATE TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "grading_scale_delete" ON public.grading_scale
  FOR DELETE TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  );

-- ---------------------------------------------------------------------------
-- 6) notifications — single SELECT + single INSERT (initplan-safe)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_user_view" ON public.notifications;
DROP POLICY IF EXISTS "notifications_school_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_authenticated" ON public.notifications;

CREATE POLICY "notifications_select_authenticated" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      school_id IS NOT NULL
      AND school_id IN (
        SELECT u.school_id FROM public.users u
        WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "notifications_school_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_create" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IS NULL
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 7) other_staff_members — manage = IUD only (accountant SELECT stays alone)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "other_staff_manage_school" ON public.other_staff_members;
DROP POLICY IF EXISTS "other_staff_manage_insert" ON public.other_staff_members;
DROP POLICY IF EXISTS "other_staff_manage_update" ON public.other_staff_members;
DROP POLICY IF EXISTS "other_staff_manage_delete" ON public.other_staff_members;

CREATE POLICY "other_staff_manage_insert" ON public.other_staff_members
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

CREATE POLICY "other_staff_manage_update" ON public.other_staff_members
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

CREATE POLICY "other_staff_manage_delete" ON public.other_staff_members
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

DROP POLICY IF EXISTS "other_staff_select_accountant" ON public.other_staff_members;
CREATE POLICY "other_staff_select_accountant" ON public.other_staff_members
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('accountant', 'admin', 'owner', 'head_teacher')
    )
  );

-- ---------------------------------------------------------------------------
-- 8) classes — single SELECT: delegated accounting OR same-school / school admin (replaces optimized + delegated pair)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "classes_delegated_accounting_select" ON public.classes;
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.classes;
DROP POLICY IF EXISTS "classes_select_authenticated" ON public.classes;

CREATE POLICY "classes_select_authenticated" ON public.classes
  FOR SELECT TO authenticated
  USING (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = classes.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 9) schools — drop duplicate SELECT (staff location read is implied by schools_unified same-school clause)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "school staff can read school location" ON public.schools;

-- ---------------------------------------------------------------------------
-- 10) school_expenses — merge optimized + delegated into one FOR ALL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.school_expenses;
DROP POLICY IF EXISTS "school_expenses_delegated_select" ON public.school_expenses;
DROP POLICY IF EXISTS "school_expenses_delegated_insert" ON public.school_expenses;
DROP POLICY IF EXISTS "school_expenses_authenticated" ON public.school_expenses;

CREATE POLICY "school_expenses_authenticated" ON public.school_expenses
  FOR ALL TO authenticated
  USING (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = school_expenses.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = school_expenses.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 11) student_balances — merge optimized + delegated policies into one FOR ALL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_select" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_insert" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_update" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_authenticated" ON public.student_balances;

CREATE POLICY "student_balances_authenticated" ON public.student_balances
  FOR ALL TO authenticated
  USING (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = student_balances.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = student_balances.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 12) student_payments — merge optimized + delegated FOR ALL into one
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.student_payments;
DROP POLICY IF EXISTS "student_payments_delegated_accounting" ON public.student_payments;
DROP POLICY IF EXISTS "student_payments_authenticated" ON public.student_payments;

CREATE POLICY "student_payments_authenticated" ON public.student_payments
  FOR ALL TO authenticated
  USING (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = student_payments.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.school_id = student_payments.school_id
          AND p.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 13) teacher_documents — one SELECT; staff write = INSERT/UPDATE/DELETE only (no duplicate SELECT from FOR ALL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "teacher_documents_select_school" ON public.teacher_documents;
DROP POLICY IF EXISTS "teacher_documents_write_staff" ON public.teacher_documents;
DROP POLICY IF EXISTS "teacher_documents_insert_staff" ON public.teacher_documents;
DROP POLICY IF EXISTS "teacher_documents_update_staff" ON public.teacher_documents;
DROP POLICY IF EXISTS "teacher_documents_delete_staff" ON public.teacher_documents;

CREATE POLICY "teacher_documents_select_school" ON public.teacher_documents
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  );

CREATE POLICY "teacher_documents_insert_staff" ON public.teacher_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  );

CREATE POLICY "teacher_documents_update_staff" ON public.teacher_documents
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  );

CREATE POLICY "teacher_documents_delete_staff" ON public.teacher_documents
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  );
