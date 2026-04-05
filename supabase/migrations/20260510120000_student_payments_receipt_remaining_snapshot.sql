-- Snapshot fields for faithful fee receipt reprints (same data as first print).
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS receipt_total_remaining_balance NUMERIC(12,2);

COMMENT ON COLUMN public.student_payments.receipt_total_remaining_balance IS
  'Total unpaid balance across the student''s term invoices immediately after this receipt was posted (identical on all rows sharing the same receipt_number). NULL for legacy rows before this column existed.';
