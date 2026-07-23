-- Phone-based password reset: short-lived, single-use numeric codes delivered via SMS.
-- Supabase's own password-recovery flow is email-only (internal to Auth, no server-side
-- code this app controls), so phone-based reset needs its own code generation/verification.
-- Written and verified exclusively by service-role backend endpoints (api/auth/_request-
-- phone-reset.js, api/auth/_verify-phone-reset.js) — RLS enabled with no policies so the
-- anon/authenticated keys can never read or write these rows directly.

CREATE TABLE IF NOT EXISTS public.phone_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_reset_codes_phone_idx ON public.phone_reset_codes (phone, created_at DESC);

ALTER TABLE public.phone_reset_codes ENABLE ROW LEVEL SECURITY;
