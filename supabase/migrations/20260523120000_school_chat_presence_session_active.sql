-- Distinguish "in an active session" vs logged out: green "online" only while session_active and a fresh heartbeat.
-- Logout calls school_chat_presence_go_offline() so peers stop seeing "online" immediately.

ALTER TABLE public.school_chat_presence
  ADD COLUMN IF NOT EXISTS session_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.school_chat_presence.session_active IS
  'Set false on logout. Heartbeats (ping) set true + refresh last_seen_at.';

CREATE OR REPLACE FUNCTION public.school_chat_presence_go_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.school_chat_presence
  SET
    session_active = false,
    last_seen_at = now()
  WHERE user_id = (SELECT auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.school_chat_presence_go_offline() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_chat_presence_go_offline() TO authenticated;

COMMENT ON FUNCTION public.school_chat_presence_go_offline() IS
  'Call before auth.signOut so peers no longer see the user as online.';

DROP FUNCTION IF EXISTS public.school_chat_list_eligible_users();
DROP FUNCTION IF EXISTS public.school_chat_my_conversations();

CREATE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE (
  user_id uuid,
  name text,
  role text,
  email text,
  last_seen_at timestamptz,
  session_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.user_id,
    u.name,
    u.role,
    u.email,
    COALESCE(p.last_seen_at, u.last_sign_in_at),
    CASE
      WHEN p.user_id IS NULL THEN false
      ELSE COALESCE(p.session_active, false)
    END
  FROM public.users u
  LEFT JOIN public.school_chat_presence p ON p.user_id = u.user_id
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.school_id = (SELECT u2.school_id FROM public.users u2 WHERE u2.user_id = (SELECT auth.uid()) LIMIT 1)
    AND u.user_id <> (SELECT auth.uid())
    AND public.school_chat_pair_allowed((SELECT auth.uid()), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$$;

CREATE FUNCTION public.school_chat_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  peer_user_id uuid,
  peer_name text,
  peer_role text,
  last_body text,
  last_at timestamptz,
  unread_count bigint,
  peer_last_seen_at timestamptz,
  peer_session_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    ou.user_id,
    ou.name,
    ou.role,
    (SELECT m.body FROM public.school_chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.created_at FROM public.school_chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.school_chat_messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > COALESCE(p.last_read_at, '-infinity'::timestamptz)
        AND m.sender_id <> (SELECT auth.uid())
    ), 0),
    COALESCE(pr.last_seen_at, ou.last_sign_in_at),
    CASE
      WHEN pr.user_id IS NULL THEN false
      ELSE COALESCE(pr.session_active, false)
    END
  FROM public.school_chat_conversations c
  INNER JOIN public.school_chat_participants p
    ON p.conversation_id = c.id AND p.user_id = (SELECT auth.uid())
  INNER JOIN public.school_chat_participants p2
    ON p2.conversation_id = c.id AND p2.user_id <> (SELECT auth.uid())
  INNER JOIN public.users ou ON ou.user_id = p2.user_id
  LEFT JOIN public.school_chat_presence pr ON pr.user_id = ou.user_id
  ORDER BY c.updated_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.school_chat_list_eligible_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_my_conversations() TO authenticated;

NOTIFY pgrst, 'reload schema';
