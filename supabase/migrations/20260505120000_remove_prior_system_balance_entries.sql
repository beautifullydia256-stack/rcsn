-- Remove prior_system_balance_entries: all legacy debt must live on term invoices.
-- If rows still have amount_outstanding, run 20260505110000_migrate_prior_balance_to_term_invoices_auto.sql first (or clear manually).
-- Preconditions (migration aborts with a clear error if not met):
--   1) No row in prior_system_balance_entries with amount_outstanding > 0.01
--   2) No active student_payments row still pointing at prior_system_entry_id

DO $$
DECLARE
  n_prior numeric;
  n_pay int;
BEGIN
  SELECT COALESCE(SUM(amount_outstanding), 0) INTO n_prior
  FROM public.prior_system_balance_entries;
  IF n_prior > 0.01 THEN
    RAISE EXCEPTION
      'remove_prior_system_balance_entries: prior_system_balance_entries still has amount_outstanding (total %). Move that debt onto term invoices (Billing) or set amount_outstanding to zero for each row before re-running this migration.',
      n_prior;
  END IF;

  SELECT COUNT(*)::int INTO n_pay
  FROM public.student_payments sp
  WHERE sp.prior_system_entry_id IS NOT NULL
    AND sp.reversed_at IS NULL
    AND COALESCE(sp.is_reversal, false) = false;
  IF n_pay > 0 THEN
    RAISE EXCEPTION
      'remove_prior_system_balance_entries: % student_payments rows still reference prior_system_entry_id (non-reversed). Reverse or reallocate those payments first.',
      n_pay;
  END IF;

  SELECT COUNT(*)::int INTO n_pay
  FROM public.student_payments sp
  WHERE sp.term_id IS NULL
    AND sp.reversed_at IS NULL
    AND COALESCE(sp.is_reversal, false) = false;
  IF n_pay > 0 THEN
    RAISE EXCEPTION
      'remove_prior_system_balance_entries: % student_payments rows have no term_id and are not reversed. Fix or reverse those rows first.',
      n_pay;
  END IF;
END $$;

-- Payment triggers / guards
DROP TRIGGER IF EXISTS trg_student_payments_apply_prior ON public.student_payments;
DROP TRIGGER IF EXISTS trg_student_payments_enforce_prior_first ON public.student_payments;

DROP TRIGGER IF EXISTS trg_prior_system_balance_one_time_guard ON public.prior_system_balance_entries;

DROP FUNCTION IF EXISTS public.apply_prior_system_payment();
DROP FUNCTION IF EXISTS public.enforce_pay_prior_before_term_payment();
DROP FUNCTION IF EXISTS public.move_prior_balance_to_term_opening_invoices(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.prior_system_balance_entries_enforce_one_time_new_student();

-- student_payments: term-only model for active rows
ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_term_xor_prior_check;

DROP INDEX IF EXISTS public.idx_student_payments_prior_entry;

ALTER TABLE public.student_payments
  DROP COLUMN IF EXISTS prior_system_entry_id;

ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_term_id_required_when_active;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_term_id_required_when_active
  CHECK (term_id IS NOT NULL OR reversed_at IS NOT NULL);

COMMENT ON CONSTRAINT student_payments_term_id_required_when_active ON public.student_payments IS
  'Active payments apply to a school term; reversed rows may be legacy.';

-- prior table policies (names from 20260429120000 / 20260421120000)
DROP POLICY IF EXISTS "prior_system_balance_entries_authenticated_select" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_school_staff_insert" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_school_staff_update" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_school_staff_delete" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_parent_select" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_student_select" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_school_users" ON public.prior_system_balance_entries;

DROP TABLE IF EXISTS public.prior_system_balance_entries;

-- Carry-over RPC: no prior-ledger guard
CREATE OR REPLACE FUNCTION public.apply_carryover_balance_to_term_invoice(
  p_school_id uuid,
  p_student_id uuid,
  p_term_id uuid,
  p_carryover_amount numeric,
  p_base_term_fee numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(12, 2);
  v_inv_num text;
  v_existing int;
  v_carry numeric(12, 2);
  v_base numeric(12, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: not authorized for this school';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.student_id = p_student_id
      AND s.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: student not found for this school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.school_terms st WHERE st.id = p_term_id AND st.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: term does not belong to this school';
  END IF;

  v_carry := round(COALESCE(p_carryover_amount, 0)::numeric, 2);
  v_base := round(GREATEST(COALESCE(p_base_term_fee, 0), 0)::numeric, 2);

  IF v_carry <= 0 THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: carryover amount must be positive';
  END IF;

  v_total := v_base + v_carry;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'apply_carryover_balance_to_term_invoice: total invoice amount must be positive';
  END IF;

  SELECT COUNT(*)::INT INTO v_existing
  FROM public.student_invoices si
  WHERE si.school_id = p_school_id
    AND si.student_id = p_student_id
    AND si.term_id = p_term_id
    AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text]);

  IF v_existing > 0 THEN
    RAISE EXCEPTION
      'apply_carryover_balance_to_term_invoice: student already has an active invoice for this term. Cancel or adjust it first.';
  END IF;

  v_inv_num := public.get_next_invoice_number(p_school_id);
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
  ) VALUES (
    p_school_id,
    p_student_id,
    p_term_id,
    v_inv_num,
    v_total,
    0,
    'issued',
    auth.uid(),
    NOW()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'invoice_number', v_inv_num,
    'total_amount', v_total,
    'base_term_fee', v_base,
    'carryover_amount', v_carry,
    'term_id', p_term_id
  );
END;
$$;

COMMENT ON FUNCTION public.apply_carryover_balance_to_term_invoice(uuid, uuid, uuid, numeric, numeric) IS
  'Creates one issued student_invoices row: optional term fee plus carry-over arrears. Term-only model (no prior ledger).';

GRANT EXECUTE ON FUNCTION public.apply_carryover_balance_to_term_invoice(uuid, uuid, uuid, numeric, numeric) TO authenticated;
