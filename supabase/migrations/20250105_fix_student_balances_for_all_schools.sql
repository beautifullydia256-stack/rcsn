-- ============================================================================
-- FIX STUDENT BALANCES FOR ALL SCHOOLS (CURRENT AND FUTURE)
-- ============================================================================
-- This migration ensures:
-- 1. Balance column auto-calculates (total_fees - total_paid)
-- 2. Trigger function works correctly
-- 3. Works for all schools automatically
-- ============================================================================

-- 1. Fix the trigger function to work with actual table structure
CREATE OR REPLACE FUNCTION public.set_student_balance_defaults_and_linking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Set updated_at if not provided
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Set created_at if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure student balance is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student balance must be linked to a school';
    END IF;
    
    -- Auto-populate year and term from term_id if not provided
    IF NEW.year IS NULL OR NEW.term IS NULL THEN
        SELECT st.year, st.term INTO NEW.year, NEW.term
        FROM public.school_terms st
        WHERE st.id = NEW.term_id;
    END IF;
    
    -- Auto-calculate balance if not set (for non-generated column)
    IF NEW.balance IS NULL THEN
        NEW.balance := COALESCE(NEW.total_fees, 0) - COALESCE(NEW.total_paid, 0);
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Make balance column auto-calculate (convert to generated column if possible)
-- First, check if we can alter it to generated
-- Note: PostgreSQL doesn't allow direct conversion, so we'll use a trigger instead

-- 3. Create/update trigger to auto-calculate balance on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.auto_calculate_student_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Always recalculate balance from total_fees - total_paid
    NEW.balance := COALESCE(NEW.total_fees, 0) - COALESCE(NEW.total_paid, 0);
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_calculate_balance ON public.student_balances;

-- Create trigger to auto-calculate balance
CREATE TRIGGER trigger_auto_calculate_balance
    BEFORE INSERT OR UPDATE ON public.student_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_calculate_student_balance();

-- 4. Fix any existing balances that have incorrect balance values
UPDATE public.student_balances
SET balance = COALESCE(total_fees, 0) - COALESCE(total_paid, 0)
WHERE balance != (COALESCE(total_fees, 0) - COALESCE(total_paid, 0));

-- 5. Create a function to initialize balances for new schools/terms
-- This can be called when a new term starts or when students are added
CREATE OR REPLACE FUNCTION public.initialize_student_balances_for_term(
    p_school_id UUID,
    p_term_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_year INTEGER;
    v_term INTEGER;
BEGIN
    -- Get year and term from term_id
    SELECT st.year, st.term INTO v_year, v_term
    FROM public.school_terms st
    WHERE st.id = p_term_id;
    
    IF v_year IS NULL OR v_term IS NULL THEN
        RAISE EXCEPTION 'Term with id % does not exist', p_term_id;
    END IF;
    
    -- Initialize balances for all active students who don't have a balance for this term
    INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid
    )
    SELECT 
        s.student_id,
        s.school_id,
        p_term_id,
        v_year,
        v_term,
        COALESCE(s.expected_fee_amount, 0) as total_fees,
        0 as total_paid
    FROM public.students s
    WHERE s.school_id = p_school_id
      AND s.status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM public.student_balances sb
          WHERE sb.student_id = s.student_id
            AND sb.term_id = p_term_id
      )
    ON CONFLICT (student_id, term_id) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.initialize_student_balances_for_term TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_student_balances_for_term TO service_role;

-- ============================================================================
-- COMPLETE
-- ============================================================================
-- Now:
-- 1. Balance will auto-calculate on INSERT/UPDATE
-- 2. Trigger function works correctly
-- 3. Function available to initialize balances for any school/term
-- ============================================================================

