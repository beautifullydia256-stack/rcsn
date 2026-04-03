-- New students: attach opening balance to the *current* school term (by calendar),
-- not the latest row by (year, term) which is often a future term.
-- Also add users.last_sign_in_at for admin roster UIs that select this column (avoids PostgREST 400).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.last_sign_in_at IS 'Optional mirror of last auth activity for admin dashboards; may be populated by jobs/triggers.';

ALTER TABLE public.student_balances
  ADD COLUMN IF NOT EXISTS year INTEGER;

ALTER TABLE public.student_balances
  ADD COLUMN IF NOT EXISTS term INTEGER;

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
  v_class_fees NUMERIC(10, 2);
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 1) Term where today falls inside [start_date, end_date]
  SELECT st.id, st.year, st.term
  INTO v_term_id, v_year, v_term_num
  FROM public.school_terms st
  WHERE st.school_id = NEW.school_id
    AND st.start_date <= v_today
    AND st.end_date >= v_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  -- 2) Else: most recent term that has already started
  IF v_term_id IS NULL THEN
    SELECT st.id, st.year, st.term
    INTO v_term_id, v_year, v_term_num
    FROM public.school_terms st
    WHERE st.school_id = NEW.school_id
      AND st.start_date <= v_today
    ORDER BY st.year DESC, st.term DESC
    LIMIT 1;
  END IF;

  -- 3) Else: earliest term for school (enrollment before any start_date configured)
  IF v_term_id IS NULL THEN
    SELECT st.id, st.year, st.term
    INTO v_term_id, v_year, v_term_num
    FROM public.school_terms st
    WHERE st.school_id = NEW.school_id
    ORDER BY st.year ASC, st.term ASC
    LIMIT 1;
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

  INSERT INTO public.student_balances (
    student_id,
    school_id,
    term_id,
    class_id,
    year,
    term,
    total_fees,
    total_paid,
    last_payment_date,
    created_at,
    updated_at
  )
  VALUES (
    NEW.student_id,
    NEW.school_id,
    v_term_id,
    NEW.class_id,
    COALESCE(v_year, EXTRACT(YEAR FROM v_today)::INT),
    COALESCE(v_term_num, 1),
    v_class_fees,
    0,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, term_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_initialize_student_balance() IS
  'Creates student_balances for new students using current calendar term (not merely max year/term).';
