-- Voice notes (compressed WebM/Opus via client) + retention:
-- - All chat rows older than 7 days are deleted (text and voice placeholders).
-- - Voice file in storage is removed after 2 days; row body becomes a placeholder until the 7-day purge.

-- --- Messages: kind + optional audio metadata --------------------------------
ALTER TABLE public.school_chat_messages
  ADD COLUMN IF NOT EXISTS msg_kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_duration_sec integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'school_chat_messages_msg_kind_check'
  ) THEN
    ALTER TABLE public.school_chat_messages
      ADD CONSTRAINT school_chat_messages_msg_kind_check
      CHECK (msg_kind IN ('text', 'voice'));
  END IF;
END $$;

ALTER TABLE public.school_chat_messages
  DROP CONSTRAINT IF EXISTS school_chat_messages_body_nonempty;

ALTER TABLE public.school_chat_messages
  ADD CONSTRAINT school_chat_messages_body_kind CHECK (
    (msg_kind = 'text' AND audio_path IS NULL AND char_length(trim(body)) > 0)
    OR (msg_kind = 'voice' AND char_length(trim(body)) > 0 AND char_length(body) <= 8000)
  );

COMMENT ON COLUMN public.school_chat_messages.msg_kind IS 'text | voice (voice uses storage bucket school-chat-voice).';
COMMENT ON COLUMN public.school_chat_messages.audio_path IS 'Object path inside bucket school-chat-voice, e.g. {school_id}/{message_id}.webm; NULL after 2-day audio expiry.';
COMMENT ON COLUMN public.school_chat_messages.audio_duration_sec IS 'Recording length for display; optional.';

-- --- Finalize voice path after client upload ---------------------------------
CREATE OR REPLACE FUNCTION public.school_chat_finalize_voice(p_message_id uuid, p_relative_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_school uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT school_id INTO v_school
  FROM public.school_chat_messages
  WHERE id = p_message_id AND sender_id = v_me AND msg_kind = 'voice';

  IF v_school IS NULL THEN
    RAISE EXCEPTION 'message not found or not yours';
  END IF;

  IF p_relative_path NOT IN (
    v_school::text || '/' || p_message_id::text || '.webm',
    v_school::text || '/' || p_message_id::text || '.m4a',
    v_school::text || '/' || p_message_id::text || '.mp4'
  ) THEN
    RAISE EXCEPTION 'invalid storage path';
  END IF;

  UPDATE public.school_chat_messages m
  SET audio_path = p_relative_path
  WHERE m.id = p_message_id
    AND m.sender_id = v_me
    AND m.msg_kind = 'voice';
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_chat_finalize_voice(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.school_chat_finalize_voice(uuid, text) IS
  'After upload to school-chat-voice/{school_id}/{message_id}.webm|.m4a|.mp4, sets audio_path.';

-- --- Storage bucket (private, small voice notes) ------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-chat-voice',
  'school-chat-voice',
  false,
  1572864,
  ARRAY['audio/webm', 'audio/ogg', 'video/webm', 'audio/mp4', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Read: participants in the conversation that owns this message file.
DROP POLICY IF EXISTS "school_chat_voice_select" ON storage.objects;
CREATE POLICY "school_chat_voice_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'school-chat-voice'
    AND EXISTS (
      SELECT 1
      FROM public.school_chat_messages m
      INNER JOIN public.school_chat_participants p
        ON p.conversation_id = m.conversation_id
       AND p.user_id = (SELECT auth.uid())
      WHERE m.audio_path = name
    )
  );

-- Upload: path must be {my_school_id}/{message_id}.webm and message row exists as my voice (path not finalized yet).
DROP POLICY IF EXISTS "school_chat_voice_insert" ON storage.objects;
CREATE POLICY "school_chat_voice_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school-chat-voice'
    AND (storage.foldername(name))[1] = (
      SELECT u.school_id::text FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1
    )
    AND EXISTS (
      SELECT 1
      FROM public.school_chat_messages m
      WHERE m.id::text = split_part((storage.filename(name)), '.', 1)
        AND m.sender_id = (SELECT auth.uid())
        AND m.msg_kind = 'voice'
        AND (m.audio_path IS NULL OR m.audio_path = name)
    )
  );

DROP POLICY IF EXISTS "school_chat_voice_delete" ON storage.objects;
CREATE POLICY "school_chat_voice_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'school-chat-voice'
    AND EXISTS (
      SELECT 1
      FROM public.school_chat_messages m
      WHERE m.audio_path = name
        AND m.sender_id = (SELECT auth.uid())
        AND m.msg_kind = 'voice'
    )
  );

-- --- Hourly retention (pg_cron) ----------------------------------------------
CREATE OR REPLACE FUNCTION public.school_chat_retention_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Strip voice audio after 2 days (storage + DB pointer + placeholder body).
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'school-chat-voice'
    AND o.name IN (
      SELECT m.audio_path
      FROM public.school_chat_messages m
      WHERE m.msg_kind = 'voice'
        AND m.audio_path IS NOT NULL
        AND m.created_at <= now() - interval '2 days'
    );

  UPDATE public.school_chat_messages m
  SET
    audio_path = NULL,
    body = 'Voice note expired (no longer available).'
  WHERE m.msg_kind = 'voice'
    AND m.audio_path IS NOT NULL
    AND m.created_at <= now() - interval '2 days';

  -- Remove every message (and leftover voice files) after 7 days.
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'school-chat-voice'
    AND o.name IN (
      SELECT m.audio_path
      FROM public.school_chat_messages m
      WHERE m.created_at <= now() - interval '7 days'
        AND m.audio_path IS NOT NULL
    );

  DELETE FROM public.school_chat_messages m
  WHERE m.created_at <= now() - interval '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.school_chat_retention_run() FROM PUBLIC;

DO $cron$
DECLARE
  j RECORD;
BEGIN
  -- Idempotent: replace any previous schedule for this job.
  FOR j IN
    SELECT jobid FROM cron.job
    WHERE command LIKE '%school_chat_retention_run()%'
       OR command LIKE '%school_chat_retention_run() %'
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'school_chat_retention_hourly',
    '17 * * * *',
    'SELECT public.school_chat_retention_run();'
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available; run school_chat_retention_run() via scheduler manually.';
  WHEN OTHERS THEN
    RAISE NOTICE 'school_chat retention cron skipped: %', SQLERRM;
END
$cron$;

NOTIFY pgrst, 'reload schema';
