-- Enforce at DB level: legacy/prior debt must be cleared before payments can apply to a term.
-- Term-tied rows update student_balances / invoices; prior-tied rows (term_id NULL) only reduce
-- prior_system_balance_entries. Without this guard, a client bug or stale UI can insert a term
-- payment while amount_outstanding > 0 on the prior row, which drops the term balance but leaves
-- prior at zero incorrectly if the payment was meant to clear prior first (or doubles confusion
-- between parent vs accountant views).

CREATE OR REPLACE FUNCTION public.enforce_pay_prior_before_term_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_reversal, FALSE) OR NEW.reversed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.amount_paid IS NOT DISTINCT FROM NEW.amount_paid
       AND OLD.term_id IS NOT DISTINCT FROM NEW.term_id
       AND OLD.prior_system_entry_id IS NOT DISTINCT FROM NEW.prior_system_entry_id
       AND OLD.reversed_at IS NOT DISTINCT FROM NEW.reversed_at
       AND COALESCE(OLD.is_reversal, FALSE) IS NOT DISTINCT FROM COALESCE(NEW.is_reversal, FALSE)
    THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Prior-linked payments (term_id NULL per XOR) are allowed; apply_prior_system_payment handles the ledger.
  IF NEW.term_id IS NULL OR NEW.prior_system_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prior_system_balance_entries AS p
    WHERE p.school_id = NEW.school_id
      AND p.student_id = NEW.student_id
      AND p.amount_outstanding > 0
  ) THEN
    RAISE EXCEPTION
      'student_payments: this student still has prior/external balance outstanding. Record the payment against prior_system_entry_id first (term_id must be null for that row), or reduce prior_system_balance_entries.amount_outstanding to zero before term payments.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_pay_prior_before_term_payment() IS
  'Blocks INSERT/UPDATE of term-linked student_payments while prior_system_balance_entries.amount_outstanding > 0 for that student.';

DROP TRIGGER IF EXISTS trg_student_payments_enforce_prior_first ON public.student_payments;

CREATE TRIGGER trg_student_payments_enforce_prior_first
  BEFORE INSERT OR UPDATE ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pay_prior_before_term_payment();
