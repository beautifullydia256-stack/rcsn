-- ============================================================================
-- Engine calendar vs school display dates
--
-- * global_terms defines the nationwide term windows (when the platform considers
--   Term 1/2/3 active). All schools follow the same (year, term) for engine logic.
-- * school_terms.start_date / end_date are school-facing (report cards, UI); they
--   must not drive "current term" for billing, KPIs, or triggers.
-- * New schools: terms are created from the calendar term at registration (join in T2
--   → rows for T2–T3 only for that year; join in T3 → T3 only), with display dates
--   defaulted from global windows and global_term_id set.
-- * Removes INSERT/UPDATE validation that blocked arbitrary school display dates
--   when global_term_id was set.
-- ============================================================================

COMMENT ON COLUMN public.school_terms.start_date IS
  'School-facing term start (report cards, etc.). Engine "current term" uses global_terms, not this column.';
COMMENT ON COLUMN public.school_terms.end_date IS
  'School-facing term end. Engine "current term" uses global_terms, not this column.';

-- ---------------------------------------------------------------------------
-- 1) Optional helper: calendar (year, term) from global_terms for a date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.global_calendar_year_term(p_today DATE)
RETURNS TABLE (year INTEGER, term INTEGER, global_term_id UUID)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT gt.year, gt.term, gt.id
  FROM public.global_terms gt
  WHERE p_today >= gt.window_start
    AND p_today <= gt.hard_stop_date
  ORDER BY gt.year DESC, gt.term DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.global_calendar_year_term(DATE) IS
  'Nationwide calendar (year, term) for a date from global_terms.';

GRANT EXECUTE ON FUNCTION public.global_calendar_year_term(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_calendar_year_term(DATE) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) resolve_current_school_term_id — engine uses global_terms + school_terms row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_current_school_term_id(
  p_school_id UUID,
  p_today DATE DEFAULT (CURRENT_DATE)
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
  v_cal_year INTEGER;
  v_cal_term INTEGER;
BEGIN
  PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT);

  SELECT g.year, g.term
  INTO v_cal_year, v_cal_term
  FROM public.global_calendar_year_term(p_today) g;

  IF v_cal_year IS NULL THEN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT - 1);
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT + 1);
    SELECT g.year, g.term
    INTO v_cal_year, v_cal_term
    FROM public.global_calendar_year_term(p_today) g;
  END IF;

  IF v_cal_year IS NOT NULL THEN
    SELECT st.id
    INTO v_term_id
    FROM public.school_terms st
    WHERE st.school_id = p_school_id
      AND st.year = v_cal_year
      AND st.term = v_cal_term
    LIMIT 1;
  END IF;

  IF v_term_id IS NOT NULL THEN
    RETURN v_term_id;
  END IF;

  -- Legacy fallback (missing row for this calendar term): old date-window logic
  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= p_today
    AND st.end_date >= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.start_date <= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
  ORDER BY st.year ASC, st.term ASC
  LIMIT 1;

  RETURN v_term_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_current_school_term_id(UUID, DATE) IS
  'Engine current term: matches global_terms (year, term) to school_terms; legacy fallback if row missing.';

-- ---------------------------------------------------------------------------
-- 3) auto_initialize_student_balance — use resolve_current_school_term_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_initialize_student_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
  v_year INT;
  v_term_num INT;
  v_class_fees NUMERIC(12, 2);
  v_today DATE := CURRENT_DATE;
  v_inv_num TEXT;
BEGIN
  v_term_id := public.resolve_current_school_term_id(NEW.school_id, v_today);

  IF v_term_id IS NOT NULL THEN
    SELECT st.year, st.term
    INTO v_year, v_term_num
    FROM public.school_terms st
    WHERE st.id = v_term_id;
  END IF;

  IF v_term_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.class_id IS NOT NULL THEN
    SELECT c.total_fees INTO v_class_fees
    FROM public.classes c
    WHERE c.class_id = NEW.class_id;
  END IF;

  v_class_fees := COALESCE(v_class_fees, NEW.expected_fee_amount, 0);

  IF v_class_fees > 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.student_invoices si
      WHERE si.school_id = NEW.school_id
        AND si.student_id = NEW.student_id
        AND si.term_id = v_term_id
    ) THEN
      v_inv_num := public.get_next_invoice_number(NEW.school_id);
      INSERT INTO public.student_invoices (
        school_id,
        student_id,
        term_id,
        invoice_number,
        total_amount,
        amount_paid,
        status,
        created_by,
        updated_at
      )
      VALUES (
        NEW.school_id,
        NEW.student_id,
        v_term_id,
        v_inv_num,
        v_class_fees,
        0,
        'issued',
        NULL,
        NOW()
      );
    END IF;
  ELSE
    INSERT INTO public.student_balances (
      student_id,
      school_id,
      term_id,
      year,
      term,
      total_fees,
      total_paid,
      updated_at
    )
    VALUES (
      NEW.student_id,
      NEW.school_id,
      v_term_id,
      COALESCE(v_year, EXTRACT(YEAR FROM v_today)::INT),
      COALESCE(v_term_num, 1),
      0,
      0,
      NOW()
    )
    ON CONFLICT (student_id, term_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_initialize_student_balance() IS
  'New students: invoice/balance for engine current term (global calendar via resolve_current_school_term_id).';

-- ---------------------------------------------------------------------------
-- 4) Drop validation that restricted school display dates vs global windows
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_validate_school_term_dates ON public.school_terms;
DROP FUNCTION IF EXISTS public.validate_school_term_dates();

-- ---------------------------------------------------------------------------
-- 5) setup_new_school_defaults — calendar term at signup; terms from join term..3
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_join_year INTEGER;
  v_join_term INTEGER;
  v_t INTEGER;
  v_gt_id UUID;
  v_ws DATE;
  v_he DATE;
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

  PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::INT);

  SELECT g.year, g.term INTO v_join_year, v_join_term
  FROM public.global_calendar_year_term(CURRENT_DATE::date) g;

  IF v_join_year IS NULL THEN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1);
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1);
    SELECT g.year, g.term INTO v_join_year, v_join_term
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g;
  END IF;

  IF v_join_year IS NULL THEN
    v_join_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
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

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Align is_current flags with engine calendar (best-effort; display-only hint)
-- ---------------------------------------------------------------------------
WITH cal AS (
  SELECT gt.year, gt.term
  FROM public.global_terms gt
  WHERE CURRENT_DATE >= gt.window_start
    AND CURRENT_DATE <= gt.hard_stop_date
  ORDER BY gt.year DESC, gt.term DESC
  LIMIT 1
)
UPDATE public.school_terms st
SET is_current = (st.year = cal.year AND st.term = cal.term)
FROM cal;
