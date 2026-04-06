-- Ensure school chat DM tables + RPCs exist (fixes PostgREST 404 / "not in schema cache" when prior migrations were never applied).
-- Safe to re-run: CREATE IF NOT EXISTS + CREATE OR REPLACE + idempotent policies.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.school_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  dm_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_chat_conversations_school_dm UNIQUE (school_id, dm_key)
);

CREATE INDEX IF NOT EXISTS idx_school_chat_conversations_school_updated
  ON public.school_chat_conversations (school_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.school_chat_participants (
  conversation_id uuid NOT NULL REFERENCES public.school_chat_conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_school_chat_participants_user
  ON public.school_chat_participants (user_id, school_id);

CREATE TABLE IF NOT EXISTS public.school_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.school_chat_conversations (id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_chat_messages_body_nonempty CHECK (char_length(trim(body)) > 0),
  CONSTRAINT school_chat_messages_body_max CHECK (char_length(body) <= 8000)
);

CREATE INDEX IF NOT EXISTS idx_school_chat_messages_conv_time
  ON public.school_chat_messages (conversation_id, created_at DESC);

-- Same-school, active users only (matches 20260328120000_school_chat_school_wide_pairs.sql).
CREATE OR REPLACE FUNCTION public.school_chat_pair_allowed(p_viewer uuid, p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_viewer uuid;
  v_school_target uuid;
  v_av boolean;
  v_at boolean;
BEGIN
  IF p_viewer IS NULL OR p_target IS NULL OR p_viewer = p_target THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_viewer, v_av
  FROM public.users u
  WHERE u.user_id = p_viewer;

  IF v_school_viewer IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_target, v_at
  FROM public.users u
  WHERE u.user_id = p_target;

  IF v_school_target IS NULL OR v_school_viewer <> v_school_target THEN
    RETURN FALSE;
  END IF;

  IF v_av = false OR v_at = false THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE (user_id uuid, name text, role text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id, u.name, u.role, u.email
  FROM public.users u
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.school_id = (SELECT u2.school_id FROM public.users u2 WHERE u2.user_id = (SELECT auth.uid()) LIMIT 1)
    AND u.user_id <> (SELECT auth.uid())
    AND public.school_chat_pair_allowed((SELECT auth.uid()), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$$;

-- Parameter name must stay p_other_user_id for PostgREST / JS client.
CREATE OR REPLACE FUNCTION public.school_chat_get_or_create_dm(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_school uuid;
  v_cid uuid;
  v_key text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.school_chat_pair_allowed(v_me, p_other_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT school_id INTO v_school FROM public.users WHERE user_id = v_me LIMIT 1;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'no school';
  END IF;

  v_key := CASE
    WHEN v_me::text < p_other_user_id::text THEN v_me::text || ':' || p_other_user_id::text
    ELSE p_other_user_id::text || ':' || v_me::text
  END;

  INSERT INTO public.school_chat_conversations (school_id, dm_key)
  VALUES (v_school, v_key)
  ON CONFLICT (school_id, dm_key) DO NOTHING;

  SELECT c.id INTO v_cid
  FROM public.school_chat_conversations c
  WHERE c.school_id = v_school AND c.dm_key = v_key
  LIMIT 1;

  INSERT INTO public.school_chat_participants (conversation_id, user_id, school_id)
  VALUES (v_cid, v_me, v_school), (v_cid, p_other_user_id, v_school)
  ON CONFLICT DO NOTHING;

  RETURN v_cid;
END;
$$;

CREATE OR REPLACE FUNCTION public.school_chat_touch_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.school_chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_chat_messages_touch ON public.school_chat_messages;
CREATE TRIGGER trg_school_chat_messages_touch
  AFTER INSERT ON public.school_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.school_chat_touch_conversation();

ALTER TABLE public.school_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_chat_conversations_select_participant" ON public.school_chat_conversations;
CREATE POLICY "school_chat_conversations_select_participant"
  ON public.school_chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_chat_participants p
      WHERE p.conversation_id = school_chat_conversations.id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "school_chat_participants_select_self" ON public.school_chat_participants;
CREATE POLICY "school_chat_participants_select_self"
  ON public.school_chat_participants
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "school_chat_messages_select_participant" ON public.school_chat_messages;
CREATE POLICY "school_chat_messages_select_participant"
  ON public.school_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_chat_participants p
      WHERE p.conversation_id = school_chat_messages.conversation_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "school_chat_messages_insert_participant" ON public.school_chat_messages;
CREATE POLICY "school_chat_messages_insert_participant"
  ON public.school_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.school_chat_participants p
      WHERE p.conversation_id = school_chat_messages.conversation_id
        AND p.user_id = (SELECT auth.uid())
    )
    AND public.school_chat_pair_allowed((SELECT auth.uid()), (
      SELECT p2.user_id
      FROM public.school_chat_participants p2
      WHERE p2.conversation_id = school_chat_messages.conversation_id
        AND p2.user_id <> (SELECT auth.uid())
      LIMIT 1
    ))
  );

DROP POLICY IF EXISTS "school_chat_participants_update_read" ON public.school_chat_participants;
CREATE POLICY "school_chat_participants_update_read"
  ON public.school_chat_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, UPDATE ON public.school_chat_participants TO authenticated;
GRANT SELECT ON public.school_chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.school_chat_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.school_chat_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  peer_user_id uuid,
  peer_name text,
  peer_role text,
  last_body text,
  last_at timestamptz,
  unread_count bigint
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
    ), 0)
  FROM public.school_chat_conversations c
  INNER JOIN public.school_chat_participants p
    ON p.conversation_id = c.id AND p.user_id = (SELECT auth.uid())
  INNER JOIN public.school_chat_participants p2
    ON p2.conversation_id = c.id AND p2.user_id <> (SELECT auth.uid())
  INNER JOIN public.users ou ON ou.user_id = p2.user_id
  ORDER BY c.updated_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.school_chat_list_eligible_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_get_or_create_dm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_my_conversations() TO authenticated;

COMMENT ON FUNCTION public.school_chat_get_or_create_dm(uuid) IS 'Returns DM conversation id; creates row + participants if missing (SECURITY DEFINER).';

-- Prompt API schema reload so /rest/v1/rpc/* sees new functions immediately.
NOTIFY pgrst, 'reload schema';
