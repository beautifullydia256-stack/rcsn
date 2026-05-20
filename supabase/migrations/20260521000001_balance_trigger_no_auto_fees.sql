-- Migration: Fix auto_create_balance_for_new_student trigger + balance data cleanup
--
-- ROOT CAUSE: The trigger was setting total_fees = COALESCE(expected_fee_amount, 0) on
-- every new student INSERT, bypassing the manual invoice system. This inflated "Fees
-- Expected" on the dashboard for ALL schools, showing fees for students who had no
-- manually activated invoice for the term.
--
-- CORRECT BEHAVIOUR: total_fees in student_balances should only ever be > 0 when a
-- student_invoice has been manually activated (status: 'issued', 'partial', or 'paid').
-- The trigger creates a placeholder row with 0 fees; the actual total_fees is set by
-- the sync_balance_on_invoice_activation trigger when an admin activates an invoice.
--
-- STATUS VALUES in student_invoices: 'issued' | 'partial' | 'paid'  (NOT 'active')

-- ─────────────────────────────────────────────────────────────────────────────────────
-- Step 1: Fix the trigger — always insert 0 for total_fees
-- ─────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_create_balance_for_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_current_term_id UUID;
    v_year INTEGER;
    v_term INTEGER;
BEGIN
    SELECT st.id, st.year, st.term
      INTO v_current_term_id, v_year, v_term
      FROM public.school_terms st
     WHERE st.school_id = NEW.school_id
       AND (st.end_date IS NULL OR st.end_date >= CURRENT_DATE)
     ORDER BY st.year DESC, st.term DESC
     LIMIT 1;

    IF v_current_term_id IS NULL THEN
        SELECT st.id, st.year, st.term
          INTO v_current_term_id, v_year, v_term
          FROM public.school_terms st
         WHERE st.school_id = NEW.school_id
         ORDER BY st.year DESC, st.term DESC
         LIMIT 1;
    END IF;

    IF v_current_term_id IS NOT NULL AND NEW.status = 'active' THEN
        INSERT INTO public.student_balances (
            student_id, school_id, term_id, year, term, total_fees, total_paid
        )
        VALUES (
            NEW.student_id, NEW.school_id, v_current_term_id, v_year, v_term,
            0,  -- always 0; only sync_balance_on_invoice_activation sets total_fees > 0
            0
        )
        ON CONFLICT (student_id, term_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────────────
-- Step 2: Zero out phantom total_fees for the CURRENT TERM only
-- (current term as of 2026-05-21: id = 989b2acf-634b-4d4b-a32e-b848ffc76672)
-- Only invoiced students (status: issued/partial/paid) should have total_fees > 0.
-- ─────────────────────────────────────────────────────────────────────────────────────
UPDATE public.student_balances sb
   SET total_fees = 0
 WHERE sb.total_fees > 0
   AND sb.term_id = '989b2acf-634b-4d4b-a32e-b848ffc76672'
   AND NOT EXISTS (
       SELECT 1
         FROM public.student_invoices si
        WHERE si.student_id = sb.student_id
          AND si.term_id    = sb.term_id
          AND si.status IN ('issued', 'partial', 'paid')
   );

-- ─────────────────────────────────────────────────────────────────────────────────────
-- Step 3: Restore total_fees from actual invoices for all terms
-- (handles any balance rows that should reflect a real activated invoice)
-- ─────────────────────────────────────────────────────────────────────────────────────
UPDATE public.student_balances sb
   SET total_fees = (
       SELECT COALESCE(SUM(si.total_amount), 0)
         FROM public.student_invoices si
        WHERE si.student_id = sb.student_id
          AND si.term_id    = sb.term_id
          AND si.status IN ('issued', 'partial', 'paid')
   )
 WHERE EXISTS (
     SELECT 1
       FROM public.student_invoices si
      WHERE si.student_id = sb.student_id
        AND si.term_id    = sb.term_id
        AND si.status IN ('issued', 'partial', 'paid')
 );

-- ─────────────────────────────────────────────────────────────────────────────────────
-- Step 4: Restore HISTORICAL term balances for students who have payments but no
-- formal invoice (they were using the old auto-trigger system). Use expected_fee_amount
-- as the fee for those prior terms. Do NOT touch the current term (Step 2 already
-- cleared it, and only invoice activations should set fees there going forward).
-- ─────────────────────────────────────────────────────────────────────────────────────
UPDATE public.student_balances sb
   SET total_fees = stu.expected_fee_amount,
       balance    = GREATEST(0, stu.expected_fee_amount - sb.total_paid),
       updated_at = now()
FROM public.students stu
WHERE stu.student_id    = sb.student_id
  AND sb.total_paid     > 0
  AND sb.total_fees     = 0
  AND sb.term_id       <> '989b2acf-634b-4d4b-a32e-b848ffc76672'
  AND NOT EXISTS (
      SELECT 1
        FROM public.student_invoices si
       WHERE si.student_id = sb.student_id
         AND si.term_id    = sb.term_id
         AND si.status IN ('issued', 'partial', 'paid')
  )
  AND stu.expected_fee_amount > 0;

-- ─────────────────────────────────────────────────────────────────────────────────────
-- Step 5: Recalculate balance column for all rows where it's stale
-- ─────────────────────────────────────────────────────────────────────────────────────
UPDATE public.student_balances
   SET balance    = GREATEST(0, total_fees - total_paid),
       updated_at = now()
 WHERE balance <> GREATEST(0, total_fees - total_paid)
   AND total_fees > 0;
