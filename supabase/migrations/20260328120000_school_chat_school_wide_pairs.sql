-- School chat: any two active users in the same school may DM each other (full school directory for New chat).
-- UI filters (teachers / parents / students) are client-side; list includes staff in "All".

CREATE OR REPLACE FUNCTION public.school_chat_pair_allowed(p_viewer uuid, p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_viewer uuid;
  v_school_target uuid;
  v_av boolean;
  v_at boolean;
BEGIN
  IF p_viewer IS NULL OR p_target IS NULL OR p_viewer = p_target THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_viewer, v_av
  FROM public.users u
  WHERE u.user_id = p_viewer;

  IF v_school_viewer IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_target, v_at
  FROM public.users u
  WHERE u.user_id = p_target;

  IF v_school_target IS NULL OR v_school_viewer <> v_school_target THEN
    RETURN FALSE;
  END IF;

  IF v_av = false OR v_at = false THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.school_chat_pair_allowed(uuid, uuid) IS
  'True when both users are active public.users rows in the same school (school-wide messaging).';

CREATE OR REPLACE FUNCTION public.school_chat_list_eligible_users()
RETURNS TABLE (user_id uuid, name text, role text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id, u.name, u.role, u.email
  FROM public.users u
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.school_id = (SELECT u2.school_id FROM public.users u2 WHERE u2.user_id = (SELECT auth.uid()) LIMIT 1)
    AND u.user_id <> (SELECT auth.uid())
    AND public.school_chat_pair_allowed((SELECT auth.uid()), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$$;
