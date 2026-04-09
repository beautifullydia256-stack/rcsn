-- Per-student UACE (A-Level) combination: up to 3 principals + up to 2 subsidiaries (max 5 total).
-- Names must match public.uace_subject_catalog (subject_type aligned with subject_role).
-- Teachers see only class peers who take the selected subject when entering exam results (app + optional strict mode).

CREATE OR REPLACE FUNCTION public.current_user_can_edit_student_uace_subjects()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
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

COMMENT ON FUNCTION public.current_user_can_edit_student_uace_subjects() IS
  'Admin, owner, head_teacher, or students.manage (not accountant) may edit UACE combinations.';

CREATE TABLE IF NOT EXISTS public.student_alevel_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  subject_role text NOT NULL CHECK (subject_role IN ('principal', 'subsidiary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_alevel_subjects_student_subject_unique UNIQUE (student_id, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_student_alevel_subjects_student
  ON public.student_alevel_subjects (student_id);
CREATE INDEX IF NOT EXISTS idx_student_alevel_subjects_school
  ON public.student_alevel_subjects (school_id);

COMMENT ON TABLE public.student_alevel_subjects IS
  'UACE subject lines per student (Senior 5–6): max 3 principals, 2 subsidiaries, 5 total.';

CREATE OR REPLACE FUNCTION public.student_alevel_subjects_row_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p int;
  s int;
  v_class text;
  v_stu_school uuid;
BEGIN
  SELECT trim(current_class), school_id
    INTO v_class, v_stu_school
  FROM public.students
  WHERE student_id = NEW.student_id;

  IF v_class IS NULL OR v_class !~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
    RAISE EXCEPTION
      'UACE subject combinations apply only to Senior 5 or Senior 6 (current class: %).',
      COALESCE(v_class, '(none)')
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.school_id IS DISTINCT FROM v_stu_school THEN
    RAISE EXCEPTION 'school_id must match the student''s school.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.uace_subject_catalog c
    WHERE c.subject_name = NEW.subject_name
      AND c.subject_type = NEW.subject_role
  ) THEN
    RAISE EXCEPTION 'Subject % is not a valid UACE % row in uace_subject_catalog.',
      NEW.subject_name, NEW.subject_role
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT
    count(*) FILTER (WHERE subject_role = 'principal'),
    count(*) FILTER (WHERE subject_role = 'subsidiary')
  INTO p, s
  FROM public.student_alevel_subjects
  WHERE student_id = NEW.student_id
    AND id IS DISTINCT FROM NEW.id;

  IF NEW.subject_role = 'principal' THEN
    p := p + 1;
  ELSE
    s := s + 1;
  END IF;

  IF p > 3 THEN
    RAISE EXCEPTION 'A student may have at most 3 principal (UACE) subjects.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF s > 2 THEN
    RAISE EXCEPTION 'A student may have at most 2 subsidiary (UACE) subjects.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p + s > 5 THEN
    RAISE EXCEPTION 'A student may have at most 5 UACE subjects in total.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_alevel_subjects_row_guard_trg ON public.student_alevel_subjects;
CREATE TRIGGER student_alevel_subjects_row_guard_trg
  BEFORE INSERT OR UPDATE ON public.student_alevel_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.student_alevel_subjects_row_guard();

ALTER TABLE public.student_alevel_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_alevel_subjects_select_school" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_select_school"
  ON public.student_alevel_subjects
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_alevel_subjects_insert" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_insert"
  ON public.student_alevel_subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_alevel_subjects_update" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_update"
  ON public.student_alevel_subjects
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_alevel_subjects_delete" ON public.student_alevel_subjects;
CREATE POLICY "student_alevel_subjects_delete"
  ON public.student_alevel_subjects
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_alevel_subjects TO authenticated;
