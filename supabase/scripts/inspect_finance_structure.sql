-- ============================================================================
-- PWEZACORE: Inspect current finance structure (read-only)
-- Run this in Supabase SQL Editor to see tables, columns, constraints, triggers.
-- No data is modified.
-- ============================================================================

-- 1. Finance-related tables and columns
SELECT
  t.table_schema,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema AND c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'student_payments',
    'student_invoices',
    'student_balances',
    'student_discounts',
    'school_fee_structure',
    'school_expenses',
    'receipt_sequences',
    'invoice_sequences',
    'classes',
    'school_terms',
    'audit_log',
    'period_locks'
  )
ORDER BY t.table_name, c.ordinal_position;

-- 2. Primary keys and unique constraints
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS ref_table,
  ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'student_payments',
    'student_invoices',
    'student_balances',
    'student_discounts',
    'school_fee_structure',
    'receipt_sequences',
    'invoice_sequences',
    'classes'
  )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 3. Indexes on finance tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'student_payments',
    'student_invoices',
    'student_balances',
    'school_fee_structure',
    'school_expenses',
    'receipt_sequences',
    'invoice_sequences'
  )
ORDER BY tablename, indexname;

-- 4. Triggers on finance tables
SELECT
  tg.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name
FROM pg_trigger tg
JOIN pg_class c ON tg.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON tg.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'student_payments',
    'student_invoices',
    'student_balances'
  )
  AND NOT tg.tgisinternal
ORDER BY c.relname, tg.tgname;

-- 5. Row counts (safe, no locks)
SELECT 'student_payments' AS table_name, COUNT(*) AS row_count FROM public.student_payments
UNION ALL
SELECT 'student_invoices', COUNT(*) FROM public.student_invoices
UNION ALL
SELECT 'student_balances', COUNT(*) FROM public.student_balances
UNION ALL
SELECT 'student_discounts', COUNT(*) FROM public.student_discounts
UNION ALL
SELECT 'school_fee_structure', COUNT(*) FROM public.school_fee_structure
UNION ALL
SELECT 'school_expenses', COUNT(*) FROM public.school_expenses
UNION ALL
SELECT 'receipt_sequences', COUNT(*) FROM public.receipt_sequences
UNION ALL
SELECT 'invoice_sequences', COUNT(*) FROM public.invoice_sequences;

-- 6. Sample: one invoice and its payments (if any)
SELECT
  si.invoice_id,
  si.invoice_number,
  si.student_id,
  si.term_id,
  si.total_amount,
  si.amount_paid,
  si.balance,
  si.status,
  si.created_at
FROM public.student_invoices si
ORDER BY si.created_at DESC
LIMIT 5;

-- 7. Sample: recent payments with invoice link
SELECT
  sp.payment_id,
  sp.invoice_id,
  sp.student_id,
  sp.term_id,
  sp.amount_paid,
  sp.payment_method,
  sp.receipt_number,
  sp.payment_date,
  sp.reversed_at
FROM public.student_payments sp
ORDER BY sp.created_at DESC
LIMIT 5;

-- 8. Check: student_balances vs invoice totals (consistency)
SELECT
  sb.student_id,
  sb.term_id,
  sb.total_fees AS balance_total_fees,
  sb.total_paid AS balance_total_paid,
  sb.balance AS balance_balance,
  si.total_amount AS invoice_total,
  si.amount_paid AS invoice_paid,
  si.balance AS invoice_balance
FROM public.student_balances sb
LEFT JOIN public.student_invoices si
  ON si.student_id = sb.student_id AND si.term_id = sb.term_id AND si.status IN ('issued','partial','paid')
ORDER BY sb.student_id, sb.term_id
LIMIT 10;
