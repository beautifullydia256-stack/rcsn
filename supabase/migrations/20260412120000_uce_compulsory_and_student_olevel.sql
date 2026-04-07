-- UCE (S1–S4): 7 default compulsory subjects (nationwide); rest default subsidiary in catalog.
-- class_subjects: uce_offering_type + is_non_removable_default; default compulsories cannot be deleted.
-- student_olevel_subjects: per learner (S1–S4); S3–S4 max 3 subsidiaries and max 10 subjects total.

-- Same helper as 20260411120000_student_alevel_subjects.sql (idempotent if that migration already ran).
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

-- 1) Catalog: compulsory vs subsidiary (default offering)
ALTER TABLE public.uce_subject_catalog
  ADD COLUMN IF NOT EXISTS catalog_offering text NOT NULL DEFAULT 'subsidiary';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uce_subject_catalog_offering_check'
  ) THEN
    ALTER TABLE public.uce_subject_catalog
      ADD CONSTRAINT uce_subject_catalog_offering_check
      CHECK (catalog_offering IN ('compulsory', 'subsidiary'));
  END IF;
END $$;

UPDATE public.uce_subject_catalog u
SET catalog_offering = 'compulsory'
WHERE u.subject_name IN (
  'Biology',
  'Chemistry',
  'Mathematics',
  'Physics',
  'English Language',
  'Geography',
  'History and Political Education'
);

UPDATE public.uce_subject_catalog u
SET catalog_offering = 'subsidiary'
WHERE u.subject_name NOT IN (
  'Biology',
  'Chemistry',
  'Mathematics',
  'Physics',
  'English Language',
  'Geography',
  'History and Political Education'
);

COMMENT ON COLUMN public.uce_subject_catalog.catalog_offering IS
  'Nationwide default: compulsory core vs subsidiary pool for UCE (S1–S4).';

-- 2) class_subjects metadata for O-Level rows
ALTER TABLE public.class_subjects
  ADD COLUMN IF NOT EXISTS uce_offering_type text;

ALTER TABLE public.class_subjects
  ADD COLUMN IF NOT EXISTS is_non_removable_default boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_subjects_uce_offering_type_check'
  ) THEN
    ALTER TABLE public.class_subjects
      ADD CONSTRAINT class_subjects_uce_offering_type_check
      CHECK (uce_offering_type IS NULL OR uce_offering_type IN ('compulsory', 'subsidiary'));
  END IF;
END $$;

COMMENT ON COLUMN public.class_subjects.uce_offering_type IS
  'For Senior 1–4: whether this class offers the subject as compulsory or subsidiary.';
COMMENT ON COLUMN public.class_subjects.is_non_removable_default IS
  'True for nationwide default UCE compulsory rows; schools cannot remove them.';

UPDATE public.class_subjects cs
SET
  uce_offering_type = u.catalog_offering,
  is_non_removable_default = (u.catalog_offering = 'compulsory')
FROM public.uce_subject_catalog u
WHERE
  TRIM(cs.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])\b'
  AND TRIM(cs.subject) = TRIM(u.subject_name);

-- 3) Extend class_subjects trigger: UACE subsidiaries + UCE locked compulsories + school CASCADE
CREATE OR REPLACE FUNCTION public.class_subjects_protect_uace_subsidiaries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cascading_school text;
  is_uace_sub boolean;
