-- ============================================================================
-- Repair: term payment that should have been recorded against prior/external debt
--
-- Symptom: student_balances dropped (e.g. 610k → 490k) while the payment was
-- meant to clear prior_system_balance_entries first.
--
-- Approach (recommended):
--   1) Run SECTION A (diagnostics) in Supabase SQL Editor.
--   2) Note payment_id to reverse and prior_system_balance_entries.id.
--   3) Fill the constants in SECTION B, then run SECTION B in one go.
--
-- Reversing sets reversed_at so triggers rebuild student_balances / invoices
-- excluding that row. The new INSERT uses prior_system_entry_id so only prior
-- outstanding changes.
--
-- Run as a user that bypasses RLS (Supabase SQL Editor default / service role).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION A — Diagnostics (read-only). Adjust name filter if needed.
-- ---------------------------------------------------------------------------
SELECT s.student_id,
       s.school_id,
       s.name,
       s.current_class
FROM public.students AS s
WHERE s.status = 'active'
  AND lower(trim(s.name)) LIKE '%joan%'
  AND lower(trim(s.name)) LIKE '%mukwaba%';

-- After you have student_id from the query above, paste it into these two queries:

-- A2) Prior row (you need id + current amount_outstanding)
-- SELECT p.id AS prior_entry_id,
--        p.amount_outstanding,
--        p.entered_at
-- FROM public.prior_system_balance_entries AS p
-- WHERE p.student_id = 'PASTE_STUDENT_UUID'::uuid;

-- A3) Term balances
-- SELECT sb.term_id, sb.year, sb.term, sb.total_fees, sb.total_paid, sb.balance
-- FROM public.student_balances AS sb
-- WHERE sb.student_id = 'PASTE_STUDENT_UUID'::uuid
-- ORDER BY sb.year, sb.term;

-- A4) Payments (pick the row: amount_paid = 120000, term_id set, prior null, reversed_at null)
-- SELECT sp.payment_id,
--        sp.payment_date,
--        sp.amount_paid,
--        sp.term_id,
--        sp.prior_system_entry_id,
--        sp.reversed_at,
--        sp.receipt_number,
--        sp.notes,
--        sp.created_at
-- FROM public.student_payments AS sp
-- WHERE sp.student_id = 'PASTE_STUDENT_UUID'::uuid
-- ORDER BY sp.created_at DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- SECTION B — Repair (edit UUIDs + amount in the DO block, then run)
-- If anything errors, run: ROLLBACK;
-- ---------------------------------------------------------------------------
BEGIN;

-- >>> EDIT THESE <<<
-- payment row that wrongly had term_id set (from SECTION A)
-- \set bad_payment_id '00000000-0000-0000-0000-000000000000'
-- Or use a DO block with literals:

DO $$
DECLARE
  v_bad_payment_id uuid := 'PASTE_BAD_PAYMENT_ID'::uuid;
  v_prior_entry_id uuid := 'PASTE_PRIOR_ENTRY_ID'::uuid;
  v_recorded_by uuid := NULL; -- optional: staff users.user_id for audit trail
  v_amount numeric(12, 2) := 120000;
  v_school_id uuid;
  v_student_id uuid;
  v_prior_before numeric(12, 2);
BEGIN
  SELECT sp.school_id, sp.student_id
    INTO v_school_id, v_student_id
  FROM public.student_payments AS sp
  WHERE sp.payment_id = v_bad_payment_id;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Bad payment_id not found: %', v_bad_payment_id;
  END IF;

  SELECT p.amount_outstanding
    INTO v_prior_before
  FROM public.prior_system_balance_entries AS p
  WHERE p.id = v_prior_entry_id
    AND p.student_id = v_student_id
    AND p.school_id = v_school_id;

  IF v_prior_before IS NULL THEN
    RAISE EXCEPTION 'prior_system_balance_entries row not found for student/school';
  END IF;

  -- 1) Undo wrong term credit (triggers refresh balances / invoice paid sums)
  UPDATE public.student_payments AS sp
  SET reversed_at = now(),
      reversal_reason = 'Repair: payment was misallocated to term; re-posted as prior/external.'
  WHERE sp.payment_id = v_bad_payment_id
    AND sp.term_id IS NOT NULL
    AND sp.prior_system_entry_id IS NULL
    AND sp.reversed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not reverse payment % (wrong shape or already reversed?)', v_bad_payment_id;
  END IF;

  -- 2) If prior was incorrectly reduced (e.g. zero) while the mis-post existed, bump back up to v_amount first.
  IF v_prior_before < v_amount THEN
    UPDATE public.prior_system_balance_entries AS p
    SET amount_outstanding = v_amount
    WHERE p.id = v_prior_entry_id
      AND p.student_id = v_student_id
      AND p.school_id = v_school_id;
    v_prior_before := v_amount;
  END IF;

  IF v_prior_before < v_amount THEN
    RAISE EXCEPTION 'Prior outstanding (%) is still less than repair amount (%); fix prior row manually', v_prior_before, v_amount;
  END IF;

  -- 3) Record the payment against prior (term_id NULL). apply_prior_system_payment reduces prior.
  INSERT INTO public.student_payments (
    school_id,
    student_id,
    amount,
    amount_paid,
    payment_method,
    payment_date,
    recorded_by,
    notes,
    receipt_number,
    term_id,
    prior_system_entry_id
  )
  VALUES (
    v_school_id,
    v_student_id,
    v_amount,
    v_amount,
    'cash',
    CURRENT_DATE,
    v_recorded_by,
    'Repair: correct allocation to prior/external (after reversing term mis-post).',
    'REPAIR-PRIOR-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
    NULL,
    v_prior_entry_id
  );
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- SECTION C — Verify (run after SECTION B)
-- ---------------------------------------------------------------------------
/*
SELECT p.amount_outstanding AS prior_outstanding
FROM public.prior_system_balance_entries AS p
WHERE p.student_id = 'PASTE_STUDENT_UUID'::uuid;

SELECT sb.term_id, sb.total_fees, sb.total_paid, sb.balance
FROM public.student_balances AS sb
WHERE sb.student_id = 'PASTE_STUDENT_UUID'::uuid
ORDER BY sb.year, sb.term;

SELECT sp.payment_id, sp.amount_paid, sp.term_id, sp.prior_system_entry_id, sp.reversed_at
FROM public.student_payments AS sp
WHERE sp.student_id = 'PASTE_STUDENT_UUID'::uuid
ORDER BY sp.created_at DESC;
*/
