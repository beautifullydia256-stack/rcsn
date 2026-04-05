-- reconcile_term_invoice_payments used to DELETE student_balances when no invoice
-- existed for (student, term). Any payment then made that term "disappear" from the
-- Record Payment modal (which reads student_balances), while student_payments still
-- held the cash — and other terms could look "wrong" after refresh.
--
-- New rule: if there are no invoices, keep a balance row aligned with
-- total_term_payments_amount_paid, preserving existing student_balances.total_fees
-- when present so partial pay on legacy terms does not wipe the term.

CREATE OR REPLACE FUNCTION public.reconcile_term_invoice_payments(p_student_id uuid, p_term_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric(12, 2);
  v_rem numeric(12, 2);
  v_alloc numeric(12, 2);
  r record;
  v_school uuid;
  v_year int;
  v_term int;
  v_total_fees numeric(12, 2);
BEGIN
  SELECT public.total_term_payments_amount_paid(p_student_id, p_term_id) INTO v_paid;

  SELECT si.school_id INTO v_school
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id AND si.term_id = p_term_id
  LIMIT 1;

  IF v_school IS NULL THEN
    SELECT s.school_id INTO v_school
    FROM public.students s
    WHERE s.student_id = p_student_id
    LIMIT 1;

    IF v_school IS NULL THEN
      DELETE FROM public.student_balances sb
      WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;
      RETURN;
    END IF;

    SELECT sb.total_fees INTO v_total_fees
    FROM public.student_balances sb
    WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;

    v_total_fees := COALESCE(v_total_fees, 0::numeric(12, 2));

    IF v_total_fees <= 0 AND v_paid > 0 THEN
      v_total_fees := v_paid;
    END IF;

    IF v_total_fees <= 0 AND v_paid <= 0 THEN
      DELETE FROM public.student_balances sb
      WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;
      RETURN;
    END IF;

    SELECT st.year, st.term INTO v_year, v_term
    FROM public.school_terms st
    WHERE st.id = p_term_id;

    INSERT INTO public.student_balances (
      student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at
    )
    VALUES (
      p_student_id,
      v_school,
      p_term_id,
      COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
      COALESCE(v_term, 1),
      v_total_fees,
      v_paid,
      v_total_fees - v_paid,
      NOW()
    )
    ON CONFLICT (student_id, term_id)
    DO UPDATE SET
      total_fees = EXCLUDED.total_fees,
      total_paid = EXCLUDED.total_paid,
      balance = EXCLUDED.balance,
      updated_at = NOW();

    RETURN;
  END IF;

  v_rem := v_paid;

  FOR r IN
    SELECT si.invoice_id, si.total_amount
    FROM public.student_invoices si
    WHERE si.student_id = p_student_id
      AND si.term_id = p_term_id
      AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text])
    ORDER BY si.is_supplementary ASC, si.created_at ASC NULLS LAST, si.invoice_id ASC
  LOOP
    v_alloc := least(r.total_amount, greatest(v_rem, 0::numeric));
    UPDATE public.student_invoices si
    SET
      amount_paid = v_alloc,
      status = CASE
        WHEN (r.total_amount - v_alloc) <= 0 THEN 'paid'::text
        WHEN v_alloc > 0 THEN 'partial'::text
        ELSE 'issued'::text
      END,
      updated_at = NOW()
    WHERE si.invoice_id = r.invoice_id;
    v_rem := v_rem - v_alloc;
  END LOOP;

  SELECT COALESCE(SUM(si.total_amount), 0)::numeric(12, 2) INTO v_total_fees
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id
    AND si.term_id = p_term_id
    AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text]);

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id;

  INSERT INTO public.student_balances (
    student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at
  )
  VALUES (
    p_student_id,
    v_school,
    p_term_id,
    COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
    COALESCE(v_term, 1),
    v_total_fees,
    v_paid,
    v_total_fees - v_paid,
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_fees = EXCLUDED.total_fees,
    total_paid = EXCLUDED.total_paid,
    balance = EXCLUDED.balance,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.reconcile_term_invoice_payments(uuid, uuid) IS
  'Waterfall term payments onto invoices when invoices exist; otherwise upserts student_balances from existing total_fees and payments (no silent delete).';
