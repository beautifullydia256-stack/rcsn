-- Biometric attendance: arrival/departure tracking + parent WhatsApp notifications

-- ── 1. Per-device scan type (arrival | departure | both) ────────────────────
ALTER TABLE public.biometric_devices
  ADD COLUMN IF NOT EXISTS scan_type text NOT NULL DEFAULT 'arrival'
    CHECK (scan_type IN ('arrival', 'departure', 'both'));

-- ── 2. School-level notification toggles ────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS biometric_notify_arrival   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_notify_departure boolean NOT NULL DEFAULT false;

-- ── 3. Arrival/departure timestamps on student_attendance ───────────────────
ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS arrival_time   timestamptz,
  ADD COLUMN IF NOT EXISTS departure_time timestamptz;
