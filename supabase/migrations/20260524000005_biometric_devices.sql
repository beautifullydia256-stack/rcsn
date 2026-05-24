-- Multi-device biometric attendance support
-- Supports Hikvision, ZKTeco, eSSL, Suprema, RFID, QR, and future devices

-- ── 1. Device registry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid        NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  device_name    text        NOT NULL,
  device_type    text        NOT NULL CHECK (device_type IN ('hikvision','zkteco','essl','suprema','rfid','qr')),
  ip_address     text,
  port           integer     DEFAULT 4370,
  serial_number  text,
  location       text,
  -- Each device gets its own webhook token for the push endpoint
  webhook_token  text        NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active      boolean     NOT NULL DEFAULT true,
  last_sync_at   timestamptz,
  sync_status    text,       -- 'ok' | 'error' | 'never'
  sync_message   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biometric_devices_school ON public.biometric_devices (school_id);

ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_devices_school ON public.biometric_devices
  FOR ALL TO authenticated
  USING  (private.user_can_manage_school(biometric_devices.school_id))
  WITH CHECK (private.user_can_manage_school(biometric_devices.school_id));

GRANT ALL ON public.biometric_devices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_devices TO authenticated;

-- ── 2. Link biometric_device_users to a specific device (optional) ──────────
ALTER TABLE public.biometric_device_users
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.biometric_devices(id) ON DELETE SET NULL;

-- ── 3. Migrate existing school-level biometric settings ─────────────────────
-- Remove the now-redundant school-level webhook token (each device has its own)
-- Keep the feature toggles and late cutoffs on schools table (school-wide policy)
-- biometric_webhook_token on schools is deprecated but left in place for rollback
