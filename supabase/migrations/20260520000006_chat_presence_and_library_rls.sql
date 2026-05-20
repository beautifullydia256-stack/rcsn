-- ── Chat function EXECUTE grants ──────────────────────────────────────────────
-- These five functions were missing EXECUTE for the 'authenticated' role, causing
-- 403 errors in the web app. Grants applied to the live DB on 2026-05-20.
-- APPLIED TO LIVE DB: 2026-05-20

GRANT EXECUTE ON FUNCTION public.school_chat_presence_go_offline()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_get_or_create_dm(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_list_eligible_users()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_mark_peer_messages_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid)    TO authenticated;

-- ── school_chat_ping_presence: SECURITY DEFINER upsert ────────────────────────
-- The school_chat_presence table uses RLS WITH CHECK that validates school_id
-- against the users table. Direct upserts from the client get 403 if the RLS
-- evaluator runs before the auth context is fully resolved.
-- This SECURITY DEFINER function bypasses RLS and performs the upsert safely —
-- it reads school_id from the users table itself so the client cannot spoof it.
-- APPLIED TO LIVE DB: 2026-05-20

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_school_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT school_id INTO v_school_id
  FROM public.users
  WHERE id = v_user_id
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RETURN; -- user has no school yet, silently no-op
  END IF;

  INSERT INTO public.school_chat_presence (user_id, school_id, last_seen_at, session_active)
  VALUES (v_user_id, v_school_id, now(), true)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id      = EXCLUDED.school_id,
        last_seen_at   = EXCLUDED.last_seen_at,
        session_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_chat_ping_presence() TO authenticated;

-- ── library: allow anonymous reads ───────────────────────────────────────────
-- The Library page (/library) is a public marketing page — no login required.
-- Without this policy Supabase returns 401 for unauthenticated visitors.
-- APPLIED TO LIVE DB: 2026-05-20

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'library'
      AND policyname = 'allow_anon_select_library'
  ) THEN
    EXECUTE $p$
      CREATE POLICY allow_anon_select_library
        ON public.library
        FOR SELECT
        TO anon, authenticated
        USING (true)
    $p$;
  END IF;
END;
$$;
