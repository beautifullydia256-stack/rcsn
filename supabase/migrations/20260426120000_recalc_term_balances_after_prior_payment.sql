-- Term-linked accounting (invoices + student_balances for current OR past terms) already uses one rule:
--   total_paid for a term = SUM(student_payments.amount_paid)
--   WHERE student_id = … AND term_id = … AND reversed_at IS NULL
-- See: public.update_student_balance(), public.sync_invoice_amount_paid() (invoice_driven_accounting).
--
-- Prior-system payments (term_id NULL, prior_system_entry_id set) only hit prior_system_balance_entries;
-- update_student_balance used to return early without touching student_balances, so term rows could drift.
--
-- This migration: (1) exposes that same SUM as total_term_payments_amount_paid(); (2) uses it in
-- update_student_balance, sync_invoice_amount_paid, and recalc_student_term_balances_from_payments
-- so historical terms and the current term always stay on identical logic.

CREATE OR REPLACE FUNCTION public.total_term_payments_amount_paid(p_student_id uuid, p_term_id uuid)
RETURNS numeric(12, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_paid), 0)::numeric(12, 2)
  FROM public.student_payments
  WHERE student_id = p_student_id
    AND term_id = p_term_id
    AND reversed_at IS NULL;
$$;

COMMENT ON FUNCTION public.total_term_payments_amount_paid(uuid, uuid) IS
  'Total recorded against a term from student_payments: same predicate as update_student_balance and sync_invoice_amount_paid (works for any past or current school_terms row).';

CREATE OR REPLACE FUNCTION public.sync_invoice_amount_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_term_id UUID;
  v_paid NUMERIC(12, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_term_id := OLD.term_id;
  ELSE
    v_student_id := NEW.student_id;
    v_term_id := NEW.term_id;
  END IF;

  IF v_term_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_paid := public.total_term_payments_amount_paid(v_student_id, v_term_id);

  UPDATE public.student_invoices si
  SET
    amount_paid = v_paid,
    status = CASE
      WHEN (si.total_amount - v_paid) <= 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE si.status
    END,
    updated_at = NOW()
  WHERE si.student_id = v_student_id AND si.term_id = v_term_id;

  IF TG_OP = 'UPDATE' AND (OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.term_id IS DISTINCT FROM NEW.term_id) AND OLD.term_id IS NOT NULL THEN
    v_paid := public.total_term_payments_amount_paid(OLD.student_id, OLD.term_id);
    UPDATE public.student_invoices si
    SET amount_paid = v_paid,
        status = CASE WHEN (si.total_amount - v_paid) <= 0 THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE si.status END,
        updated_at = NOW()
    WHERE si.student_id = OLD.student_id AND si.term_id = OLD.term_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_student_term_balances_from_payments(p_student_id uuid, p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_balances AS sb
  SET
    total_paid = public.total_term_payments_amount_paid(sb.student_id, sb.term_id),
    updated_at = now()
  WHERE sb.student_id = p_student_id
    AND sb.school_id = p_school_id
    AND sb.term_id IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.recalc_student_term_balances_from_payments(uuid, uuid) IS
  'Sets student_balances.total_paid for every term row (including old terms) using total_term_payments_amount_paid — same rule as normal term payment recording.';

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

  INSERT INTO public.student_balances (student_id, school_id, term_id, year, term, total_fees, total_paid, updated_at)
  VALUES (NEW.student_id, NEW.school_id, NEW.term_id, COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT), COALESCE(v_term, 1), COALESCE(v_total_fees, 0), v_total_paid, NOW())
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_paid = v_total_paid,
    total_fees = COALESCE(v_total_fees, public.student_balances.total_fees),
    updated_at = NOW();

  RETURN NEW;
END;
$$;
