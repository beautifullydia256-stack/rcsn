-- Fix school_chat_ping_presence: wrong column name + unsafe exception + anon access
-- Applied live on 2026-05-21.
--
-- Bugs fixed:
--   1. Function queried `WHERE id = v_user_id` but public.users PK is `user_id`, not `id`.
--      Every call threw "column 'id' does not exist" → 400 for all users.
--   2. RAISE EXCEPTION 'Not authenticated' was triggered when called without auth
--      (anon role, pre-auth race). Changed to silent RETURN so unauthenticated
--      calls are no-ops instead of 400s.
--   3. Revoked EXECUTE from anon role (Supabase security linter finding).

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id  uuid := auth.uid();
  v_school_id uuid;
BEGIN
  -- Silent no-op for unauthenticated callers (anon role, pre-auth race condition).
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- users.user_id is the PK that maps to auth.uid(). Was incorrectly `id`.
  SELECT school_id INTO v_school_id
  FROM public.users
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.school_chat_presence (user_id, school_id, last_seen_at, session_active)
  VALUES (v_user_id, v_school_id, now(), true)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id      = EXCLUDED.school_id,
        last_seen_at   = EXCLUDED.last_seen_at,
        session_active = true;
END;
$func$;

-- Security: only authenticated users should ping presence.
-- Must revoke from PUBLIC (not just anon) because anon inherits from PUBLIC.
-- Re-grant explicitly to authenticated so signed-in users still work.
REVOKE EXECUTE ON FUNCTION public.school_chat_ping_presence() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.school_chat_ping_presence() TO authenticated;
