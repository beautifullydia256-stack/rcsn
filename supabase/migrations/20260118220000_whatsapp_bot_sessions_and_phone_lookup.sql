-- WhatsApp bot conversation state (server-side only; use service role from Next.js webhook).
-- Phone lookup helpers for matching inbound Wasender numbers to parents/teachers/users.

CREATE TABLE IF NOT EXISTS public.whatsapp_bot_sessions (
  wa_e164 text PRIMARY KEY,
  step text NOT NULL DEFAULT 'entry',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_bot_sessions_updated_at_idx ON public.whatsapp_bot_sessions (updated_at DESC);

COMMENT ON TABLE public.whatsapp_bot_sessions IS 'PwezaCore WhatsApp bot state; no business writes except this metadata.';

ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pweza_phone_last9(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
    THEN right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.find_parents_by_phone_last9(p_last9 text)
RETURNS TABLE (
  parent_id uuid,
  school_id uuid,
  student_id uuid,
  phone text,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.parent_id, p.school_id, p.student_id, p.phone, p.name
  FROM public.parents p
  WHERE p.phone IS NOT NULL
    AND public.pweza_phone_last9(p.phone) = p_last9;
$$;

CREATE OR REPLACE FUNCTION public.find_teachers_by_phone_last9(p_last9 text)
RETURNS TABLE (
  teacher_id uuid,
  school_id uuid,
  phone text,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.teacher_id, t.school_id, t.phone, t.name
  FROM public.teachers t
  WHERE t.phone IS NOT NULL
    AND public.pweza_phone_last9(t.phone) = p_last9;
$$;

CREATE OR REPLACE FUNCTION public.find_staff_users_by_phone_last9(p_last9 text)
RETURNS TABLE (
  user_id uuid,
  school_id uuid,
  role text,
  phone text,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id, u.school_id, u.role, u.phone, u.name
  FROM public.users u
  WHERE u.phone IS NOT NULL
    AND public.pweza_phone_last9(u.phone) = p_last9
    AND u.role IN ('admin', 'accountant', 'teacher', 'head_teacher', 'owner', 'librarian');
$$;

GRANT EXECUTE ON FUNCTION public.pweza_phone_last9(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_parents_by_phone_last9(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_teachers_by_phone_last9(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_staff_users_by_phone_last9(text) TO service_role;
