-- Oldest-term-first is enforced in the app (RecordPaymentModal allocates to oldest balance rows first).
-- The BEFORE INSERT trigger blocked valid cases: e.g. after a partial payment the oldest term still
-- has balance > 0, so a second INSERT for a younger term would raise. Multi-row receipts must be allowed.
DROP TRIGGER IF EXISTS trigger_enforce_payment_oldest_term_first ON public.student_payments;
DROP FUNCTION IF EXISTS public.enforce_payment_oldest_term_first();
