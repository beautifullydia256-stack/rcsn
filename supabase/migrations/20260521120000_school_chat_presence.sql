-- Per-user activity pings for school chat: online / last seen, without exposing full public.users rows.
-- Peers in the same school may SELECT presence; each user may INSERT/UPDATE only their own row.

CREATE TABLE IF NOT EXISTS public.school_chat_presence (
  user_id uuid PRIMARY KEY REFERENCES public.users (user_id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_chat_presence_school_last_seen
  ON public.school_chat_presence (school_id, last_seen_at DESC);

ALTER TABLE public.school_chat_presence REPLICA IDENTITY FULL;

ALTER TABLE public.school_chat_presence ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.school_chat_presence IS
  'Heartbeat rows for chat online/last-seen; updated by the client while using the app.';

DROP POLICY IF EXISTS "school_chat_presence_select_school" ON public.school_chat_presence;
CREATE POLICY "school_chat_presence_select_school"
  ON public.school_chat_presence
  FOR SELECT
  TO authenticated
  USING (
    school_id = (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "school_chat_presence_insert_own" ON public.school_chat_presence;
CREATE POLICY "school_chat_presence_insert_own"
  ON public.school_chat_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND school_id = (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "school_chat_presence_update_own" ON public.school_chat_presence;
CREATE POLICY "school_chat_presence_update_own"
  ON public.school_chat_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.school_chat_presence TO authenticated;

-- Postgres forbids changing RETURNS TABLE column set via CREATE OR REPLACE; drop then create.
DROP FUNCTION IF EXISTS public.school_chat_list_eligible_users();
DROP FUNCTION IF EXISTS public.school_chat_my_conversations();

CREATE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE (
  user_id uuid,
  name text,
  role text,
  email text,
  last_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id, u.name, u.role, u.email, p.last_seen_at
  FROM public.users u
  LEFT JOIN public.school_chat_presence p ON p.user_id = u.user_id
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.school_id = (SELECT u2.school_id FROM public.users u2 WHERE u2.user_id = (SELECT auth.uid()) LIMIT 1)
    AND u.user_id <> (SELECT auth.uid())
    AND public.school_chat_pair_allowed((SELECT auth.uid()), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$$;

CREATE FUNCTION public.school_chat_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  peer_user_id uuid,
  peer_name text,
  peer_role text,
  last_body text,
  last_at timestamptz,
  unread_count bigint,
  peer_last_seen_at timestamptz
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
    ), 0),
    pr.last_seen_at
  FROM public.school_chat_conversations c
  INNER JOIN public.school_chat_participants p
    ON p.conversation_id = c.id AND p.user_id = (SELECT auth.uid())
  INNER JOIN public.school_chat_participants p2
    ON p2.conversation_id = c.id AND p2.user_id <> (SELECT auth.uid())
  INNER JOIN public.users ou ON ou.user_id = p2.user_id
  LEFT JOIN public.school_chat_presence pr ON pr.user_id = ou.user_id
  ORDER BY c.updated_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.school_chat_list_eligible_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_my_conversations() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'school_chat_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_chat_presence;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