BEGIN
  v_cascading_school := NULLIF(trim(current_setting('app.cascade_deleting_school_id', true)), '');

  IF TG_OP = 'DELETE' THEN
    IF v_cascading_school IS NOT NULL AND v_cascading_school = OLD.school_id::text THEN
      RETURN OLD;
    END IF;

    IF COALESCE(OLD.is_non_removable_default, false)
       AND OLD.uce_offering_type = 'compulsory'
       AND TRIM(OLD.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])\b' THEN
      RAISE EXCEPTION
        'Default UCE compulsory subjects cannot be removed for Senior 1–4 (subject: %, class: %).',
        TRIM(OLD.subject), TRIM(OLD.class_name)
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.uace_subject_catalog u
      WHERE u.subject_type = 'subsidiary'
        AND u.subject_name = TRIM(OLD.subject)
    ) INTO is_uace_sub;
    IF TRIM(OLD.class_name) IN ('Senior 5', 'Senior 6') AND is_uace_sub THEN
      RAISE EXCEPTION
        'UACE subsidiary subjects cannot be removed for class % (subject: %). Principals can still be removed.',
        TRIM(OLD.class_name), TRIM(OLD.subject)
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_non_removable_default, false)
       AND OLD.uce_offering_type = 'compulsory'
       AND TRIM(OLD.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])\b' THEN
      IF TRIM(NEW.class_name) IS DISTINCT FROM TRIM(OLD.class_name)
         OR TRIM(NEW.subject) IS DISTINCT FROM TRIM(OLD.subject)
         OR NEW.uce_offering_type IS DISTINCT FROM OLD.uce_offering_type
         OR NEW.is_non_removable_default IS DISTINCT FROM OLD.is_non_removable_default THEN
        RAISE EXCEPTION
          'Default UCE compulsory rows cannot be renamed, moved, or retyped for Senior 1–4.';
      END IF;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.uace_subject_catalog u
      WHERE u.subject_type = 'subsidiary'
        AND u.subject_name = TRIM(OLD.subject)
    ) INTO is_uace_sub;
    IF TRIM(OLD.class_name) IN ('Senior 5', 'Senior 6') AND is_uace_sub THEN
      IF TRIM(NEW.class_name) IS DISTINCT FROM TRIM(OLD.class_name)
         OR TRIM(NEW.subject) IS DISTINCT FROM TRIM(OLD.subject) THEN
        RAISE EXCEPTION
          'UACE subsidiary subjects cannot be renamed or moved for Senior 5–6 (was: % / %).',
          TRIM(OLD.class_name), TRIM(OLD.subject)
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) New school defaults: seed class_subjects with UCE offering columns
CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_current_term INTEGER;
BEGIN
  IF NEW.type = 'Primary' OR NEW.type = 'Nursery/Primary' THEN
    INSERT INTO public.subjects (school_id, name, is_core) VALUES
      (NEW.school_id, 'LITERACY I', true),
      (NEW.school_id, 'LITERACY II', true),
      (NEW.school_id, 'SCIENCE', true),
      (NEW.school_id, 'SOCIAL STUDIES', true),
      (NEW.school_id, 'ENGLISH', true),
      (NEW.school_id, 'MATHEMATICS', true);

    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Primary 1', 1000),
      (NEW.school_id, 'Primary 2', 1000),
      (NEW.school_id, 'Primary 3', 1000),
      (NEW.school_id, 'Primary 4', 1000),
      (NEW.school_id, 'Primary 5', 1000),
      (NEW.school_id, 'Primary 6', 1000),
      (NEW.school_id, 'Primary 7', 1000);

  ELSIF NEW.type = 'Secondary' THEN
    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Senior 1', 1000),
      (NEW.school_id, 'Senior 2', 1000),
      (NEW.school_id, 'Senior 3', 1000),
      (NEW.school_id, 'Senior 4', 1000),
      (NEW.school_id, 'Senior 5', 1000),
      (NEW.school_id, 'Senior 6', 1000);

    INSERT INTO public.class_subjects (school_id, class_name, subject, uce_offering_type, is_non_removable_default)
    SELECT
      NEW.school_id,
      c.class_name,
      u.subject_name,
      CASE WHEN u.catalog_offering = 'compulsory' THEN 'compulsory'::text ELSE 'subsidiary'::text END,
      (u.catalog_offering = 'compulsory')
    FROM (
      VALUES ('Senior 1'), ('Senior 2'), ('Senior 3'), ('Senior 4')
    ) AS c(class_name)
    CROSS JOIN public.uce_subject_catalog u;

    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT NEW.school_id, c.class_name, u.subject_name
    FROM (
      VALUES ('Senior 5'), ('Senior 6')
    ) AS c(class_name)
    CROSS JOIN public.uace_subject_catalog u;
  END IF;

  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  IF v_current_month >= 1 AND v_current_month <= 4 THEN
    v_current_term := 1;
  ELSIF v_current_month >= 5 AND v_current_month <= 8 THEN
    v_current_term := 2;
  ELSE
    v_current_term := 3;
  END IF;

  INSERT INTO public.school_terms (school_id, year, term, start_date, end_date, is_current) VALUES
    (NEW.school_id, v_current_year, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', (v_current_term = 1)),
    (NEW.school_id, v_current_year, 2, CURRENT_DATE + INTERVAL '3 months', CURRENT_DATE + INTERVAL '6 months', (v_current_term = 2)),
    (NEW.school_id, v_current_year, 3, CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE + INTERVAL '9 months', (v_current_term = 3));

  INSERT INTO public.expense_categories (school_id, name, description, is_default) VALUES
    (NEW.school_id, 'Tuition Fees', 'Regular tuition fees', true),
    (NEW.school_id, 'Registration Fees', 'Student registration fees', true),
    (NEW.school_id, 'Examination Fees', 'Examination and assessment fees', true),
    (NEW.school_id, 'Library Fees', 'Library and resource fees', true),
    (NEW.school_id, 'Sports Fees', 'Sports and extracurricular fees', true);

  PERFORM public.setup_default_teacher_remarks_for_school(NEW.school_id);

  IF NEW.type = 'Nursery/Primary' OR NEW.type = 'Primary' THEN
    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      NEW.school_id,
      exam_name,
      term_number,
      v_current_year,
      true,
      NOW(),
      NOW()
    FROM (
      VALUES
        ('Mid Term', 1),
        ('End of Term', 1),
        ('Mid Term', 2),
        ('End of Term', 2),
        ('Mid Term', 3),
        ('End of Term', 3)
    ) AS exam_types(exam_name, term_number)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.exam_sets es
      WHERE es.school_id = NEW.school_id
        AND es.name = exam_types.exam_name
        AND es.term = exam_types.term_number
        AND es.year = v_current_year
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5) student_olevel_subjects
CREATE TABLE IF NOT EXISTS public.student_olevel_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_olevel_subjects_student_subject_unique UNIQUE (student_id, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_student_olevel_subjects_student
  ON public.student_olevel_subjects (student_id);

COMMENT ON TABLE public.student_olevel_subjects IS
  'UCE (Senior 1–4) subjects this learner takes. Must cover all class compulsories; S3–S4 max 3 subsidiaries and 10 total.';

CREATE OR REPLACE FUNCTION public.validate_student_olevel_subjects_student(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_raw_class text;
  v_school uuid;
  missing int;
  sub_cnt int;
  tot int;
BEGIN
  SELECT trim(both ' ' FROM current_class), school_id
    INTO v_raw_class, v_school
  FROM public.students
  WHERE student_id = p_student_id;

  IF v_raw_class IS NULL OR v_school IS NULL THEN
    RETURN;
  END IF;

  IF NOT (v_raw_class ~* '^(senior\s*[1-4]|s\.?\s*[1-4])\b') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.student_olevel_subjects WHERE student_id = p_student_id) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_olevel_subjects s
    WHERE s.student_id = p_student_id
      AND NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school
          AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
          AND trim(both ' ' FROM cs.subject) = trim(both ' ' FROM s.subject_name)
      )
  ) THEN
    RAISE EXCEPTION 'Each subject on the learner profile must exist on the class subject list for this class.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO missing
  FROM public.class_subjects cs
  WHERE cs.school_id = v_school
    AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
    AND cs.uce_offering_type = 'compulsory'
    AND NOT EXISTS (
      SELECT 1 FROM public.student_olevel_subjects s
      WHERE s.student_id = p_student_id
        AND trim(both ' ' FROM s.subject_name) = trim(both ' ' FROM cs.subject)
    );

  IF missing > 0 THEN
    RAISE EXCEPTION 'Learner must include every compulsory subject timetabled for this class.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO sub_cnt
  FROM public.student_olevel_subjects s
  JOIN public.class_subjects cs
    ON cs.school_id = s.school_id
    AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
    AND trim(both ' ' FROM cs.subject) = trim(both ' ' FROM s.subject_name)
  WHERE s.student_id = p_student_id
    AND cs.uce_offering_type = 'subsidiary';

  SELECT count(*) INTO tot FROM public.student_olevel_subjects WHERE student_id = p_student_id;

  IF v_raw_class ~* '^(senior\s*[34]|s\.?\s*[34])\b' THEN
    IF sub_cnt > 3 THEN
      RAISE EXCEPTION 'Senior 3–4: at most 3 subsidiary subjects on the learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF tot > 10 THEN
      RAISE EXCEPTION 'Senior 3–4: at most 10 subjects in total on the learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_student_olevel_subjects(p_student_id uuid, p_subject_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.current_user_can_edit_student_uace_subjects() THEN
    RAISE EXCEPTION 'Not authorized to edit UCE learner subjects.'
      USING ERRCODE = '42501';
  END IF;

  SELECT school_id INTO v_school FROM public.students WHERE student_id = p_student_id;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = v_uid AND u.school_id IS NOT DISTINCT FROM v_school
  ) THEN
    RAISE EXCEPTION 'Not authorized for this school.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.student_olevel_subjects WHERE student_id = p_student_id;

  INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
  SELECT DISTINCT
    v_school,
    p_student_id,
    trim(both ' ' FROM x)
  FROM unnest(COALESCE(p_subject_names, ARRAY[]::text[])) AS x
  WHERE trim(both ' ' FROM x) <> '';

  PERFORM public.validate_student_olevel_subjects_student(p_student_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) IS
  'Replace learner UCE (S1–S4) subject list in one transaction; enforces compulsory coverage and S3–4 caps.';

ALTER TABLE public.student_olevel_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_olevel_subjects_select_school" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_select_school"
  ON public.student_olevel_subjects FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_olevel_subjects_insert" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_insert"
  ON public.student_olevel_subjects FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_olevel_subjects_update" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_update"
  ON public.student_olevel_subjects FOR UPDATE TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

DROP POLICY IF EXISTS "student_olevel_subjects_delete" ON public.student_olevel_subjects;
CREATE POLICY "student_olevel_subjects_delete"
  ON public.student_olevel_subjects FOR DELETE TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
    AND public.current_user_can_edit_student_uace_subjects()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_olevel_subjects TO authenticated;
