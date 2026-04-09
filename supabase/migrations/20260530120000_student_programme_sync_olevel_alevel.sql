-- O-Level / A-Level programme sync when students.current_class changes (and on insert).
-- S1–2: mirror all class_subjects rows for the new class onto student_olevel_subjects.
-- S3–4: drop any profile row that is not compulsory for the new class; insert missing compulsories.
-- S5–6: clear O-Level rows; ensure General Paper exists on student_alevel_subjects.
-- UACE guard: at most one elective subsidiary (non–General Paper); General Paper cannot be deleted.

CREATE OR REPLACE FUNCTION public.ensure_student_general_paper_alevel(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_gp text;
BEGIN
  SELECT school_id INTO v_school FROM public.students WHERE student_id = p_student_id;
  IF v_school IS NULL THEN
    RETURN;
  END IF;

  SELECT trim(c.subject_name)
    INTO v_gp
  FROM public.uace_subject_catalog c
  WHERE c.subject_type = 'subsidiary'
    AND lower(trim(c.subject_name)) = 'general paper'
  LIMIT 1;

  IF v_gp IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.student_alevel_subjects (school_id, student_id, subject_name, subject_role)
  VALUES (v_school, p_student_id, v_gp, 'subsidiary')
  ON CONFLICT (student_id, subject_name) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_student_general_paper_alevel(uuid) IS
  'Idempotent insert of General Paper as UACE subsidiary for A-Level students.';

REVOKE ALL ON FUNCTION public.ensure_student_general_paper_alevel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_student_general_paper_alevel(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- After class change (or new student): sync learner subject tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.students_programme_follow_class_trg_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text := trim(both from NEW.current_class);
  v_old text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := trim(both from COALESCE(OLD.current_class, ''));
    IF v_new IS NOT DISTINCT FROM v_old THEN
      RETURN NEW;
    END IF;
  END IF;

  -- A-Level: clear O-Level rows; ensure General Paper
  IF v_new ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    PERFORM public.ensure_student_general_paper_alevel(NEW.student_id);
    RETURN NEW;
  END IF;

  -- O-Level Senior 1–2: full class list on learner profile
  IF v_new ~* '^(senior\s*[12]|s\.?\s*[12])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  -- O-Level Senior 3–4: only compulsories stay (or are seeded); subsidiaries are re-picked manually
  IF v_new ~* '^(senior\s*[34]|s\.?\s*[34])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects s
    WHERE s.student_id = NEW.student_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id
          AND trim(both from cs.class_name) = v_new
          AND trim(both from cs.subject) = trim(both from s.subject_name)
          AND cs.uce_offering_type = 'compulsory'
      );

    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
      AND cs.uce_offering_type = 'compulsory'
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Left O-Level: clear learner UCE rows
  IF TG_OP = 'UPDATE' THEN
    IF v_old ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
       AND v_new !~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)' THEN
      DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    END IF;

    IF v_old ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
       AND v_new !~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
      DELETE FROM public.student_alevel_subjects WHERE student_id = NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_programme_follow_class_trg ON public.students;
CREATE TRIGGER students_programme_follow_class_trg
  AFTER INSERT OR UPDATE OF current_class ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.students_programme_follow_class_trg_fn();

COMMENT ON FUNCTION public.students_programme_follow_class_trg_fn() IS
  'Sync student_olevel_subjects / A-Level GP when current_class changes; see migration header.';

-- -----------------------------------------------------------------------------
-- UACE row guard: 3 principals; max 2 subsidiaries with one GP + max 1 elective
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_alevel_subjects_row_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p int;
  s int;
  non_gp int;
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
    count(*) FILTER (WHERE subject_role = 'subsidiary'),
    count(*) FILTER (WHERE subject_role = 'subsidiary' AND subject_name !~* 'general\s*paper')
  INTO p, s, non_gp
  FROM public.student_alevel_subjects
  WHERE student_id = NEW.student_id
    AND id IS DISTINCT FROM NEW.id;

  IF NEW.subject_role = 'principal' THEN
    p := p + 1;
  ELSE
    s := s + 1;
    IF NEW.subject_name !~* 'general\s*paper' THEN
      non_gp := non_gp + 1;
    END IF;
  END IF;

  IF p > 3 THEN
    RAISE EXCEPTION 'A student may have at most 3 principal (UACE) subjects.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF non_gp > 1 THEN
    RAISE EXCEPTION 'A student may have at most 1 elective UACE subsidiary (General Paper is automatic).'
      USING ERRCODE = 'check_violation';
  END IF;
  IF s > 2 THEN
    RAISE EXCEPTION 'A student may have at most 2 UACE subsidiary rows (General Paper + one elective).'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p + s > 5 THEN
    RAISE EXCEPTION 'A student may have at most 5 UACE subjects in total.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.subject_role = 'subsidiary' AND NEW.subject_name ~* 'general\s*paper' THEN
    IF EXISTS (
      SELECT 1 FROM public.student_alevel_subjects
      WHERE student_id = NEW.student_id
        AND subject_role = 'subsidiary'
        AND subject_name ~* 'general\s*paper'
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'General Paper is already on this learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Prevent removing General Paper for A-Level students
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_alevel_subjects_prevent_gp_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_class text;
BEGIN
  SELECT trim(current_class) INTO v_class FROM public.students WHERE student_id = OLD.student_id;
  IF v_class ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
     AND OLD.subject_name ~* 'general\s*paper'
     AND OLD.subject_role = 'subsidiary' THEN
    RAISE EXCEPTION 'General Paper is compulsory for all A-Level students and cannot be removed.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS student_alevel_subjects_prevent_gp_delete_trg ON public.student_alevel_subjects;
CREATE TRIGGER student_alevel_subjects_prevent_gp_delete_trg
  BEFORE DELETE ON public.student_alevel_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.student_alevel_subjects_prevent_gp_delete();

COMMENT ON TABLE public.student_alevel_subjects IS
  'UACE lines per student (Senior 5–6): 3 principals + General Paper (automatic) + 1 elective subsidiary.';

-- -----------------------------------------------------------------------------
-- Backfill General Paper for existing A-Level students
-- -----------------------------------------------------------------------------
INSERT INTO public.student_alevel_subjects (school_id, student_id, subject_name, subject_role)
SELECT st.school_id, st.student_id, cat.subject_name, 'subsidiary'
FROM public.students st
CROSS JOIN LATERAL (
  SELECT trim(c.subject_name) AS subject_name
  FROM public.uace_subject_catalog c
  WHERE c.subject_type = 'subsidiary'
    AND lower(trim(c.subject_name)) = 'general paper'
  LIMIT 1
) cat
WHERE trim(st.current_class) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
ON CONFLICT (student_id, subject_name) DO NOTHING;
