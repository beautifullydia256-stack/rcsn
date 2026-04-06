-- If school_chat_user_is_participant still hit RLS on school_chat_participants, policies recurse.
-- Ensure the helper reads participants with row_security disabled inside the SECURITY DEFINER body.

CREATE OR REPLACE FUNCTION public.school_chat_user_is_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_chat_participants p
    WHERE p.conversation_id = p_conversation_id
      AND p.user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "school_chat_participants_select_in_shared_conversation" ON public.school_chat_participants;
CREATE POLICY "school_chat_participants_select_in_shared_conversation"
  ON public.school_chat_participants
  FOR SELECT
  TO authenticated
  USING (
    public.school_chat_user_is_participant(school_chat_participants.conversation_id, (SELECT auth.uid()))
  );

GRANT EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
