-- Admins currently see only a raw phone number when a broadcast SMS fails, with no way to
-- tell which parent/teacher/student it belongs to. Capture the recipient's identity at
-- insert time so a delivery-history view can show a name, not just a number.

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_role text;

CREATE INDEX IF NOT EXISTS idx_notification_logs_school_created
  ON public.notification_logs (school_id, created_at DESC);
