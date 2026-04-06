-- Fix 403 on INSERT into school_chat_messages: the insert RLS policy subquery must read the peer's
-- school_chat_participants row to call school_chat_pair_allowed(me, peer_id). The old SELECT policy
-- only allowed rows where user_id = auth.uid(), so the peer row was invisible and the check failed.

DROP POLICY IF EXISTS "school_chat_participants_select_in_shared_conversation" ON public.school_chat_participants;
CREATE POLICY "school_chat_participants_select_in_shared_conversation"
  ON public.school_chat_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_chat_participants pself
      WHERE pself.conversation_id = school_chat_participants.conversation_id
        AND pself.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "school_chat_participants_select_in_shared_conversation" ON public.school_chat_participants IS
  'Allow reading all participant rows for any conversation you belong to (needed for message insert RLS).';
