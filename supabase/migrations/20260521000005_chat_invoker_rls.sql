-- Convert all public school_chat SECURITY DEFINER functions to SECURITY INVOKER
-- + add the RLS policies the functions now rely on
-- + fix auth_rls_initplan warnings (wrap auth.uid() in SELECT)
-- + merge duplicate SELECT policies on conversations and users
-- + fix library duplicate permissive policies
-- Applied live on 2026-05-21.
--
-- Root cause of the SECURITY DEFINER warnings:
--   Migration 20260520000006 explicitly GRANTed EXECUTE TO authenticated on all chat
--   functions. The Supabase linter (rule 0029) flags every SECURITY DEFINER function
--   callable by authenticated. Converting to SECURITY INVOKER clears all 6 warnings.
--
-- To convert to SECURITY INVOKER safely, the underlying tables need RLS policies
-- that allow authenticated users to perform the same operations.

-- ─── Helper ──────────────────────────────────────────────────────────────────
-- Gets caller's school_id without triggering recursive RLS evaluation on users.
CREATE OR REPLACE FUNCTION private.caller_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ─── public.users ─────────────────────────────────────────────────────────────
-- Merged users_unified_access + users_read_same_school into one policy.
-- school_chat_list_eligible_users (now INVOKER) needs to SELECT other users in school.
DROP POLICY IF EXISTS users_unified_access ON public.users;
DROP POLICY IF EXISTS users_read_same_school ON public.users;
CREATE POLICY users_select
ON public.users FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = 'a360d879-192c-4b5a-b776-6452849f1102'::uuid
  OR user_id = (SELECT auth.uid())
  OR school_id = private.caller_school_id()
);

-- ─── school_chat_conversations ────────────────────────────────────────────────
-- INSERT: allow creating DM conversations when caller is one of the two parties.
CREATE POLICY school_chat_conversations_insert_dm
ON public.school_chat_conversations FOR INSERT TO authenticated
WITH CHECK (
  school_id = private.caller_school_id()
  AND dm_key IS NOT NULL
  AND (
    dm_key LIKE ((SELECT auth.uid()::text) || ':%')
    OR dm_key LIKE ('%:' || (SELECT auth.uid()::text))
  )
);

-- SELECT: merged participant-based + dm_key-based access into one policy.
-- dm_key branch needed so get_or_create_dm can SELECT the conversation id
-- immediately after INSERT (before participants are inserted).
DROP POLICY IF EXISTS school_chat_conversations_select_participant ON public.school_chat_conversations;
CREATE POLICY school_chat_conversations_select
ON public.school_chat_conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM school_chat_participants p
    WHERE p.conversation_id = id AND p.user_id = (SELECT auth.uid())
  )
  OR (
    dm_key IS NOT NULL AND (
      dm_key LIKE ((SELECT auth.uid()::text) || ':%')
      OR dm_key LIKE ('%:' || (SELECT auth.uid()::text))
    )
  )
);

-- ─── school_chat_participants ──────────────────────────────────────────────────
-- INSERT: allow adding participants only to DM conversations where the
-- conversation's dm_key is the canonical pair for (caller, inserted_user).
-- This prevents adding oneself or others to arbitrary conversations.
CREATE POLICY school_chat_participants_insert_dm_pair
ON public.school_chat_participants FOR INSERT TO authenticated
WITH CHECK (
  school_id = private.caller_school_id()
  AND EXISTS (
    SELECT 1 FROM public.school_chat_conversations c
    WHERE c.id = conversation_id
      AND c.school_id = private.caller_school_id()
      AND c.dm_key = CASE
        WHEN (SELECT auth.uid()::text) < user_id::text
          THEN (SELECT auth.uid()::text) || ':' || user_id::text
          ELSE user_id::text || ':' || (SELECT auth.uid()::text)
        END
  )
);

-- ─── school_chat_messages ─────────────────────────────────────────────────────
-- UPDATE: allow marking peer messages as delivered only.
-- Column guard trigger (below) prevents changing any other field.
CREATE POLICY school_chat_messages_update_delivered
ON public.school_chat_messages FOR UPDATE TO authenticated
USING (
  sender_id IS DISTINCT FROM (SELECT auth.uid())
  AND delivered_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.school_chat_participants p
    WHERE p.conversation_id = school_chat_messages.conversation_id
      AND p.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  sender_id IS DISTINCT FROM (SELECT auth.uid())
  AND delivered_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.school_chat_participants p
    WHERE p.conversation_id = school_chat_messages.conversation_id
      AND p.user_id = (SELECT auth.uid())
  )
);

