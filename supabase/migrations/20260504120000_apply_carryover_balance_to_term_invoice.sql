-- Direct carry-over: create one issued student_invoices row on a chosen past term (plus optional
-- same-invoice term fee). Avoids prior_system_balance_entries for the normal onboarding path.

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

  IF EXISTS (
    SELECT 1
    FROM public.prior_system_balance_entries p
    WHERE p.school_id = p_school_id
      AND p.student_id = p_student_id
      AND p.amount_outstanding > 0
  ) THEN
    RAISE EXCEPTION
      'apply_carryover_balance_to_term_invoice: this student still has a prior-system balance. Use move_prior_balance_to_term_opening_invoices or clear that entry first.';
  END IF;

  v_carry := round(coalesce(p_carryover_amount, 0), 2);
  v_base := round(greatest(coalesce(p_base_term_fee, 0), 0), 2);

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
  'Creates one issued student_invoices row: optional term fee (p_base_term_fee) plus carry-over (p_carryover_amount). Does not use prior_system_balance_entries.';

GRANT EXECUTE ON FUNCTION public.apply_carryover_balance_to_term_invoice(uuid, uuid, uuid, numeric, numeric) TO authenticated;
