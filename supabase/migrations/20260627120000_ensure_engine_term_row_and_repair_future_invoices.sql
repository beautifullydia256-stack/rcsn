-- ============================================================================
-- 1) resolve_current_school_term_id: never fall back to date windows when the
--    global calendar is known — create the missing school_terms row from global_terms
--    so new students always attach to the correct (year, term).
-- 2) repair_engine_future_term_financials: move invoices/balances/payments that
--    sit on engine-future terms (e.g. Term 3 while calendar is Term 1) onto the
--    engine current term. Fixes bad rows from old auto_initialize / fallbacks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_current_school_term_id(
  p_school_id UUID,
  p_today DATE DEFAULT (CURRENT_DATE)
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
  v_cal_year INTEGER;
  v_cal_term INTEGER;
BEGIN
  PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT);

  SELECT g.year, g.term
  INTO v_cal_year, v_cal_term
  FROM public.global_calendar_year_term(p_today) g;

  IF v_cal_year IS NULL THEN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT - 1);
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT + 1);
    SELECT g.year, g.term
    INTO v_cal_year, v_cal_term
    FROM public.global_calendar_year_term(p_today) g;
  END IF;

  IF v_cal_year IS NOT NULL THEN
    SELECT st.id
    INTO v_term_id
    FROM public.school_terms st
    WHERE st.school_id = p_school_id
      AND st.year = v_cal_year
      AND st.term = v_cal_term
    LIMIT 1;

    IF v_term_id IS NULL THEN
      INSERT INTO public.school_terms (
        school_id,
        year,
        term,
        start_date,
        end_date,
        is_current,
        global_term_id
      )
      SELECT
        p_school_id,
        gt.year,
        gt.term,
        gt.window_start,
        gt.hard_stop_date,
        (p_today >= gt.window_start AND p_today <= gt.hard_stop_date),
        gt.id
      FROM public.global_terms gt
      WHERE gt.year = v_cal_year AND gt.term = v_cal_term
      ON CONFLICT (school_id, year, term) DO NOTHING;

      SELECT st.id
      INTO v_term_id
      FROM public.school_terms st
      WHERE st.school_id = p_school_id
        AND st.year = v_cal_year
        AND st.term = v_cal_term
      LIMIT 1;
    END IF;
  END IF;

  IF v_term_id IS NOT NULL THEN
    RETURN v_term_id;
  END IF;

  -- No global row for this date (rare): legacy fallbacks only then
  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= p_today
    AND st.end_date >= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.start_date <= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
  ORDER BY st.year ASC, st.term ASC
  LIMIT 1;

  RETURN v_term_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_current_school_term_id(UUID, DATE) IS
  'Engine current term: global (year, term) + school_terms row; auto-inserts row from global_terms when missing.';

-- ---------------------------------------------------------------------------
-- Repair: financial rows on terms strictly after engine current → current term
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_engine_future_term_financials(
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
  invoices_still_on_future BIGINT
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
  v_merged BIGINT;
  v_del BIGINT;
  v_pay BIGINT;
  v_inv BIGINT;
  v_left BIGINT;
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
    v_left := 0;

    v_cur := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF v_cur IS NULL THEN
      current_term_id := NULL;
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_still_on_future := 0;
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
    future_term_ids := COALESCE(v_future, ARRAY[]::UUID[]);

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_still_on_future := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

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
        v_cur,
        COALESCE(v_cy, EXTRACT(YEAR FROM v_today)::INT),
        COALESCE(v_ct, 1),
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

    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future);
    GET DIAGNOSTICS v_del = ROW_COUNT;

    UPDATE public.student_payments sp
    SET term_id = v_cur
    WHERE sp.school_id = r_school.school_id
      AND sp.term_id = ANY (v_future);
    GET DIAGNOSTICS v_pay = ROW_COUNT;

    UPDATE public.student_invoices si
    SET term_id = v_cur,
        updated_at = NOW()
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = v_cur
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv = ROW_COUNT;

    SELECT COUNT(*)::BIGINT INTO v_left
    FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future);

    UPDATE public.student_balances sb
    SET total_paid = COALESCE(p.sum_paid, 0),
        updated_at = NOW()
    FROM (
      SELECT sp.student_id, sp.term_id, SUM(sp.amount_paid) AS sum_paid
      FROM public.student_payments sp
      WHERE sp.school_id = r_school.school_id
        AND sp.term_id = v_cur
        AND sp.reversed_at IS NULL
      GROUP BY sp.student_id, sp.term_id
    ) p
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = v_cur
      AND sb.student_id = p.student_id;

    balances_merged := v_merged;
    balances_deleted := v_del;
    payments_repointed := v_pay;
    invoices_repointed := v_inv;
    invoices_still_on_future := v_left;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.repair_engine_future_term_financials(UUID) IS
  'Moves balances, payments, and invoices from engine-future school_terms onto the engine current term (same logic as new-student invoices).';

GRANT EXECUTE ON FUNCTION public.repair_engine_future_term_financials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_engine_future_term_financials(UUID) TO service_role;

-- One-time data repair for all schools (idempotent for rows already correct)
SELECT * FROM public.repair_engine_future_term_financials(NULL);