-- Trigger: block any UPDATE from authenticated users that changes columns
-- other than delivered_at (prevents body/sender tampering via REST API).
CREATE OR REPLACE FUNCTION private.school_chat_messages_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.conversation_id IS DISTINCT FROM OLD.conversation_id OR
    NEW.sender_id       IS DISTINCT FROM OLD.sender_id       OR
    NEW.body            IS DISTINCT FROM OLD.body             OR
    NEW.created_at      IS DISTINCT FROM OLD.created_at      OR
    NEW.msg_kind        IS DISTINCT FROM OLD.msg_kind         OR
    NEW.audio_path      IS DISTINCT FROM OLD.audio_path       OR
    NEW.audio_duration_sec IS DISTINCT FROM OLD.audio_duration_sec OR
    NEW.school_id       IS DISTINCT FROM OLD.school_id
  ) THEN
    RAISE EXCEPTION 'Only delivered_at may be updated on school_chat_messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_chat_messages_guard_update ON public.school_chat_messages;
CREATE TRIGGER school_chat_messages_guard_update
BEFORE UPDATE ON public.school_chat_messages
FOR EACH ROW EXECUTE FUNCTION private.school_chat_messages_guard_update();

-- ─── library ──────────────────────────────────────────────────────────────────
-- Replace two overlapping permissive policies with four clean single-purpose ones.
-- Previous: allow_anon_select_library (SELECT, anon+auth, qual=true)
--         + optimized_authenticated_access (ALL, public, auth.role()=authenticated)
DROP POLICY IF EXISTS allow_anon_select_library       ON public.library;
DROP POLICY IF EXISTS optimized_authenticated_access  ON public.library;
CREATE POLICY library_select ON public.library FOR SELECT                USING (true);
CREATE POLICY library_insert ON public.library FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY library_update ON public.library FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY library_delete ON public.library FOR DELETE TO authenticated USING (true);

-- ─── Convert all 6 functions to SECURITY INVOKER ──────────────────────────────

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $func$
DECLARE
  v_user_id  uuid := auth.uid();
  v_school_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT school_id INTO v_school_id FROM public.users WHERE user_id = v_user_id LIMIT 1;
  IF v_school_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.school_chat_presence (user_id, school_id, last_seen_at, session_active)
  VALUES (v_user_id, v_school_id, now(), true)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id      = EXCLUDED.school_id,
        last_seen_at   = EXCLUDED.last_seen_at,
        session_active = true;
END;
$func$;

CREATE OR REPLACE FUNCTION public.school_chat_presence_go_offline()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $func$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.school_chat_presence
  SET session_active = false, last_seen_at = now()
  WHERE user_id = auth.uid();
END;
$func$;

CREATE OR REPLACE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE(user_id uuid, name text, role text, email text,
              last_seen_at timestamptz, session_active boolean)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT
    u.user_id, u.name, u.role, u.email,
    COALESCE(p.last_seen_at, u.last_sign_in_at),
    CASE WHEN p.user_id IS NULL THEN false ELSE COALESCE(p.session_active, false) END
  FROM public.users u
  LEFT JOIN public.school_chat_presence p ON p.user_id = u.user_id
  WHERE auth.uid() IS NOT NULL
    AND u.school_id = private.caller_school_id()
    AND u.user_id <> auth.uid()
    AND public.school_chat_pair_allowed(auth.uid(), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$$;

CREATE OR REPLACE FUNCTION public.school_chat_get_or_create_dm(p_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $func$
DECLARE
  v_me    uuid := auth.uid();
  v_school uuid;
  v_cid   uuid;
  v_key   text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.school_chat_pair_allowed(v_me, p_other_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT school_id INTO v_school FROM public.users WHERE user_id = v_me LIMIT 1;
  IF v_school IS NULL THEN RAISE EXCEPTION 'no school'; END IF;
  v_key := CASE
    WHEN v_me::text < p_other_user_id::text
      THEN v_me::text || ':' || p_other_user_id::text
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
$func$;

CREATE OR REPLACE FUNCTION public.school_chat_mark_peer_messages_delivered(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION public.school_chat_user_is_participant(
  p_conversation_id uuid, p_user_id uuid
) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
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
