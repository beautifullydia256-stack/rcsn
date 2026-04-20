-- SchoolPay per-school integration: settings, idempotency audit, student payment code, payment_method.

-- ---------------------------------------------------------------------------
-- 1) schoolpay_school_settings (secrets only via service role; RLS enabled, no policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schoolpay_school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  schoolpay_school_code text NOT NULL DEFAULT '',
  api_password_encrypted text NOT NULL DEFAULT '',
  webhook_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schoolpay_school_settings_school_id_key UNIQUE (school_id),
  CONSTRAINT schoolpay_school_settings_webhook_token_key UNIQUE (webhook_token)
);

COMMENT ON TABLE public.schoolpay_school_settings IS
  'Per-school SchoolPay Sync API credentials (encrypted password) and webhook URL token. Access only with service_role.';

CREATE INDEX IF NOT EXISTS idx_schoolpay_settings_enabled
  ON public.schoolpay_school_settings (school_id) WHERE enabled = true;

ALTER TABLE public.schoolpay_school_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) schoolpay_ingested_events (idempotency by receipt number)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schoolpay_ingested_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  schoolpay_receipt_number text NOT NULL,
  source_channel_transaction_id text,
  payload_hash text,
  student_payment_id uuid REFERENCES public.student_payments (payment_id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schoolpay_ingested_events_school_receipt_key UNIQUE (school_id, schoolpay_receipt_number)
);

COMMENT ON TABLE public.schoolpay_ingested_events IS
  'One row per SchoolPay receipt ingested into student_payments; prevents duplicate webhook/sync posts.';

CREATE INDEX IF NOT EXISTS idx_schoolpay_ingested_school_created
  ON public.schoolpay_ingested_events (school_id, created_at DESC);

ALTER TABLE public.schoolpay_ingested_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schoolpay_school_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schoolpay_ingested_events TO service_role;

-- ---------------------------------------------------------------------------
-- 3) students.schoolpay_payment_code (optional explicit match to SchoolPay studentPaymentCode)
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS schoolpay_payment_code text;

COMMENT ON COLUMN public.students.schoolpay_payment_code IS
  'SchoolPay studentPaymentCode when it differs from admission_number; matched with trim/lower for lookup.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_schoolpay_code
  ON public.students (school_id, lower(trim(schoolpay_payment_code)))
  WHERE schoolpay_payment_code IS NOT NULL AND trim(schoolpay_payment_code) <> '';

-- ---------------------------------------------------------------------------
-- 4) payment_method: school_pay
-- ---------------------------------------------------------------------------
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
      'school_pay'
    )
  );

-- ---------------------------------------------------------------------------
-- 5) updated_at trigger for settings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_schoolpay_school_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schoolpay_school_settings_updated ON public.schoolpay_school_settings;
CREATE TRIGGER trg_schoolpay_school_settings_updated
  BEFORE UPDATE ON public.schoolpay_school_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schoolpay_school_settings_updated_at();
