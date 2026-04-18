-- Secondary schools: default exam sets (Beginning of Term, Mid Term, End of Term) per term.
-- Backfills current engine calendar year for existing schools; new schools get the same via trigger + helper.

-- ---------------------------------------------------------------------------
-- 1) Backfill: all Secondary schools, terms 1–3, current calendar year
-- ---------------------------------------------------------------------------
WITH cal AS (
  SELECT COALESCE(
    (SELECT g.year FROM public.global_calendar_year_term(CURRENT_DATE::date) g LIMIT 1),
    EXTRACT(YEAR FROM CURRENT_DATE)::int
  ) AS y
),
exam_grid AS (
  SELECT * FROM (
    VALUES
      ('Beginning of Term', 1),
      ('Mid Term', 1),
      ('End of Term', 1),
      ('Beginning of Term', 2),
      ('Mid Term', 2),
      ('End of Term', 2),
      ('Beginning of Term', 3),
      ('Mid Term', 3),
      ('End of Term', 3)
  ) AS t(exam_name, term_number)
)
INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
SELECT s.school_id, g.exam_name, g.term_number, cal.y, true, NOW(), NOW()
FROM public.schools s
CROSS JOIN cal
CROSS JOIN exam_grid g
WHERE s.type = 'Secondary'
  AND NOT EXISTS (
    SELECT 1
    FROM public.exam_sets es
    WHERE es.school_id = s.school_id
      AND es.name = g.exam_name
      AND es.term = g.term_number
      AND es.year = cal.y
  );

-- ---------------------------------------------------------------------------
-- 2) insert_default_exam_sets_all_terms — add Secondary branch (registration / manual call)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_all_terms(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_type text;
  v_current_year integer;
  v_sec_year integer;
BEGIN
  SELECT type INTO v_school_type
  FROM public.schools
  WHERE school_id = p_school_id;

  IF v_school_type IS NULL THEN
    RAISE EXCEPTION 'School with id % does not exist', p_school_id;
  END IF;

  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;

  IF v_school_type = 'Nursery/Primary' OR v_school_type = 'Primary' THEN
    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      p_school_id,
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
      WHERE es.school_id = p_school_id
        AND es.name = exam_types.exam_name
        AND es.term = exam_types.term_number
        AND es.year = v_current_year
    );
  ELSIF v_school_type = 'Secondary' THEN
    SELECT g.year INTO v_sec_year
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g
    LIMIT 1;
    v_sec_year := COALESCE(v_sec_year, v_current_year);

    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      p_school_id,
      exam_name,
      term_number,
      v_sec_year,
      true,
      NOW(),
      NOW()
    FROM (
      VALUES
        ('Beginning of Term', 1),
        ('Mid Term', 1),
        ('End of Term', 1),
        ('Beginning of Term', 2),
        ('Mid Term', 2),
        ('End of Term', 2),
        ('Beginning of Term', 3),
        ('Mid Term', 3),
        ('End of Term', 3)
    ) AS exam_types(exam_name, term_number)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.exam_sets es
      WHERE es.school_id = p_school_id
        AND es.name = exam_types.exam_name
        AND es.term = exam_types.term_number
        AND es.year = v_sec_year
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.insert_default_exam_sets_all_terms(uuid) IS
  'Seeds default exam sets for the school year: Primary = Mid/End × 3 terms (calendar extract year); Secondary = Beginning/Mid/End × 3 terms (engine calendar year). Idempotent.';

-- ---------------------------------------------------------------------------
-- 3) setup_new_school_defaults — Secondary exam sets from join term through 3
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_join_year integer;
  v_join_term integer;
  v_t integer;
  v_gt_id uuid;
  v_ws date;
  v_he date;
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

  PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int);

  SELECT g.year, g.term INTO v_join_year, v_join_term
  FROM public.global_calendar_year_term(CURRENT_DATE::date) g;

  IF v_join_year IS NULL THEN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1);
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1);
    SELECT g.year, g.term INTO v_join_year, v_join_term
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g;
  END IF;

  IF v_join_year IS NULL THEN
    v_join_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
    v_join_term := 1;
    PERFORM public.ensure_academic_year_exists(v_join_year);
  END IF;

  FOR v_t IN v_join_term..3 LOOP
    SELECT gt.id, gt.window_start, gt.hard_stop_date
    INTO v_gt_id, v_ws, v_he
    FROM public.global_terms gt
    WHERE gt.year = v_join_year AND gt.term = v_t;

    IF v_gt_id IS NULL THEN
      PERFORM public.ensure_academic_year_exists(v_join_year);
      SELECT gt.id, gt.window_start, gt.hard_stop_date
      INTO v_gt_id, v_ws, v_he
      FROM public.global_terms gt
      WHERE gt.year = v_join_year AND gt.term = v_t;
    END IF;

    IF v_gt_id IS NULL THEN
      RAISE EXCEPTION 'setup_new_school_defaults: missing global_terms for year % term %', v_join_year, v_t;
    END IF;

    INSERT INTO public.school_terms (
      school_id,
      year,
      term,
      start_date,
      end_date,
      is_current,
      global_term_id
    )
    VALUES (
      NEW.school_id,
      v_join_year,
      v_t,
      v_ws,
      v_he,
      (v_t = v_join_term),
      v_gt_id
    );
  END LOOP;

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
      v_join_year,
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
    WHERE term_number >= v_join_term
      AND term_number <= 3
      AND NOT EXISTS (
        SELECT 1 FROM public.exam_sets es
        WHERE es.school_id = NEW.school_id
          AND es.name = exam_types.exam_name
          AND es.term = exam_types.term_number
          AND es.year = v_join_year
      );
  END IF;

  IF NEW.type = 'Secondary' THEN
    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      NEW.school_id,
      exam_name,
      term_number,
      v_join_year,
      true,
      NOW(),
      NOW()
    FROM (
      VALUES
        ('Beginning of Term', 1),
        ('Mid Term', 1),
        ('End of Term', 1),
        ('Beginning of Term', 2),
        ('Mid Term', 2),
        ('End of Term', 2),
        ('Beginning of Term', 3),
        ('Mid Term', 3),
        ('End of Term', 3)
    ) AS exam_types(exam_name, term_number)
    WHERE term_number >= v_join_term
      AND term_number <= 3
      AND NOT EXISTS (
        SELECT 1 FROM public.exam_sets es
        WHERE es.school_id = NEW.school_id
          AND es.name = exam_types.exam_name
          AND es.term = exam_types.term_number
          AND es.year = v_join_year
      );
  END IF;

  RETURN NEW;
END;
$$;

SELECT pg_notify('pgrst', 'reload schema');
