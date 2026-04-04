-- ============================================================================
-- New students (INSERT on students): calendar *current* term only
--
-- Business rules:
-- - A student added *now* is expected for the **current** term → opening fees
--   get an **issued** invoice automatically (they are "on roll" for this term).
-- - **Future** terms: no auto-invoice here; staff activate invoices manually when
--   enrolling for those periods.
--
-- Implementation:
-- - When expected opening fees > 0: insert student_invoices (issued). The
--   existing trigger sync_balance_on_invoice_activation upserts student_balances.
-- - When fees = 0: insert a zero student_balances row only (no invoice),
--   matching prior behaviour for free placements.
--
-- student_balances columns: invoice-style (no class_id / last_payment_date).
-- ============================================================================

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
  -- Calendar current term (aligned with resolve_current_school_term_id)
  SELECT st.id, st.year, st.term
  INTO v_term_id, v_year, v_term_num
  FROM public.school_terms st
  WHERE st.school_id = NEW.school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= v_today
    AND st.end_date >= v_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NULL THEN
    SELECT st.id, st.year, st.term
    INTO v_term_id, v_year, v_term_num
    FROM public.school_terms st
    WHERE st.school_id = NEW.school_id
      AND st.start_date IS NOT NULL
      AND st.start_date <= v_today
    ORDER BY st.year DESC, st.term DESC
    LIMIT 1;
  END IF;

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
  'For new students: issues an invoice for the calendar current term when opening fees > 0 (balance via invoice activation trigger); otherwise inserts a zero balance row only.';
