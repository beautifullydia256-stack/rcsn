-- ============================================================================
-- ENFORCE PAYMENT OLDEST-TERM-FIRST (all schools, forever)
-- When a payment is inserted with term_id set, it must be for the oldest term
-- (by year, term) that still has outstanding balance for that student.
-- This prevents mis-allocation to a newer term when an older term has balance.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_payment_oldest_term_first()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oldest_term_id UUID;
BEGIN
  -- Skip if no term (legacy or non-term payment)
  IF NEW.term_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the single oldest term (by year, then term) that has outstanding balance
  -- for this student at this school. Balance = total_fees - total_paid.
  SELECT sb.term_id INTO v_oldest_term_id
  FROM public.student_balances sb
  WHERE sb.school_id = NEW.school_id
    AND sb.student_id = NEW.student_id
    AND (sb.total_fees - sb.total_paid) > 0
  ORDER BY sb.year ASC, sb.term ASC
  LIMIT 1;

  -- If there is an older term with balance, this payment must be for that term only
  IF v_oldest_term_id IS NOT NULL AND v_oldest_term_id IS DISTINCT FROM NEW.term_id THEN
    RAISE EXCEPTION
      'Payment must be applied to the oldest term with outstanding balance first. This student has balance for an older term (year/term). Cannot record payment for a newer term until the older term is cleared.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_payment_oldest_term_first ON public.student_payments;
CREATE TRIGGER trigger_enforce_payment_oldest_term_first
  BEFORE INSERT ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_oldest_term_first();

COMMENT ON FUNCTION public.enforce_payment_oldest_term_first() IS
  'Ensures payments are only applied to the oldest term with balance (prevents mis-allocation for any school).';

-- ============================================================================
-- INVOICE ACTIVATION = REAL BALANCE ROW (all schools)
-- When an invoice is activated (status issued/partial/paid), a matching
-- student_balances row must exist so Outstanding and reports show it.
-- This trigger guarantees that: activate invoice => balance row exists.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_balance_on_invoice_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INT;
  v_term INT;
  v_school_id UUID;
BEGIN
  -- Only sync when invoice is in an "active" state that should show on Outstanding
  IF NEW.status NOT IN ('issued', 'partial', 'paid') THEN
    RETURN NEW;
  END IF;

  v_school_id := NEW.school_id;

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = NEW.term_id;

  -- Upsert student_balances so this invoice always has a real balance row.
  -- total_fees from invoice; total_paid from invoice (stays in sync via sync_invoice_amount_paid when payments are added).
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
    v_school_id,
    NEW.term_id,
    COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
    COALESCE(v_term, 1),
    NEW.total_amount,
    COALESCE(NEW.amount_paid, 0),
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_fees = NEW.total_amount,
    total_paid = COALESCE(NEW.amount_paid, public.student_balances.total_paid),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_balance_on_invoice_activation ON public.student_invoices;
CREATE TRIGGER trigger_sync_balance_on_invoice_activation
  AFTER INSERT OR UPDATE OF status, total_amount, amount_paid ON public.student_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_balance_on_invoice_activation();

COMMENT ON FUNCTION public.sync_balance_on_invoice_activation() IS
  'When an invoice is activated (issued/partial/paid), ensures a student_balances row exists so it appears on Outstanding and stays in sync with the database.';
