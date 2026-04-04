-- One diagnostic run: replace UUIDs in `params`. Paste into Supabase SQL editor.

WITH params AS (
  SELECT
    'dd6f4aa8-406f-4fb0-b6d5-1dcdd0ccb06d'::uuid AS student_id,
    '2b2db83c-08d8-475d-a9cd-886665316318'::uuid AS school_id
),
term_facts AS (
  SELECT
    'term'::text AS kind,
    (st.year::text || ' Term ' || st.term::text) AS item,
    jsonb_build_object(
      'term_id', sb.term_id,
      'total_fees', sb.total_fees,
      'total_paid', sb.total_paid,
      'balance_column_stored', sb.balance,
      'fees_minus_paid', COALESCE(sb.total_fees, 0) - COALESCE(sb.total_paid, 0),
      'sum_non_reversed_term_payments', public.total_term_payments_amount_paid(sb.student_id, sb.term_id),
      'balance_matches_fees_minus_paid',
        sb.balance IS NOT DISTINCT FROM (COALESCE(sb.total_fees, 0) - COALESCE(sb.total_paid, 0))
    ) AS facts,
    CASE
      WHEN sb.balance IS DISTINCT FROM (COALESCE(sb.total_fees, 0) - COALESCE(sb.total_paid, 0))
      THEN 'Stale `balance` column: UI/dashes that trust `balance` lie; fees−paid is truth.'
      ELSE 'Stored `balance` matches fees−paid.'
    END AS narrative
  FROM public.student_balances sb
  INNER JOIN public.school_terms st ON st.id = sb.term_id
  CROSS JOIN params p
  WHERE sb.student_id = p.student_id AND sb.school_id = p.school_id AND sb.term_id IS NOT NULL
),
prior_facts AS (
  SELECT
    'prior'::text AS kind,
    COALESCE(NULLIF(trim(ps.source_note), ''), 'prior') AS item,
    jsonb_build_object(
      'prior_entry_id', ps.id,
      'amount_outstanding', ps.amount_outstanding
    ) AS facts,
    'Legacy bucket: only prior-linked payments (term_id null) reduce this.' AS narrative
  FROM public.prior_system_balance_entries ps
  CROSS JOIN params p
  WHERE ps.student_id = p.student_id AND ps.school_id = p.school_id
),
pay_facts AS (
  SELECT
    'payment'::text AS kind,
    COALESCE(sp.receipt_number, sp.payment_id::text) AS item,
    jsonb_build_object(
      'payment_id', sp.payment_id,
      'amount_paid', sp.amount_paid,
      'term_id', sp.term_id,
      'prior_system_entry_id', sp.prior_system_entry_id,
      'payment_date', sp.payment_date
    ) AS facts,
    CASE
      WHEN sp.term_id IS NULL AND sp.prior_system_entry_id IS NOT NULL THEN 'Counts toward prior, not term total_paid.'
      WHEN sp.term_id IS NOT NULL THEN 'Counts in total_term_payments_amount_paid for that term.'
      ELSE 'Check term vs prior XOR on this row.'
    END AS narrative
  FROM public.student_payments sp
  CROSS JOIN params p
  WHERE sp.student_id = p.student_id AND sp.school_id = p.school_id AND sp.reversed_at IS NULL
)
SELECT * FROM term_facts
UNION ALL
SELECT * FROM prior_facts
UNION ALL
SELECT * FROM pay_facts
ORDER BY kind, item;
