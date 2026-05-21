-- Add bursary_discount column to student_invoices.
-- Stores the percentage discount applied at invoice activation time (0-100).
-- 100 = full bursary (student studies for free, invoice amount = 0).
-- 0 = no discount (default, preserves existing behaviour).

ALTER TABLE public.student_invoices
  ADD COLUMN IF NOT EXISTS bursary_discount numeric DEFAULT 0
    CONSTRAINT student_invoices_bursary_discount_range
      CHECK (bursary_discount >= 0 AND bursary_discount <= 100);
