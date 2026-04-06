-- WhatsApp-style delivery: delivered_at set when the recipient opens/loads the thread (double gray tick).
-- Read = peer's last_read_at >= message.created_at (double blue tick). Single gray = on server only.

ALTER TABLE public.school_chat_messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

COMMENT ON COLUMN public.school_chat_messages.delivered_at IS
  'Set when the non-sender first loads the conversation; sender sees double-gray tick until read.';

CREATE OR REPLACE FUNCTION public.school_chat_mark_peer_messages_delivered(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.school_chat_user_is_participant(p_conversation_id, v_me) THEN
    RETURN;
  END IF;

  UPDATE public.school_chat_messages m
  SET delivered_at = now()
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id IS DISTINCT FROM v_me
    AND m.delivered_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.school_chat_mark_peer_messages_delivered(uuid) IS
  'Recipient marks the other party''s outgoing messages as delivered (server timestamp).';

GRANT EXECUTE ON FUNCTION public.school_chat_mark_peer_messages_delivered(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
