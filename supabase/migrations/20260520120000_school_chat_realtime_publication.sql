-- Live messaging: expose school chat tables to Supabase Realtime (postgres_changes in the client).
-- Without this, inserts/updates do not stream and users only see new messages after a full refetch.
--
-- REPLICA IDENTITY FULL improves WAL payloads for UPDATEs (e.g. delivered_at ticks, last_read_at).

ALTER TABLE public.school_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.school_chat_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'school_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'school_chat_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_chat_participants;
  END IF;
END $$;
