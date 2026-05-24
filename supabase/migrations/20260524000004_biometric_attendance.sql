-- Biometric (fingerprint) attendance infrastructure
-- Supports Hikvision DS-K1A802F and compatible devices

-- ── 1. Mapping table: device user ID → internal person ─────────────────────
CREATE TABLE IF NOT EXISTS public.biometric_device_users (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid        NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  device_user_id text        NOT NULL,          -- ID stored on the Hikvision device, e.g. "104"
  person_type    text        NOT NULL CHECK (person_type IN ('student', 'teacher', 'other_staff')),
  person_id      uuid        NOT NULL,          -- student_id or teacher_id
  device_name    text,                          -- optional label, e.g. "Main Gate Terminal"
  active         boolean     NOT NULL DEFAULT true,
  enrolled_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS biometric_device_users_lookup
  ON public.biometric_device_users (school_id, device_user_id);

ALTER TABLE public.biometric_device_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_device_users_school ON public.biometric_device_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = biometric_device_users.school_id
        AND profiles.role IN ('admin', 'owner', 'secretary')
    )
  );

GRANT ALL ON public.biometric_device_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_device_users TO authenticated;

-- ── 2. School-level biometric settings ─────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS biometric_teacher_punch      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_student_attendance boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS biometric_late_cutoff_teacher time    NOT NULL DEFAULT '07:30:00',
  ADD COLUMN IF NOT EXISTS biometric_late_cutoff_student time    NOT NULL DEFAULT '08:00:00',
  -- Random 32-char hex token auto-generated per school; used to authenticate device push
  ADD COLUMN IF NOT EXISTS biometric_webhook_token      text    DEFAULT encode(gen_random_bytes(16), 'hex');

-- ── 3. Track whether a scan came from biometric device ─────────────────────
ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS biometric_scan boolean NOT NULL DEFAULT false;

ALTER TABLE public.teacher_attendance_logs
  ADD COLUMN IF NOT EXISTS biometric_scan boolean NOT NULL DEFAULT false;
