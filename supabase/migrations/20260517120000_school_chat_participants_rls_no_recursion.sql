-- Fix "infinite recursion detected in policy for relation school_chat_participants":
-- The prior policy subqueried school_chat_participants inside its own FOR SELECT RLS, which recurses.
-- Use SECURITY DEFINER helper so membership is checked without re-entering RLS on that table.

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

COMMENT ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) IS
  'RLS helper: true if user is a participant (reads table as definer to avoid recursive policy).';

DROP POLICY IF EXISTS "school_chat_participants_select_in_shared_conversation" ON public.school_chat_participants;
CREATE POLICY "school_chat_participants_select_in_shared_conversation"
  ON public.school_chat_participants
  FOR SELECT
  TO authenticated
  USING (
    public.school_chat_user_is_participant(school_chat_participants.conversation_id, (SELECT auth.uid()))
  );

GRANT EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) TO authenticated;
