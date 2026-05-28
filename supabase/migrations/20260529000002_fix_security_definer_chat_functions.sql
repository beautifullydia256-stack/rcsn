-- Fix Supabase security advisor findings: SECURITY DEFINER functions with
-- mutable search_path (SET search_path = public).
--
-- The linter flags these because a mutable search_path allows untrusted users
-- to inject objects into the search path and hijack function calls.
-- Fix: set search_path = '' (empty) — all table refs are already fully
-- qualified (public.*) so behaviour is identical.
--
-- Both functions remain SECURITY DEFINER because they need to write to tables
-- (presence upsert) or read across participant rows in ways that RLS would
-- block for SECURITY INVOKER. The auth.uid() guards already scope every
-- operation to the caller's own data.

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_user_id   uuid := auth.uid();
  v_school_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.school_chat_ping_presence() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.school_chat_ping_presence() TO authenticated;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.school_chat_user_is_participant(
  p_conversation_id uuid,
  p_user_id         uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.school_chat_participants
      WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.school_chat_participants
      WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) TO authenticated;
