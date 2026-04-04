-- The `balance` column on student_balances is meant to match total_fees - total_paid.
-- Some environments only update `total_paid` (e.g. via recalc) and rely on a BEFORE trigger
-- to refresh `balance`. If that trigger is missing or bypassed, UIs that filter/display `balance`
-- show wrong term outstanding (e.g. 340k while total_fees - total_paid = 350k).

CREATE OR REPLACE FUNCTION public.recalc_student_term_balances_from_payments(p_student_id uuid, p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_balances AS sb
  SET
    total_paid = v.vpaid,
    balance = COALESCE(sb.total_fees, 0) - v.vpaid,
    updated_at = now()
  FROM (
    SELECT
      sb2.student_id,
      sb2.school_id,
      sb2.term_id,
      public.total_term_payments_amount_paid(sb2.student_id, sb2.term_id) AS vpaid
    FROM public.student_balances AS sb2
    WHERE sb2.student_id = p_student_id
      AND sb2.school_id = p_school_id
      AND sb2.term_id IS NOT NULL
  ) AS v
  WHERE sb.student_id = v.student_id
    AND sb.school_id = v.school_id
    AND sb.term_id = v.term_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC(12, 2);
  v_total_fees NUMERIC(12, 2);
  v_year INT;
  v_term INT;
BEGIN
  IF NEW.term_id IS NULL THEN
    PERFORM public.recalc_student_term_balances_from_payments(NEW.student_id, NEW.school_id);
    RETURN NEW;
  END IF;

  v_total_paid := public.total_term_payments_amount_paid(NEW.student_id, NEW.term_id);

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = NEW.term_id;

  SELECT si.total_amount INTO v_total_fees
  FROM public.student_invoices si
  WHERE si.student_id = NEW.student_id AND si.term_id = NEW.term_id
    AND si.status IN ('issued', 'partial', 'paid')
  LIMIT 1;

  IF v_total_fees IS NULL THEN
    SELECT s.expected_fee_amount INTO v_total_fees FROM public.students s WHERE s.student_id = NEW.student_id;
  END IF;

  INSERT INTO public.student_balances (student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at)
  VALUES (
    NEW.student_id,
    NEW.school_id,
    NEW.term_id,
    COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
    COALESCE(v_term, 1),
    COALESCE(v_total_fees, 0),
    v_total_paid,
    COALESCE(v_total_fees, 0) - v_total_paid,
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_paid = v_total_paid,
    total_fees = COALESCE(v_total_fees, public.student_balances.total_fees),
    balance = COALESCE(COALESCE(v_total_fees, public.student_balances.total_fees), 0) - v_total_paid,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- One-time repair: fix any rows where `balance` drifted from fees minus paid
UPDATE public.student_balances AS sb
SET
  balance = COALESCE(sb.total_fees, 0) - COALESCE(sb.total_paid, 0),
  updated_at = now()
WHERE sb.term_id IS NOT NULL
  AND sb.balance IS DISTINCT FROM (COALESCE(sb.total_fees, 0) - COALESCE(sb.total_paid, 0));
