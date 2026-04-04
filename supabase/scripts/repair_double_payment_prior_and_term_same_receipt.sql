-- ============================================================================
-- Repair: same payment posted as BOTH prior row and term row (double deduction)
--
-- Symptom: e.g. 120k recorded once but prior dropped by 120k AND term balance
-- dropped by 120k. Same receipt_number often appears on two student_payments.
--
-- Fix: reverse the TERM-linked row only (keep the prior-linked row), then
-- recompute student_balances and student_invoices from live payments.
--
-- Run in Supabase SQL Editor (service role / postgres). Review SECTION A first.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION A — Diagnostics
-- ---------------------------------------------------------------------------
SELECT student_id, school_id, name, current_class
FROM public.students
WHERE status = 'active'
  AND lower(trim(name)) LIKE '%kyaligonza%'
  AND lower(trim(name)) LIKE '%isaac%';

-- After you have student_id, list payments (replace UUID):
-- SELECT payment_id, payment_date, amount_paid, term_id, prior_system_entry_id,
--        receipt_number, reversed_at, created_at
-- FROM public.student_payments
-- WHERE student_id = 'PASTE_STUDENT_UUID'::uuid
-- ORDER BY created_at ASC;

-- Pairs: same receipt, one prior one term (bad duplicate):
-- SELECT sp1.payment_id AS term_payment_id,
--        sp2.payment_id AS prior_payment_id,
--        sp1.receipt_number,
--        sp1.amount_paid
-- FROM public.student_payments sp1
-- INNER JOIN public.student_payments sp2
--   ON sp1.student_id = sp2.student_id
--  AND sp1.school_id = sp2.school_id
--  AND sp1.receipt_number = sp2.receipt_number
--  AND sp1.payment_id <> sp2.payment_id
-- WHERE sp1.student_id = 'PASTE_STUDENT_UUID'::uuid
--   AND sp1.term_id IS NOT NULL
--   AND sp1.prior_system_entry_id IS NULL
--   AND sp2.term_id IS NULL
--   AND sp2.prior_system_entry_id IS NOT NULL
--   AND sp1.reversed_at IS NULL
--   AND sp2.reversed_at IS NULL;

-- ---------------------------------------------------------------------------
-- SECTION B — Repair (uses name match; change names if needed)
-- ---------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  v_student_id uuid;
  v_school_id uuid;
  n_term_reversed int := 0;
BEGIN
  SELECT s.student_id, s.school_id
    INTO v_student_id, v_school_id
  FROM public.students AS s
  WHERE s.status = 'active'
    AND lower(trim(s.name)) LIKE '%kyaligonza%'
    AND lower(trim(s.name)) LIKE '%isaac%'
  ORDER BY s.name
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student not found (active Kyaligonza + Isaac). Run SECTION A and set student_id manually.';
  END IF;

  -- Reverse term leg where same receipt also has a prior leg (duplicate split).
  UPDATE public.student_payments AS sp
  SET reversed_at = now(),
      reversal_reason = 'Repair: term leg duplicated a prior-only allocation for same receipt; reversed to restore term balance.'
  FROM public.student_payments AS prior
  WHERE sp.student_id = v_student_id
    AND sp.student_id = prior.student_id
    AND sp.school_id = prior.school_id
    AND sp.receipt_number = prior.receipt_number
    AND sp.receipt_number IS NOT NULL
    AND sp.payment_id <> prior.payment_id
    AND sp.term_id IS NOT NULL
    AND sp.prior_system_entry_id IS NULL
    AND prior.term_id IS NULL
    AND prior.prior_system_entry_id IS NOT NULL
    AND sp.reversed_at IS NULL
    AND prior.reversed_at IS NULL;

  GET DIAGNOSTICS n_term_reversed = ROW_COUNT;

  IF n_term_reversed = 0 THEN
    RAISE NOTICE 'No matching duplicate term rows were reversed. Check SECTION A queries or reverse manually.';
  ELSE
    RAISE NOTICE 'Reversed % term payment row(s) for student %.', n_term_reversed, v_student_id;
  END IF;
END;
$$;

-- Re-sync all term balances (same rule as update_student_balance / migration 20260426120000)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.student_id, s.school_id
    FROM public.students AS s
    WHERE s.status = 'active'
      AND lower(trim(s.name)) LIKE '%kyaligonza%'
      AND lower(trim(s.name)) LIKE '%isaac%'
  LOOP
    PERFORM public.recalc_student_term_balances_from_payments(r.student_id, r.school_id);
  END LOOP;
END;
$$;

-- Re-sync invoices for this student (same rule as sync_invoice_amount_paid)
UPDATE public.student_invoices AS si
SET
  amount_paid = x.v_paid,
  status = CASE
    WHEN (si.total_amount - x.v_paid) <= 0 THEN 'paid'
    WHEN x.v_paid > 0 THEN 'partial'
    ELSE si.status
  END,
  updated_at = now()
FROM (
  SELECT
    si2.invoice_id,
    public.total_term_payments_amount_paid(si2.student_id, si2.term_id) AS v_paid
  FROM public.student_invoices AS si2
  WHERE si2.student_id IN (
    SELECT s.student_id
    FROM public.students AS s
    WHERE s.status = 'active'
      AND lower(trim(s.name)) LIKE '%kyaligonza%'
      AND lower(trim(s.name)) LIKE '%isaac%'
  )
) AS x
WHERE si.invoice_id = x.invoice_id;

COMMIT;

-- ---------------------------------------------------------------------------
-- SECTION C — Verify
-- ---------------------------------------------------------------------------
-- SELECT amount_outstanding FROM public.prior_system_balance_entries p
-- JOIN students s ON s.student_id = p.student_id
-- WHERE lower(trim(s.name)) LIKE '%kyaligonza%' AND lower(trim(s.name)) LIKE '%isaac%';
--
-- SELECT term_id, total_fees, total_paid, balance FROM public.student_balances sb
-- JOIN students s ON s.student_id = sb.student_id
-- WHERE ...;
--
-- SELECT payment_id, amount_paid, term_id, prior_system_entry_id, reversed_at, receipt_number
-- FROM public.student_payments sp
-- JOIN students s ON s.student_id = sp.student_id
-- WHERE ... ORDER BY sp.created_at;
