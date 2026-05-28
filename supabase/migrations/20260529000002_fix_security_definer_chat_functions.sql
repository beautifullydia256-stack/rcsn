-- Fix Supabase security advisor warning:
-- "authenticated_security_definer_function_executable"
--
-- Both functions are switched from SECURITY DEFINER to SECURITY INVOKER so
-- they run under the caller's privileges (RLS applies). This is safe because:
--
-- school_chat_ping_presence():
--   - Reads public.users WHERE user_id = auth.uid()  → covered by users SELECT policy
--   - Upserts public.school_chat_presence             → INSERT/UPDATE RLS already
--     checks user_id = auth.uid() and school_id = caller's school
--
-- school_chat_user_is_participant():
--   - Reads school_chat_participants SELECT policy grants access to all rows in
--     conversations the caller participates in (via private.school_chat_user_is_participant),
--     so both EXISTS checks work correctly for callers who are participants.
--     Non-participants correctly get false for both checks.

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
SECURITY INVOKER
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
