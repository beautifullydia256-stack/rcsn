-- ============================================================================
-- Repair: opening balances (and related rows) tied to *future* school_terms
-- (start_date > today) are merged into the calendar *current* term for that school.
-- Matches logic in public.auto_initialize_student_balance (20260403120000).
--
-- Safe to run multiple times: future-term rows with zero amounts after merge are deleted.
-- Run diagnostics in supabase/scripts/diagnose_misplaced_balances.sql first.
--
-- Optional one-off (all schools):
--   SELECT * FROM public.repair_misplaced_opening_balances_to_current_term(NULL);
-- Single school (e.g. Mulungi):
--   SELECT * FROM public.repair_misplaced_opening_balances_to_current_term('SCHOOL_UUID'::uuid);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_current_school_term_id(
  p_school_id UUID,
  p_today DATE DEFAULT (CURRENT_DATE)
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
BEGIN
  SELECT st.id INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= p_today
    AND st.end_date >= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.start_date <= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
  ORDER BY st.year ASC, st.term ASC
  LIMIT 1;

  RETURN v_term_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_current_school_term_id(UUID, DATE) IS
  'Calendar current term for a school (in-window, else latest started, else earliest).';

CREATE OR REPLACE FUNCTION public.repair_misplaced_opening_balances_to_current_term(
  p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
  school_id_out UUID,
  school_name_out TEXT,
  current_term_id UUID,
  future_term_ids UUID[],
  balances_merged BIGINT,
  balances_deleted BIGINT,
  payments_repointed BIGINT,
  invoices_repointed BIGINT,
  invoices_skipped BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_school RECORD;
  v_cur UUID;
  v_future UUID[];
  v_y INT;
  v_t INT;
  v_merged BIGINT;
  v_del BIGINT;
  v_pay BIGINT;
  v_inv BIGINT;
  v_inv_skip BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  FOR r_school IN
    SELECT s.school_id, s.name::TEXT AS school_name
    FROM public.schools s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    school_id_out := r_school.school_id;
    school_name_out := r_school.school_name;
    v_merged := 0;
    v_del := 0;
    v_pay := 0;
    v_inv := 0;
    v_inv_skip := 0;
    current_term_id := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF current_term_id IS NULL THEN
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_skipped := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT ARRAY_AGG(st.id ORDER BY st.year, st.term)
    INTO v_future
    FROM public.school_terms st
    WHERE st.school_id = r_school.school_id
      AND st.start_date IS NOT NULL
      AND st.start_date > v_today;

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_skipped := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    future_term_ids := v_future;

    SELECT st.year, st.term INTO v_y, v_t
    FROM public.school_terms st
    WHERE st.id = current_term_id;

    -- 1) Merge numeric balances from future terms into current term row
    --    (invoice-style schema: no class_id / last_payment_date on student_balances)
    WITH src AS (
      SELECT
        sb.student_id,
        sb.school_id,
        SUM(COALESCE(sb.total_fees, 0)) AS add_fees,
        SUM(COALESCE(sb.total_paid, 0)) AS add_paid
      FROM public.student_balances sb
      WHERE sb.school_id = r_school.school_id
        AND sb.term_id = ANY (v_future)
      GROUP BY sb.student_id, sb.school_id
      HAVING SUM(COALESCE(sb.total_fees, 0)) > 0 OR SUM(COALESCE(sb.total_paid, 0)) > 0
    ),
    upsert AS (
      INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid,
        updated_at
      )
      SELECT
        src.student_id,
        src.school_id,
        current_term_id,
        COALESCE(v_y, EXTRACT(YEAR FROM v_today)::INT),
        COALESCE(v_t, 1),
        src.add_fees,
        src.add_paid,
        NOW()
      FROM src
      ON CONFLICT (student_id, term_id) DO UPDATE SET
        total_fees = public.student_balances.total_fees + EXCLUDED.total_fees,
        total_paid = public.student_balances.total_paid + EXCLUDED.total_paid,
        year = COALESCE(EXCLUDED.year, public.student_balances.year),
        term = COALESCE(EXCLUDED.term, public.student_balances.term),
        updated_at = NOW()
      RETURNING 1
    )
    SELECT COUNT(*)::BIGINT INTO v_merged FROM upsert;

    -- 2) Remove future-term balance rows (opening fees must not sit in an unstarted term)
    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future);
    GET DIAGNOSTICS v_del = ROW_COUNT;

    -- 3) Point payments at current term (trigger may refresh totals)
    UPDATE public.student_payments sp
    SET term_id = current_term_id
    WHERE sp.school_id = r_school.school_id
      AND sp.term_id = ANY (v_future);
    GET DIAGNOSTICS v_pay = ROW_COUNT;

    -- 4) Invoices: move only when no duplicate (school, student, current_term)
    UPDATE public.student_invoices si
    SET term_id = current_term_id,
        updated_at = NOW()
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = current_term_id
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv = ROW_COUNT;

    SELECT COUNT(*)::BIGINT INTO v_inv_skip
    FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future);

    -- 5) Re-align total_paid on current term with payments ledger (covers reversals / moves)
    UPDATE public.student_balances sb
    SET total_paid = COALESCE(p.sum_paid, 0),
        updated_at = NOW()
    FROM (
      SELECT sp.student_id, sp.term_id, SUM(sp.amount_paid) AS sum_paid
      FROM public.student_payments sp
      WHERE sp.school_id = r_school.school_id
        AND sp.term_id = current_term_id
        AND sp.reversed_at IS NULL
      GROUP BY sp.student_id, sp.term_id
    ) p
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = current_term_id
      AND sb.student_id = p.student_id;

    balances_merged := v_merged;
    balances_deleted := v_del;
    payments_repointed := v_pay;
    invoices_repointed := v_inv;
    invoices_skipped := v_inv_skip;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.repair_misplaced_opening_balances_to_current_term(UUID) IS
  'Moves opening balances (and payments/invoices) off future-dated terms onto the calendar current term.';

GRANT EXECUTE ON FUNCTION public.resolve_current_school_term_id(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_current_school_term_id(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_misplaced_opening_balances_to_current_term(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_misplaced_opening_balances_to_current_term(UUID) TO service_role;
