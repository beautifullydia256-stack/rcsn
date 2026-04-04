-- Allow payments to reduce prior_system_balance_entries (external/legacy debt) with term_id NULL.
-- Each payment targets either a school term (term_id set) OR one prior entry (prior_system_entry_id set).
--
-- When prior is fully paid, we set amount_outstanding = 0 (do not DELETE the row): deleting would
-- FK-set-null payment.prior_system_entry_id and violate student_payments_term_xor_prior_check.

ALTER TABLE public.prior_system_balance_entries
  DROP CONSTRAINT IF EXISTS prior_system_balance_entries_amount_outstanding_check;

ALTER TABLE public.prior_system_balance_entries
  ADD CONSTRAINT prior_system_balance_entries_amount_outstanding_check
  CHECK (amount_outstanding >= 0);

-- ---------------------------------------------------------------------------
-- Legacy repair: XOR requires every row to have exactly one of term_id / prior.
-- Existing payments all have prior_system_entry_id NULL, so term_id must be set.
-- Rows with NULL term_id violate the new check unless fixed.
-- ---------------------------------------------------------------------------
UPDATE public.student_payments AS sp
SET term_id = si.term_id
FROM public.student_invoices AS si
WHERE sp.term_id IS NULL
  AND sp.invoice_id IS NOT NULL
  AND si.invoice_id = sp.invoice_id;

UPDATE public.student_payments AS sp
SET term_id = st.id
FROM (
  SELECT DISTINCT ON (school_id) school_id, id
  FROM public.school_terms
  ORDER BY school_id, year ASC, term ASC
) AS st
WHERE sp.term_id IS NULL
  AND sp.school_id = st.school_id;

-- Last resort: attach to the student’s most recently updated balance row’s term (if any).
UPDATE public.student_payments AS sp
SET term_id = pick.term_id
FROM (
  SELECT DISTINCT ON (sp2.payment_id) sp2.payment_id, sb.term_id
  FROM public.student_payments AS sp2
  INNER JOIN public.student_balances AS sb
    ON sb.student_id = sp2.student_id
   AND sb.school_id = sp2.school_id
  WHERE sp2.term_id IS NULL
    AND sb.term_id IS NOT NULL
  ORDER BY sp2.payment_id, sb.updated_at DESC NULLS LAST
) AS pick
WHERE sp.payment_id = pick.payment_id;

ALTER TABLE public.student_payments
  ALTER COLUMN term_id DROP NOT NULL;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS prior_system_entry_id UUID
    REFERENCES public.prior_system_balance_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_payments_prior_entry
  ON public.student_payments(prior_system_entry_id)
  WHERE prior_system_entry_id IS NOT NULL;

ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_term_xor_prior_check;

DO $guard$
DECLARE
  n int;
BEGIN
  SELECT count(*)::int
  INTO n
  FROM public.student_payments
  WHERE (term_id IS NULL AND prior_system_entry_id IS NULL)
     OR (term_id IS NOT NULL AND prior_system_entry_id IS NOT NULL);
  IF n > 0 THEN
    RAISE EXCEPTION
      'Cannot add student_payments_term_xor_prior_check: % student_payments rows violate term vs prior (need exactly one). Rows missing both: term_id/prior null; or both set. Inspect problem rows then re-run.',
      n;
  END IF;
END;
$guard$;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_term_xor_prior_check CHECK (
    (prior_system_entry_id IS NULL AND term_id IS NOT NULL)
    OR (prior_system_entry_id IS NOT NULL AND term_id IS NULL)
  );

COMMENT ON COLUMN public.student_payments.prior_system_entry_id IS
  'When set, this payment applies only to prior_system_balance_entries (term_id must be NULL).';

CREATE OR REPLACE FUNCTION public.apply_prior_system_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old NUMERIC(12, 2);
BEGIN
  IF NEW.prior_system_entry_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.is_reversal, FALSE) OR NEW.reversed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.amount_outstanding INTO v_old
  FROM public.prior_system_balance_entries p
  WHERE p.id = NEW.prior_system_entry_id
    AND p.school_id = NEW.school_id
    AND p.student_id = NEW.student_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'prior_system_balance_entries row not found for this payment';
  END IF;

  IF v_old < NEW.amount_paid THEN
    RAISE EXCEPTION 'Payment % exceeds prior-system balance remaining %', NEW.amount_paid, v_old;
  END IF;

  UPDATE public.prior_system_balance_entries
  SET amount_outstanding = v_old - NEW.amount_paid
  WHERE id = NEW.prior_system_entry_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_payments_apply_prior ON public.student_payments;

CREATE TRIGGER trg_student_payments_apply_prior
  AFTER INSERT ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_prior_system_payment();
