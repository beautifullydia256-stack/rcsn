-- Admin-initiated teacher phone number changes must be verified by SMS code before the new
-- number is accepted — the new number receives the code, never the old one.

CREATE TABLE IF NOT EXISTS public.teacher_phone_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.users(user_id),
  old_phone text,
  new_phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_phone_change_requests_new_phone_idx
  ON public.teacher_phone_change_requests (new_phone, created_at DESC);

CREATE INDEX IF NOT EXISTS teacher_phone_change_requests_teacher_idx
  ON public.teacher_phone_change_requests (teacher_id, created_at DESC);

ALTER TABLE public.teacher_phone_change_requests ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same pattern as phone_reset_codes. Intentional.
