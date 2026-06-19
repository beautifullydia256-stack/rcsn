-- notification_logs is missing retry_count which the insert trigger references.
-- Adding it with DEFAULT 0 so new inserts don't hit the trigger error.

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
