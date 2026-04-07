-- Secondary defaults: seed class_subjects from uce_subject_catalog (S1–S4) and uace_subject_catalog (S5–S6).
-- UACE subsidiary rows for Senior 5–6 may not be deleted or renamed (principals remain removable).
-- When a school is deleted (ON DELETE CASCADE), class_subjects DELETE is allowed after schools BEFORE DELETE sets a transaction-local GUC.

CREATE OR REPLACE FUNCTION public.schools_mark_cascade_deleting()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.cascade_deleting_school_id', OLD.school_id::text, true);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS schools_mark_cascade_deleting_trg ON public.schools;
CREATE TRIGGER schools_mark_cascade_deleting_trg
  BEFORE DELETE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.schools_mark_cascade_deleting();

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
    SELECT EXISTS (
      SELECT 1
      FROM public.uace_subject_catalog u
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
    SELECT EXISTS (
      SELECT 1
      FROM public.uace_subject_catalog u
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

DROP TRIGGER IF EXISTS class_subjects_protect_uace_subsidiaries_trg ON public.class_subjects;
CREATE TRIGGER class_subjects_protect_uace_subsidiaries_trg
  BEFORE DELETE OR UPDATE ON public.class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.class_subjects_protect_uace_subsidiaries();

COMMENT ON FUNCTION public.class_subjects_protect_uace_subsidiaries() IS
  'Blocks delete/update of subject or class_name for UACE subsidiary rows on Senior 5–6; allows CASCADE when deleting the parent school.';

-- Backfill: all existing Secondary schools get full UCE + UACE default subject rows.
INSERT INTO public.class_subjects (school_id, class_name, subject)
SELECT s.school_id, c.class_name, u.subject_name
FROM public.schools s
CROSS JOIN (
  VALUES ('Senior 1'), ('Senior 2'), ('Senior 3'), ('Senior 4')
) AS c(class_name)
CROSS JOIN public.uce_subject_catalog u
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, class_name, subject) DO NOTHING;

INSERT INTO public.class_subjects (school_id, class_name, subject)
SELECT s.school_id, c.class_name, u.subject_name
FROM public.schools s
CROSS JOIN (
  VALUES ('Senior 5'), ('Senior 6')
) AS c(class_name)
CROSS JOIN public.uace_subject_catalog u
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, class_name, subject) DO NOTHING;

COMMENT ON TABLE public.class_subjects IS
  'Subjects per class per school. New Secondary schools get UCE (S1–S4) and UACE (S5–S6) defaults from public catalogs. UACE subsidiaries on S5–S6 are non-removable.';

-- New Secondary schools: same catalog-driven inserts (replacing hard-coded O-Level-only list); keep term auto-detect behaviour.
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

    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT NEW.school_id, c.class_name, u.subject_name
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
