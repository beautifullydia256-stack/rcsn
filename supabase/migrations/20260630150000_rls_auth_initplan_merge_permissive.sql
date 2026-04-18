-- Supabase linter:
-- 0003_auth_rls_initplan: wrap auth.uid() as (select auth.uid()) so it is not re-evaluated per row.
-- 0006_multiple_permissive_policies: one permissive policy per role/action where noted.

-- Helper used by student_* RLS: single initplan-friendly auth read
CREATE OR REPLACE FUNCTION public.current_user_can_edit_student_uace_subjects()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role_norm TEXT;
  v_school UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT u.school_id, lower(regexp_replace(trim(COALESCE(u.role, '')), '\s+', '_', 'g'))
    INTO v_school, v_role_norm
  FROM public.users u
  WHERE u.user_id = v_uid
  LIMIT 1;
  IF v_school IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_role_norm = 'accountant' THEN
    RETURN FALSE;
  END IF;
  IF v_role_norm IN ('admin', 'owner', 'head_teacher') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_school_permissions p
    WHERE p.user_id = v_uid
      AND p.school_id = v_school
      AND p.permission_key = 'students.manage'
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- student_alevel_subjects
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "student_alevel_subjects_select_school" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_select_school"
  ON public.student_alevel_subjects
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "student_alevel_subjects_insert" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_insert"
  ON public.student_alevel_subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_alevel_subjects_update" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_update"
  ON public.student_alevel_subjects
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_alevel_subjects_delete" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_delete"
  ON public.student_alevel_subjects
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

-- -----------------------------------------------------------------------------
-- student_olevel_subjects
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "student_olevel_subjects_select_school" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_select_school"
  ON public.student_olevel_subjects FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "student_olevel_subjects_insert" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_insert"
  ON public.student_olevel_subjects FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_olevel_subjects_update" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_update"
  ON public.student_olevel_subjects FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_olevel_subjects_delete" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_delete"
  ON public.student_olevel_subjects FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
    AND public.current_user_can_edit_student_uace_subjects()
  );

-- -----------------------------------------------------------------------------
-- school_uace_class_subject_papers: single FOR ALL policy (avoids duplicate SELECT)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "school_uace_papers_select_school" ON public.school_uace_class_subject_papers;
DROP POLICY IF EXISTS "school_uace_papers_mutate_staff" ON public.school_uace_class_subject_papers;

CREATE POLICY "school_uace_papers_authenticated_all"
  ON public.school_uace_class_subject_papers
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "school_uace_papers_authenticated_all" ON public.school_uace_class_subject_papers IS
  'Staff in same school: CRUD on UACE paper config. Replaces separate SELECT + FOR ALL policies (linter: single permissive policy per action).';

-- -----------------------------------------------------------------------------
-- report_snapshots: one SELECT policy (OR of staff / parent / student paths)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "report_snapshots_select_staff_school" ON public.report_snapshots;
DROP POLICY IF EXISTS "report_snapshots_select_parent_child" ON public.report_snapshots;
DROP POLICY IF EXISTS "report_snapshots_select_student_own" ON public.report_snapshots;

CREATE POLICY "report_snapshots_select_authenticated"
  ON public.report_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.school_id = report_snapshots.school_id
        AND lower(trim(u.role::text)) IN (
          'admin',
          'accountant',
          'teacher',
          'head_teacher',
          'owner',
          'librarian',
          'lab_technician',
          'clinician'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.parents p
        ON p.student_id = gr.student_id
        AND p.parent_id = (SELECT auth.uid())
        AND p.school_id = report_snapshots.school_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.users u
        ON u.user_id = (SELECT auth.uid())
        AND u.student_id = gr.student_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
  );

COMMENT ON POLICY "report_snapshots_select_authenticated" ON public.report_snapshots IS
  'Staff by school, parents via child reports, students via own generated_reports. Single policy for linter.';

-- -----------------------------------------------------------------------------
-- school_chat_participants: one SELECT policy
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "school_chat_participants_select_in_shared_conversation" ON public.school_chat_participants;
DROP POLICY IF EXISTS "school_chat_participants_select_self" ON public.school_chat_participants;

CREATE POLICY "school_chat_participants_select_authenticated"
  ON public.school_chat_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.school_chat_user_is_participant(
      school_chat_participants.conversation_id,
      (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "school_chat_participants_select_authenticated" ON public.school_chat_participants IS
  'Own participant row or any row in a conversation the user participates in.';

SELECT pg_notify('pgrst', 'reload schema');
