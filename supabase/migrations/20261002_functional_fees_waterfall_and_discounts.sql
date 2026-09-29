-- ============================================================================
-- PwezaCore Migration: Functional Fees Priority Waterfall & Discounts Audit
-- Enforces priority payment allocation at the DATABASE LEVEL:
-- 1. Functional Fees (Standard Institutional Levies + Hostel/Boarding Fees)
--    MUST be satisfied 100% first before any shilling credits Base Tuition.
-- 2. Base Tuition is satisfied ONLY after Functional Fees balance reaches 0.
-- ============================================================================

-- 1. Add dedicated waterfall breakdown columns to student_balances
ALTER TABLE public.student_balances
  ADD COLUMN IF NOT EXISTS functional_fees_billed NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS functional_fees_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_tuition_billed NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_tuition_paid NUMERIC DEFAULT 0;

-- 2. Create PostgreSQL Waterfall Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_fee_waterfall(
    p_functional_billed NUMERIC,
    p_tuition_billed NUMERIC,
    p_total_paid NUMERIC
)
RETURNS TABLE (
    functional_paid NUMERIC,
    base_tuition_paid NUMERIC,
    functional_balance NUMERIC,
    base_tuition_balance NUMERIC,
    is_functional_cleared BOOLEAN,
    is_tuition_cleared BOOLEAN,
    is_fully_cleared BOOLEAN,
    clearance_status TEXT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_func_billed NUMERIC := GREATEST(0, COALESCE(p_functional_billed, 0));
    v_tuit_billed NUMERIC := GREATEST(0, COALESCE(p_tuition_billed, 0));
    v_paid NUMERIC := GREATEST(0, COALESCE(p_total_paid, 0));
    v_f_paid NUMERIC;
    v_f_bal NUMERIC;
    v_t_paid NUMERIC;
    v_t_bal NUMERIC;
    v_f_cleared BOOLEAN;
    v_t_cleared BOOLEAN;
    v_fully_cleared BOOLEAN;
    v_status TEXT;
BEGIN
    -- Step 1: 100% priority to Functional Fees
    v_f_paid := LEAST(v_paid, v_func_billed);
    v_f_bal := GREATEST(0, v_func_billed - v_f_paid);

    -- Step 2: Residual funds to Base Tuition
    v_t_paid := LEAST(GREATEST(0, v_paid - v_f_paid), v_tuit_billed);
    v_t_bal := GREATEST(0, v_tuit_billed - v_t_paid);

    v_f_cleared := (v_f_bal = 0);
    v_t_cleared := (v_t_bal = 0);
    v_fully_cleared := (v_f_cleared AND v_t_cleared);

    IF v_fully_cleared THEN
        v_status := 'FULLY_CLEARED';
    ELSIF v_f_cleared THEN
        v_status := 'FUNCTIONAL_CLEARED_TUITION_PENDING';
    ELSE
        v_status := 'FUNCTIONAL_PENDING';
    END IF;

    RETURN QUERY SELECT
        v_f_paid,
        v_t_paid,
        v_f_bal,
        v_t_bal,
        v_f_cleared,
        v_t_cleared,
        v_fully_cleared,
        v_status;
END;
$$;

-- 3. Database Trigger: Automatically enforce waterfall on student_balances
CREATE OR REPLACE FUNCTION public.sync_student_balance_waterfall()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_func_billed NUMERIC;
    v_tuit_billed NUMERIC;
    v_paid NUMERIC;
    v_f_paid NUMERIC;
    v_t_paid NUMERIC;
BEGIN
    v_paid := GREATEST(0, COALESCE(NEW.total_paid, 0));
    
    -- If functional_fees_billed or base_tuition_billed are zero or null,
    -- derive from total_fees: 40% functional levies + 60% base tuition
    IF COALESCE(NEW.functional_fees_billed, 0) = 0 AND COALESCE(NEW.base_tuition_billed, 0) = 0 AND COALESCE(NEW.total_fees, 0) > 0 THEN
        v_func_billed := ROUND(NEW.total_fees * 0.40);
        v_tuit_billed := GREATEST(0, NEW.total_fees - v_func_billed);
        NEW.functional_fees_billed := v_func_billed;
        NEW.base_tuition_billed := v_tuit_billed;
    ELSE
        v_func_billed := GREATEST(0, COALESCE(NEW.functional_fees_billed, 0));
        v_tuit_billed := GREATEST(0, COALESCE(NEW.base_tuition_billed, 0));
    END IF;

    -- Apply strict priority waterfall directly in the table row
    v_f_paid := LEAST(v_paid, v_func_billed);
    v_t_paid := LEAST(GREATEST(0, v_paid - v_f_paid), v_tuit_billed);

    NEW.functional_fees_paid := v_f_paid;
    NEW.base_tuition_paid := v_t_paid;
    NEW.balance := GREATEST(0, COALESCE(NEW.total_fees, 0) - v_paid);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_balance_waterfall ON public.student_balances;
CREATE TRIGGER trg_sync_student_balance_waterfall
BEFORE INSERT OR UPDATE OF total_fees, total_paid, functional_fees_billed, base_tuition_billed
ON public.student_balances
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_balance_waterfall();

-- 4. Create Database View for Instant Server-Side Reporting
CREATE OR REPLACE VIEW public.view_student_fee_waterfall AS
SELECT
    sb.student_id,
    s.name AS student_name,
    s.admission_number,
    s.current_class,
    COALESCE(s.boarding_type, 'Day Scholar') AS boarding_type,
    sb.school_id,
    sb.term_id,
    st.term,
    st.year,
    COALESCE(sb.functional_fees_billed, 0) AS functional_fees_billed,
    COALESCE(sb.functional_fees_paid, 0) AS functional_fees_paid,
    GREATEST(0, COALESCE(sb.functional_fees_billed, 0) - COALESCE(sb.functional_fees_paid, 0)) AS functional_fees_balance,
    COALESCE(sb.base_tuition_billed, 0) AS base_tuition_billed,
    COALESCE(sb.base_tuition_paid, 0) AS base_tuition_paid,
    GREATEST(0, COALESCE(sb.base_tuition_billed, 0) - COALESCE(sb.base_tuition_paid, 0)) AS base_tuition_balance,
    COALESCE(sb.total_fees, 0) AS total_fees,
    COALESCE(sb.total_paid, 0) AS total_paid,
    COALESCE(sb.balance, 0) AS total_balance,
    (COALESCE(sb.functional_fees_paid, 0) >= COALESCE(sb.functional_fees_billed, 0)) AS is_functional_cleared,
    (COALESCE(sb.balance, 0) <= 0 AND COALESCE(sb.total_fees, 0) > 0) AS is_fully_cleared,
    CASE
        WHEN COALESCE(sb.balance, 0) <= 0 AND COALESCE(sb.total_fees, 0) > 0 THEN 'FULLY_CLEARED'
        WHEN COALESCE(sb.functional_fees_paid, 0) >= COALESCE(sb.functional_fees_billed, 0) THEN 'FUNCTIONAL_CLEARED_TUITION_PENDING'
        ELSE 'FUNCTIONAL_PENDING'
    END AS clearance_status
FROM public.student_balances sb
JOIN public.students s ON s.student_id = sb.student_id
LEFT JOIN public.school_terms st ON st.id = sb.term_id
WHERE s.deleted_at IS NULL;

-- 5. RPC Function: Official Discounts & Bursaries Audit at DB level
CREATE OR REPLACE FUNCTION public.get_discounts_and_bursaries_audit(
    p_school_id UUID,
    p_term_id UUID DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    admission_number TEXT,
    current_class TEXT,
    term_id UUID,
    term_number INTEGER,
    term_year INTEGER,
    gross_fee NUMERIC,
    discount_percentage NUMERIC,
    discount_amount NUMERIC,
    discount_reason TEXT,
    net_billed NUMERIC,
    amount_paid NUMERIC,
    balance NUMERIC,
    is_100_percent BOOLEAN,
    clearance_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH invoice_discounts AS (
        SELECT
            inv.student_id,
            inv.term_id,
            inv.total_amount AS net_amount,
            COALESCE(inv.bursary_discount, 0) AS bursary_pct
        FROM public.student_invoices inv
        WHERE inv.school_id = p_school_id
          AND COALESCE(inv.bursary_discount, 0) > 0
          AND (p_term_id IS NULL OR inv.term_id = p_term_id)
          AND inv.status != 'cancelled'
    ),
    discount_records AS (
        SELECT
            sd.student_id,
            sd.term_id,
            sd.amount AS fixed_amount,
            sd.percentage AS pct,
            sd.reason
        FROM public.student_discounts sd
        WHERE sd.school_id = p_school_id
          AND (p_term_id IS NULL OR sd.term_id = p_term_id)
    )
    SELECT
        s.student_id,
        s.name::TEXT AS student_name,
        COALESCE(s.admission_number, '—')::TEXT AS admission_number,
        COALESCE(s.current_class, '—')::TEXT AS current_class,
        st.id AS term_id,
        st.term AS term_number,
        st.year AS term_year,
        -- Gross Fee
        CASE
            WHEN COALESCE(id.bursary_pct, 0) > 0 AND id.bursary_pct < 100 THEN
                ROUND(id.net_amount / (1 - (id.bursary_pct / 100.0)))
            ELSE
                COALESCE(sb.total_fees, 0) + COALESCE(dr.fixed_amount, 0)
        END AS gross_fee,
        -- Discount Percentage
        COALESCE(id.bursary_pct, dr.pct, 0) AS discount_percentage,
        -- Discount Amount
        CASE
            WHEN COALESCE(id.bursary_pct, 0) >= 100 THEN COALESCE(sb.total_fees, 0)
            WHEN COALESCE(id.bursary_pct, 0) > 0 THEN
                ROUND((id.net_amount / (1 - (id.bursary_pct / 100.0))) - id.net_amount)
            ELSE COALESCE(dr.fixed_amount, 0)
        END AS discount_amount,
        -- Discount Reason
        COALESCE(dr.reason, CASE WHEN COALESCE(id.bursary_pct, 0) >= 100 THEN '100% Full Bursary Waiver' ELSE 'Institutional Scholarship' END)::TEXT AS discount_reason,
        -- Net Billed
        COALESCE(sb.total_fees, id.net_amount, 0) AS net_billed,
        -- Amount Paid
        COALESCE(sb.total_paid, 0) AS amount_paid,
        -- Balance
        COALESCE(sb.balance, 0) AS balance,
        -- Is 100 Percent
        (COALESCE(id.bursary_pct, dr.pct, 0) >= 100) AS is_100_percent,
        -- Clearance Status
        CASE
            WHEN COALESCE(id.bursary_pct, dr.pct, 0) >= 100 THEN '100% Free Waiver'
            WHEN COALESCE(sb.balance, 0) <= 0 THEN 'Net Cleared'
            WHEN COALESCE(sb.total_paid, 0) > 0 THEN 'Partial'
            ELSE 'Pending'
        END::TEXT AS clearance_status
    FROM public.students s
    JOIN public.student_balances sb ON sb.student_id = s.student_id
    LEFT JOIN invoice_discounts id ON id.student_id = s.student_id AND id.term_id = sb.term_id
    LEFT JOIN discount_records dr ON dr.student_id = s.student_id AND dr.term_id = sb.term_id
    JOIN public.school_terms st ON st.id = sb.term_id
    WHERE s.school_id = p_school_id
      AND s.deleted_at IS NULL
      AND (id.student_id IS NOT NULL OR dr.student_id IS NOT NULL)
    ORDER BY (COALESCE(id.bursary_pct, dr.pct, 0) >= 100) DESC, s.name ASC;
END;
$$;

-- 6. Grant Permissions
GRANT SELECT ON public.view_student_fee_waterfall TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_fee_waterfall TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_discounts_and_bursaries_audit TO authenticated;
