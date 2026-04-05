-- Block apply_carryover_balance_to_term_invoice when the student already has invoice
-- balance on any term strictly before the school's calendar "current" term (matches
-- BillingPage + resolveCurrentSchoolTerm: in-window, then latest started, else earliest).

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
  v_cur_year int;
  v_cur_term int;
  v_today date;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date;

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

  SELECT st.year, st.term INTO v_cur_year, v_cur_term
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= v_today
    AND st.end_date >= v_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_cur_year IS NULL THEN
    SELECT st.year, st.term INTO v_cur_year, v_cur_term
    FROM public.school_terms st
    WHERE st.school_id = p_school_id
      AND st.start_date IS NOT NULL
      AND st.start_date <= v_today
    ORDER BY st.year DESC, st.term DESC
    LIMIT 1;
  END IF;

  IF v_cur_year IS NULL THEN
    SELECT st.year, st.term INTO v_cur_year, v_cur_term
    FROM public.school_terms st
    WHERE st.school_id = p_school_id
    ORDER BY st.year ASC, st.term ASC
    LIMIT 1;
  END IF;

  IF v_cur_year IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.student_invoices si
       JOIN public.school_terms st ON st.id = si.term_id AND st.school_id = si.school_id
       WHERE si.school_id = p_school_id
         AND si.student_id = p_student_id
         AND si.status <> 'cancelled'::text
         AND si.balance > 0.01::numeric
         AND (
           st.year < v_cur_year
           OR (st.year = v_cur_year AND st.term < v_cur_term)
         )
     )
  THEN
    RAISE EXCEPTION
      'apply_carryover_balance_to_term_invoice: this student already has outstanding on a past term. Additional carry-over is not allowed; adjust existing invoices if needed.';
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
  'Creates one issued student_invoices row: optional term fee plus carry-over. Rejects if student already has balance on a past term.';
