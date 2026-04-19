-- Browser inserts were failing RLS and/or INSERT...RETURNING returned no rows without SELECT policy + grants.
-- Staging uses a SECURITY DEFINER RPC: school_id always comes from public.users for auth.uid() (not the client).

GRANT SELECT, INSERT ON public.pdf_render_sessions TO authenticated;

DROP POLICY IF EXISTS "pdf_render_sessions_insert_own_school" ON public.pdf_render_sessions;

CREATE POLICY "pdf_render_sessions_select_own_school"
  ON public.pdf_render_sessions
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

CREATE POLICY "pdf_render_sessions_insert_own_school"
  ON public.pdf_render_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.insert_pdf_render_session(p_read_token text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_id uuid;
BEGIN
  SELECT u.school_id INTO v_school
  FROM public.users u
  WHERE u.user_id = (SELECT auth.uid())
    AND u.school_id IS NOT NULL
  LIMIT 1;

  IF v_school IS NULL THEN
    RAISE EXCEPTION 'No school context for this account';
  END IF;

  INSERT INTO public.pdf_render_sessions (school_id, read_token, payload)
  VALUES (v_school, p_read_token, p_payload)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_pdf_render_session(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_pdf_render_session(text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.insert_pdf_render_session(text, jsonb) IS 'Stages PDF payload for /print/heritage-pdf; school_id from users row for auth.uid().';
