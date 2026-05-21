-- School chat function security hardening
-- Applied live on 2026-05-21.
--
-- Findings from Supabase security linter:
--
-- 1. public.school_chat_user_is_participant(uuid, uuid)
--    Had NO auth.uid() guard — any authenticated user could probe whether
--    arbitrary users are participants in arbitrary conversations via the REST API
--    (/rest/v1/rpc/school_chat_user_is_participant). This leaks conversation
--    membership information without the caller needing to be a participant.
--    The private.school_chat_user_is_participant function is what RLS policies
--    and internal functions use; the public version was unused.
--
--    Fix: caller must also be a participant in the conversation to get a
--    meaningful result. Returns false for any conversation the caller is not in.
--
-- 2. Functions 2–6 below are left unchanged — the linter warns about ALL
--    SECURITY DEFINER functions callable by authenticated, but these are
--    correctly designed (each validates auth.uid() and scopes to the caller's
--    data / school):
--    - school_chat_get_or_create_dm        validates uid + pair_allowed check
--    - school_chat_list_eligible_users      filters to caller's school only
--    - school_chat_mark_peer_messages_delivered  verifies caller is participant
--    - school_chat_ping_presence            only writes caller's own row
--    - school_chat_presence_go_offline      WHERE user_id = auth.uid() only

CREATE OR REPLACE FUNCTION public.school_chat_user_is_participant(
  p_conversation_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Caller must also be a participant — prevents using this as a membership
  -- oracle for conversations the caller is not in.
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
