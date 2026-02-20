-- ============================================================================
-- READ-ONLY: Full finance schema inspection + "collected > expected" diagnosis
-- Run in Supabase SQL Editor. Does NOT change any data.
-- School: Rakai Infant Primary School
-- school_id: 406bf29b-d7fd-457c-aa56-e29b9ef1a16d
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. SCHOOL: Rakai Infant Primary School
-- ---------------------------------------------------------------------------
SELECT '0. SCHOOL' AS section;
SELECT school_id, name, school_code
FROM public.schools
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';

-- ---------------------------------------------------------------------------
-- 1. TABLE STRUCTURE: All finance-related tables (columns only)
-- ---------------------------------------------------------------------------
SELECT '1. TABLE STRUCTURE' AS section;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'student_balances', 'student_payments', 'student_invoices',
    'school_terms', 'schools', 'classes', 'students',
    'school_expenses', 'invoice_sequences', 'receipt_sequences_per_term'
  )
ORDER BY table_name, ordinal_position;

-- ---------------------------------------------------------------------------
-- 2. TRIGGERS on student_payments and student_balances (what runs on insert/update)
-- ---------------------------------------------------------------------------
SELECT '2. TRIGGERS ON student_payments' AS section;
SELECT tgname AS trigger_name, pg_get_triggerdef(oid, true) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.student_payments'::regclass AND NOT tgisinternal;

SELECT '2b. update_student_balance function (what updates student_balances)' AS section;
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc WHERE proname = 'update_student_balance';

-- ---------------------------------------------------------------------------
-- 3. ROW COUNTS (per table, all schools) — to see data shape
-- ---------------------------------------------------------------------------
SELECT '3. ROW COUNTS' AS section;
SELECT 'student_balances' AS tbl, COUNT(*) AS cnt FROM public.student_balances
UNION ALL SELECT 'student_payments', COUNT(*) FROM public.student_payments
UNION ALL SELECT 'student_invoices', COUNT(*) FROM public.student_invoices
UNION ALL SELECT 'school_terms', COUNT(*) FROM public.school_terms;

-- ---------------------------------------------------------------------------
-- 4. DIAGNOSIS: Per-term summary (Rakai Infant Primary School)
-- If "total_paid" > "total_fees" for a term, that explains "collected > expected".
-- ---------------------------------------------------------------------------
SELECT '4. PER-TERM SUMMARY' AS section;
SELECT
  st.year,
  st.term,
  'Term ' || st.term || ', ' || st.year AS term_label,
  SUM(sb.total_fees)   AS total_expected,
  SUM(sb.total_paid)   AS total_collected,
  SUM(sb.balance)      AS total_balance,
  CASE WHEN SUM(sb.total_paid) > SUM(sb.total_fees) THEN 'YES - collected > expected' ELSE 'OK' END AS anomaly
FROM public.student_balances sb
JOIN public.school_terms st ON st.id = sb.term_id AND st.school_id = sb.school_id
WHERE sb.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
GROUP BY sb.school_id, st.id, st.year, st.term
ORDER BY st.year DESC, st.term DESC;

-- ---------------------------------------------------------------------------
-- 5. ROWS WHERE total_paid > total_fees
-- These are the exact student+term rows that make "collected" exceed "expected".
-- ---------------------------------------------------------------------------
SELECT '5. ROWS WHERE collected > expected' AS section;
SELECT
  sb.student_id,
  s.name AS student_name,
  st.year,
  st.term,
  sb.total_fees   AS expected,
  sb.total_paid   AS collected,
  sb.balance,
  (sb.total_paid - sb.total_fees) AS overpaid_amount
FROM public.student_balances sb
JOIN public.school_terms st ON st.id = sb.term_id AND st.school_id = sb.school_id
LEFT JOIN public.students s ON s.student_id = sb.student_id
WHERE sb.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND sb.total_paid > sb.total_fees
ORDER BY st.year DESC, st.term DESC, sb.total_paid - sb.total_fees DESC;

-- ---------------------------------------------------------------------------
-- 6. RECENT PAYMENTS BY TERM — to spot mis-allocated payments
-- ---------------------------------------------------------------------------
SELECT '6. RECENT PAYMENTS BY TERM' AS section;
SELECT
  sp.term_id,
  st.year,
  st.term,
  sp.student_id,
  s.name AS student_name,
  sp.amount_paid,
  sp.payment_date,
  sp.receipt_number
FROM public.student_payments sp
LEFT JOIN public.school_terms st ON st.id = sp.term_id AND st.school_id = sp.school_id
LEFT JOIN public.students s ON s.student_id = sp.student_id
WHERE sp.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND sp.reversed_at IS NULL
ORDER BY sp.payment_date DESC, sp.created_at DESC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- 7. ALL SCHOOLS (for reference)
-- ---------------------------------------------------------------------------
SELECT '7. ALL SCHOOLS' AS section;
SELECT school_id, name, school_code FROM public.schools ORDER BY name;
