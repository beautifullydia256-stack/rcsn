-- Allow per-student discount/bursary as a percentage (0–100).
-- expected_fee_amount can store the discounted amount; this column records the percentage for display/audit.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS fee_discount_percent NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.students.fee_discount_percent IS 'Percentage discount/bursary applied (0–100). Fee payable = base class fee * (1 - fee_discount_percent/100).';
