-- Auto-migrate prior_system_balance_entries onto term invoices (latest school_terms row
-- by end_date), then repoint prior-linked student_payments so sync_invoice_amount_paid stays correct.
--
-- Includes rows where amount_outstanding is already zero but active payments still
-- reference prior_system_entry_id (otherwise remove_prior_system_balance_entries fails).
--
-- For each prior row: invoice total is increased by (amount_outstanding + sum of active
-- prior-linked payments), then amount_outstanding is zeroed, then those payments are
-- flipped to term_id + invoice_id.
--
-- Run immediately BEFORE 20260505120000_remove_prior_system_balance_entries.sql.

DO $$
DECLARE
  r RECORD;
  v_tid uuid;
  v_pay_sum numeric(12, 2);
  v_delta numeric(12, 2);
  v_inv RECORD;
  v_inv_num text;
  v_new_total numeric(12, 2);
  v_status text;
  v_invoice_id uuid;
BEGIN
  FOR r IN
    SELECT p.id, p.school_id, p.student_id, p.amount_outstanding
    FROM public.prior_system_balance_entries AS p
    WHERE p.amount_outstanding > 0.01
       OR EXISTS (
         SELECT 1
         FROM public.student_payments AS sp
         WHERE sp.prior_system_entry_id = p.id
           AND sp.reversed_at IS NULL
           AND COALESCE(sp.is_reversal, false) = false
       )
    ORDER BY p.school_id, p.student_id
    FOR UPDATE OF p
  LOOP
    SELECT COALESCE(SUM(sp.amount_paid), 0) INTO v_pay_sum
    FROM public.student_payments AS sp
    WHERE sp.prior_system_entry_id = r.id
      AND sp.reversed_at IS NULL
      AND COALESCE(sp.is_reversal, false) = false;

    v_delta := r.amount_outstanding + v_pay_sum;

    SELECT st.id INTO v_tid
    FROM public.school_terms AS st
    WHERE st.school_id = r.school_id
    ORDER BY st.end_date DESC, st.year DESC, st.term DESC
    LIMIT 1;

    IF v_tid IS NULL THEN
      RAISE EXCEPTION
        'migrate_prior_balance_to_term_invoices_auto: school % has no school_terms; cannot migrate prior entry % (student %).',
        r.school_id,
        r.id,
        r.student_id;
    END IF;

    SELECT
      si.invoice_id,
      si.total_amount,
      si.amount_paid,
      si.status
    INTO v_inv
    FROM public.student_invoices AS si
    WHERE si.school_id = r.school_id
      AND si.student_id = r.student_id
      AND si.term_id = v_tid
    FOR UPDATE;

    IF NOT FOUND THEN
      v_inv_num := public.get_next_invoice_number(r.school_id);
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
        r.school_id,
        r.student_id,
        v_tid,
        v_inv_num,
        v_delta,
        0,
        'issued',
        NULL,
        NOW()
      )
      RETURNING invoice_id INTO v_invoice_id;
    ELSE
      v_invoice_id := v_inv.invoice_id;
      v_new_total := COALESCE(v_inv.total_amount, 0) + v_delta;

      IF COALESCE(v_inv.amount_paid, 0) >= v_new_total THEN
        v_status := 'paid';
      ELSIF COALESCE(v_inv.amount_paid, 0) > 0 THEN
        v_status := 'partial';
      ELSE
        v_status := 'issued';
      END IF;

      UPDATE public.student_invoices AS si
      SET
        total_amount = v_new_total,
        status = v_status,
        updated_at = NOW()
      WHERE si.invoice_id = v_invoice_id;
    END IF;

    UPDATE public.prior_system_balance_entries AS p
    SET
      amount_outstanding = 0,
      source_note = CONCAT_WS(
        ' | ',
        NULLIF(trim(COALESCE(p.source_note, '')), ''),
        format(
          'Auto-migrated %s (including %s already recorded as prior-linked payments) to term %s invoice %s',
          v_delta,
          v_pay_sum,
          v_tid,
          v_invoice_id
        )
      )
    WHERE p.id = r.id;

    UPDATE public.student_payments AS sp
    SET
      term_id = v_tid,
      invoice_id = v_invoice_id,
      prior_system_entry_id = NULL
    WHERE sp.prior_system_entry_id = r.id
      AND sp.reversed_at IS NULL
      AND COALESCE(sp.is_reversal, false) = false;
  END LOOP;
END $$;
