-- Allow Sure Pay as a fee payment channel (integration to be wired later).

ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_payment_method_check;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN (
      'cash',
      'bank',
      'mobile_money',
      'cheque',
      'pos',
      'online',
      'other',
      'school_pay',
      'sure_pay'
    )
  );