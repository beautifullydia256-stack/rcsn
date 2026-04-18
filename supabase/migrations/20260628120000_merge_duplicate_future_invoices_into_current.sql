-- ============================================================================
-- Students with BOTH a main invoice on the engine-current term AND invoices on
-- engine-future terms: merge future invoice totals into the current main invoice,
-- then remove future invoices/balances. Remaining future-only rows are handled by
-- repair_engine_future_term_financials.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merge_duplicate_future_invoices_into_current(
  p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
  school_id_out UUID,
  school_name_out TEXT,
  current_term_id UUID,
  invoices_merged BIGINT,
  future_invoices_deleted BIGINT,
  future_balances_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_school RECORD;
  v_cur UUID;
  v_future UUID[];
  v_cy INT;
  v_ct INT;
  v_today DATE := CURRENT_DATE;
  v_merge BIGINT;
  v_inv_del BIGINT;
  v_bal_del BIGINT;
BEGIN
  FOR r_school IN
    SELECT s.school_id, s.name::TEXT AS school_name
    FROM public.schools s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    school_id_out := r_school.school_id;
    school_name_out := r_school.school_name;
    v_merge := 0;
    v_inv_del := 0;
    v_bal_del := 0;

    v_cur := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF v_cur IS NULL THEN
      current_term_id := NULL;
      invoices_merged := 0;
      future_invoices_deleted := 0;
      future_balances_deleted := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT st.year, st.term INTO v_cy, v_ct
    FROM public.school_terms st
    WHERE st.id = v_cur;

    SELECT ARRAY_AGG(st.id ORDER BY st.year, st.term)
    INTO v_future
    FROM public.school_terms st
    WHERE st.school_id = r_school.school_id
      AND (
        st.year > v_cy
        OR (st.year = v_cy AND st.term > v_ct)
      );

    current_term_id := v_cur;

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      invoices_merged := 0;
      future_invoices_deleted := 0;
      future_balances_deleted := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- 1) Add all future-term invoice totals (main + supplementary) onto current main invoice
    WITH upd AS (
      UPDATE public.student_invoices cur
      SET
        total_amount = cur.total_amount + sub.add_amt,
        updated_at = NOW()
      FROM (
        SELECT
          si.student_id,
          SUM(COALESCE(si.total_amount, 0)) AS add_amt
        FROM public.student_invoices si
        WHERE si.school_id = r_school.school_id
          AND si.term_id = ANY (v_future)
          AND COALESCE(si.status, '') IS DISTINCT FROM 'cancelled'
        GROUP BY si.student_id
      ) sub
      WHERE cur.school_id = r_school.school_id
        AND cur.term_id = v_cur
        AND cur.student_id = sub.student_id
        AND COALESCE(cur.is_supplementary, false) = false
        AND EXISTS (
          SELECT 1
          FROM public.student_invoices o
          WHERE o.school_id = r_school.school_id
            AND o.student_id = sub.student_id
            AND o.term_id = ANY (v_future)
        )
      RETURNING cur.invoice_id
    )
    SELECT COUNT(*)::BIGINT INTO v_merge FROM upd;

    -- 2) Delete future-term invoices only when student already has current-term coverage
    DELETE FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = v_cur
          AND COALESCE(o.is_supplementary, false) = false
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv_del = ROW_COUNT;

    -- 3) Drop future-term balance rows when a current-term balance exists (ledger duplicate)
    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future)
      AND EXISTS (
        SELECT 1
        FROM public.student_balances o
        WHERE o.school_id = sb.school_id
          AND o.student_id = sb.student_id
          AND o.term_id = v_cur
          AND o.balance_id IS DISTINCT FROM sb.balance_id
      );
    GET DIAGNOSTICS v_bal_del = ROW_COUNT;

    -- 4) Reconcile current term for students touched
    PERFORM public.reconcile_term_invoice_payments(s.student_id, v_cur)
    FROM (
      SELECT DISTINCT si.student_id
      FROM public.student_invoices si
      WHERE si.school_id = r_school.school_id
        AND si.term_id = v_cur
    ) s;

    invoices_merged := v_merge;
    future_invoices_deleted := v_inv_del;
    future_balances_deleted := v_bal_del;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.merge_duplicate_future_invoices_into_current(UUID) IS
  'Merges future-term invoice totals into current main invoice, then deletes duplicate future invoices/balances.';

GRANT EXECUTE ON FUNCTION public.merge_duplicate_future_invoices_into_current(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_future_invoices_into_current(UUID) TO service_role;

SELECT * FROM public.merge_duplicate_future_invoices_into_current(NULL);

SELECT * FROM public.repair_engine_future_term_financials(NULL);
