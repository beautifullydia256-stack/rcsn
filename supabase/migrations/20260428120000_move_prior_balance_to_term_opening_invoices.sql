-- Option 1 (default goal): represent legacy/prior debt as real term invoices + balances
-- when the school can split the amount across historical terms — same rails as John Doe.
--
-- Replaces remaining prior_system_balance_entries.amount_outstanding with one issued
-- student_invoices row per allocation (term_id + amount). Triggers then maintain student_balances.
-- Prior row is zeroed (never deleted: student_payments may still reference prior_system_entry_id).

CREATE OR REPLACE FUNCTION public.move_prior_balance_to_term_opening_invoices(
  p_school_id uuid,
  p_student_id uuid,
  p_allocations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior public.prior_system_balance_entries%ROWTYPE;
  v_sum numeric(12, 2) := 0;
  v_amt numeric(12, 2);
  v_tid uuid;
  v_inv_num text;
  v_existing int;
  v_elem jsonb;
  v_i int;
  v_n int;
  const_tol numeric(12, 2) := 0.02;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'move_prior_balance_to_term_opening_invoices: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'move_prior_balance_to_term_opening_invoices: not authorized for this school';
  END IF;

  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'p_allocations must be a non-empty JSON array of objects: {"term_id": "<uuid>", "amount": <number>}';
  END IF;

  v_n := jsonb_array_length(p_allocations);
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value->>'term_id' AS tid
      FROM jsonb_array_elements(p_allocations) AS t(value)
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) AS dups
  ) THEN
    RAISE EXCEPTION 'Duplicate term_id in p_allocations. Use one row per term or combine amounts.';
  END IF;

  SELECT * INTO v_prior
  FROM public.prior_system_balance_entries
  WHERE school_id = p_school_id AND student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No prior_system_balance_entries row for this student at this school.';
  END IF;

  IF v_prior.amount_outstanding <= 0 THEN
    RAISE EXCEPTION 'Prior balance is already zero; nothing to move.';
  END IF;

  FOR v_i IN 0..(v_n - 1) LOOP
    v_elem := p_allocations->v_i;
    IF v_elem IS NULL OR jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Invalid allocation at index %', v_i;
    END IF;
    v_tid := NULLIF(trim(v_elem->>'term_id'), '')::uuid;
    v_amt := (v_elem->>'amount')::numeric;
    IF v_tid IS NULL OR v_amt IS NULL OR v_amt <= 0 THEN
      RAISE EXCEPTION 'Each allocation needs a valid term_id and a positive amount.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.school_terms st WHERE st.id = v_tid AND st.school_id = p_school_id) THEN
      RAISE EXCEPTION 'term_id % does not belong to this school.', v_tid;
    END IF;
    v_sum := v_sum + v_amt;
  END LOOP;

  IF ABS(v_sum - v_prior.amount_outstanding) > const_tol THEN
    RAISE EXCEPTION 'Sum of allocations (%) must equal prior amount_outstanding (%).', v_sum, v_prior.amount_outstanding;
  END IF;

  FOR v_i IN 0..(v_n - 1) LOOP
    v_elem := p_allocations->v_i;
    v_tid := NULLIF(trim(v_elem->>'term_id'), '')::uuid;
    v_amt := (v_elem->>'amount')::numeric;

    SELECT COUNT(*)::INT INTO v_existing
    FROM public.student_invoices si
    WHERE si.school_id = p_school_id
      AND si.student_id = p_student_id
      AND si.term_id = v_tid
      AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text]);

    IF v_existing > 0 THEN
      RAISE EXCEPTION
        'Student already has an active invoice for term %. Cancel/adjust it first, or omit that term from the split.',
        v_tid;
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
      v_tid,
      v_inv_num,
      v_amt,
      0,
      'issued',
      auth.uid(),
      NOW()
    );
  END LOOP;

  UPDATE public.prior_system_balance_entries AS p
  SET
    amount_outstanding = 0,
    source_note = CONCAT_WS(
      ' | ',
      NULLIF(trim(COALESCE(p.source_note, '')), ''),
      format(
        'Moved %s to term opening invoices on %s',
        trim(to_char(v_prior.amount_outstanding, '999999999999.99')),
        to_char(timezone('UTC', NOW()), 'YYYY-MM-DD')
      )
    )
  WHERE p.id = v_prior.id;

  RETURN jsonb_build_object(
    'ok', true,
    'prior_entry_id', v_prior.id,
    'allocations_applied', v_n,
    'amount_moved', v_sum
  );
END;
$$;

COMMENT ON FUNCTION public.move_prior_balance_to_term_opening_invoices(uuid, uuid, jsonb) IS
  'Zeros prior_system_balance_entries after creating issued student_invoices for each allocation (same model as multi-term balances).';

GRANT EXECUTE ON FUNCTION public.move_prior_balance_to_term_opening_invoices(uuid, uuid, jsonb) TO authenticated;
