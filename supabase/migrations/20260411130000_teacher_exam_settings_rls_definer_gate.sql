-- Systematic RLS for teacher exam prefs/bands:
-- Policies only call STABLE SECURITY DEFINER helpers that read public.users with owner rights (no nested RLS surprises, no auth.users).
-- Confirmed from repo: public.users.user_id matches auth.uid(); teacher linkage via linked_teacher_id and/or email vs teachers.email.
--
-- Also defines get_authenticated_user_school_id() (already called from LegacyExamResultsFullPage) so school_id matches current_school_id().

CREATE OR REPLACE FUNCTION public.get_authenticated_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_authenticated_user_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_authenticated_user_school_id() TO authenticated;

COMMENT ON FUNCTION public.get_authenticated_user_school_id IS
  'Returns public.users.school_id for auth.uid(); use for API payloads so they match current_school_id() in RLS.';

CREATE OR REPLACE FUNCTION public.teacher_can_write_exam_class_prefs(p_school_id uuid, p_class_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_school uuid;
  v_role text;
  v_linked uuid;
  uemail text;
BEGIN
  IF uid IS NULL OR p_school_id IS NULL OR p_class_name IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.school_id, u.role::text, u.linked_teacher_id, nullif(lower(trim(u.email)), '')
  INTO v_school, v_role, v_linked, uemail
  FROM public.users u
  WHERE u.user_id = uid
  LIMIT 1;

  IF v_school IS NULL OR v_school <> p_school_id THEN
    RETURN false;
  END IF;

  IF v_role IN ('admin', 'owner', 'head_teacher') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_class_subjects tcs
    INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
    WHERE tcs.school_id = p_school_id
      AND trim(tcs.class_name) = trim(p_class_name)
      AND (
        (v_linked IS NOT NULL AND v_linked = tcs.teacher_id)
        OR (
          uemail IS NOT NULL
          AND t.email IS NOT NULL
          AND uemail = lower(trim(t.email))
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_can_write_exam_class_prefs(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_exam_class_prefs(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_write_exam_grade_bands(p_school_id uuid, p_class_name text, p_subject text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_school uuid;
  v_role text;
  v_linked uuid;
  uemail text;
BEGIN
  IF uid IS NULL OR p_school_id IS NULL OR p_class_name IS NULL OR p_subject IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.school_id, u.role::text, u.linked_teacher_id, nullif(lower(trim(u.email)), '')
  INTO v_school, v_role, v_linked, uemail
  FROM public.users u
  WHERE u.user_id = uid
  LIMIT 1;

  IF v_school IS NULL OR v_school <> p_school_id THEN
    RETURN false;
  END IF;

  IF v_role IN ('admin', 'owner', 'head_teacher') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_class_subjects tcs
    INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
    WHERE tcs.school_id = p_school_id
      AND trim(tcs.class_name) = trim(p_class_name)
      AND trim(tcs.subject) = trim(p_subject)
      AND (
        (v_linked IS NOT NULL AND v_linked = tcs.teacher_id)
        OR (
          uemail IS NOT NULL
          AND t.email IS NOT NULL
          AND uemail = lower(trim(t.email))
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_can_write_exam_grade_bands(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_exam_grade_bands(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.teacher_can_write_exam_class_prefs IS
  'True if auth user may INSERT/UPDATE/DELETE shared teacher_exam_class_prefs for this school+class (admin roles or assigned teacher by link or email).';

COMMENT ON FUNCTION public.teacher_can_write_exam_grade_bands IS
  'True if auth user may change teacher_exam_grade_bands for this school+class+subject.';

-- Replace write policies: no nested public.users / auth.jwt in policy text.
DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;

CREATE POLICY tegp_prefs_all ON public.teacher_exam_class_prefs
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.teacher_can_write_exam_class_prefs(school_id, class_name)
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND public.teacher_can_write_exam_class_prefs(school_id, class_name)
  );

DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;

CREATE POLICY tegb_bands_all ON public.teacher_exam_grade_bands
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.teacher_can_write_exam_grade_bands(school_id, class_name, subject)
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND public.teacher_can_write_exam_grade_bands(school_id, class_name, subject)
  );
