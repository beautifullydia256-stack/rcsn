-- ============================================================================
-- FIX: Re-allocate Jane Smith's 400,000 payment from Term 1 2026 to Term 3 2025
-- School: Rakai Infant Primary School (406bf29b-d7fd-457c-aa56-e29b9ef1a16d)
-- Correct behaviour: 400k should apply to older term (T3 2025), leaving 100k there
-- and 80k still due for T1 2026. Total owed = 180,000. No overpayment.
-- ============================================================================

-- Step 1: Move the mis-allocated payment from Term 1 2026 to Term 3 2025
-- (Jane Smith student_id: e99fd676-7d72-45f9-9dbf-df30c35c874d)
UPDATE public.student_payments
SET term_id = (
  SELECT id FROM public.school_terms
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND year = 2025 AND term = 3
  LIMIT 1
)
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND student_id = 'e99fd676-7d72-45f9-9dbf-df30c35c874d'
  AND term_id = (
    SELECT id FROM public.school_terms
    WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
      AND year = 2026 AND term = 1
    LIMIT 1
  )
  AND reversed_at IS NULL
  AND amount_paid = 400000;

-- Step 2: Recompute student_balances for this school from actual payments
-- (total_paid = sum of payments per term; balance = total_fees - total_paid)
UPDATE public.student_balances sb
SET
  total_paid = COALESCE((
    SELECT SUM(sp.amount_paid)
    FROM public.student_payments sp
    WHERE sp.student_id = sb.student_id
      AND sp.term_id = sb.term_id
      AND sp.reversed_at IS NULL
  ), 0),
  balance = sb.total_fees - COALESCE((
    SELECT SUM(sp.amount_paid)
    FROM public.student_payments sp
    WHERE sp.student_id = sb.student_id
      AND sp.term_id = sb.term_id
      AND sp.reversed_at IS NULL
  ), 0),
  updated_at = NOW()
WHERE sb.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
