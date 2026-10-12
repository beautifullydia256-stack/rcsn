-- ============================================================================
-- Migration: 20261013000000_fix_school_chat_rpc_security_definer.sql
-- Description:
--   1. Grant USAGE and EXECUTE on schema private to authenticated and service_role
--      (resolves "permission denied for schema private" when running school chat RPCs)
--   2. Make school chat public RPC functions SECURITY DEFINER so all authenticated
--      institutional users (students, teachers, staff, admins) can discover each
--      other and message without RLS boundary conflicts on user profiles.
--   3. Add fallback to institutional school ID when school_id is NULL.
-- ============================================================================

-- 1. Schema private permissions
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 2. school_chat_pair_allowed (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_pair_allowed(p_viewer uuid, p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_school_viewer uuid;
  v_school_target uuid;
  v_av boolean;
  v_at boolean;
  c_default_school CONSTANT uuid := 'e1b10000-0000-4000-a000-000000000001'::uuid;
BEGIN
  IF p_viewer IS NULL OR p_target IS NULL OR p_viewer = p_target THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(u.school_id, c_default_school), COALESCE(u.is_active, true)
  INTO v_school_viewer, v_av
  FROM public.users u
  WHERE u.user_id = p_viewer;

  IF v_school_viewer IS NULL THEN
    v_school_viewer := c_default_school;
  END IF;

  SELECT COALESCE(u.school_id, c_default_school), COALESCE(u.is_active, true)
  INTO v_school_target, v_at
  FROM public.users u
  WHERE u.user_id = p_target;

  IF v_school_target IS NULL THEN
    v_school_target := c_default_school;
  END IF;

  IF v_school_viewer <> v_school_target THEN
    RETURN FALSE;
  END IF;

  IF v_av = false OR v_at = false THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- 3. school_chat_list_eligible_users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE(user_id uuid, name text, role text, email text, last_seen_at timestamp with time zone, session_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_school uuid;
  c_default_school CONSTANT uuid := 'e1b10000-0000-4000-a000-000000000001'::uuid;
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(users.school_id, c_default_school)
  INTO v_school
  FROM public.users
  WHERE users.user_id = v_me
  LIMIT 1;

  IF v_school IS NULL THEN
    v_school := c_default_school;
  END IF;

  RETURN QUERY
  SELECT
    u.user_id,
    u.name,
    u.role,
    u.email,
    COALESCE(p.last_seen_at, u.last_sign_in_at),
    CASE WHEN p.user_id IS NULL THEN false ELSE COALESCE(p.session_active, false) END
  FROM public.users u
  LEFT JOIN public.school_chat_presence p ON p.user_id = u.user_id
  WHERE u.user_id <> v_me
    AND COALESCE(u.is_active, true) = true
    AND (COALESCE(u.school_id, c_default_school) = v_school)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
END;
$$;

-- 4. school_chat_get_or_create_dm (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_get_or_create_dm(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN private.school_chat_get_or_create_dm(p_other_user_id);
END;
$$;

-- 5. school_chat_my_conversations (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_my_conversations()
RETURNS TABLE(
  conversation_id uuid,
  peer_user_id uuid,
  peer_name text,
  peer_role text,
  last_body text,
  last_at timestamp with time zone,
  unread_count bigint,
  peer_last_seen_at timestamp with time zone,
  peer_session_active boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
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

-- 6. school_chat_mark_peer_messages_delivered (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_mark_peer_messages_delivered(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN RETURN; END IF;
  IF NOT private.school_chat_user_is_participant(p_conversation_id, v_me) THEN RETURN; END IF;
  UPDATE public.school_chat_messages m
  SET delivered_at = now()
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id IS DISTINCT FROM v_me
    AND m.delivered_at IS NULL;
END;
$$;

-- 7. school_chat_finalize_voice (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_finalize_voice(p_message_id uuid, p_relative_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM private.school_chat_finalize_voice(p_message_id, p_relative_path);
END;
$$;

-- 8. school_chat_ping_presence (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_school_id uuid;
  c_default_school CONSTANT uuid := 'e1b10000-0000-4000-a000-000000000001'::uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(school_id, c_default_school) INTO v_school_id FROM public.users WHERE user_id = v_user_id LIMIT 1;
  IF v_school_id IS NULL THEN v_school_id := c_default_school; END IF;
  INSERT INTO public.school_chat_presence (user_id, school_id, last_seen_at, session_active)
  VALUES (v_user_id, v_school_id, now(), true)
  ON CONFLICT (user_id) DO UPDATE
  SET
    school_id = EXCLUDED.school_id,
    last_seen_at = now(),
    session_active = true;
END;
$$;

-- 9. school_chat_presence_go_offline (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.school_chat_presence_go_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  UPDATE public.school_chat_presence
  SET
    session_active = false,
    last_seen_at = now()
  WHERE user_id = v_user_id;
END;
$$;

-- 10. Grant EXECUTE permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.school_chat_pair_allowed(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_list_eligible_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_get_or_create_dm(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_my_conversations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_mark_peer_messages_delivered(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_finalize_voice(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_ping_presence() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_chat_presence_go_offline() TO authenticated, service_role;
