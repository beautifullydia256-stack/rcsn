-- Short-lived payloads for server-side PDF (Puppeteer) to load the SPA print route without sending huge HTML in POST (413).
-- Insert: authenticated staff for their school only. Read/delete: service role via /api/pdf/render-session and /api/pdf/generate.

CREATE TABLE IF NOT EXISTS public.pdf_render_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  read_token text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdf_render_sessions_read_token_unique UNIQUE (read_token)
);

CREATE INDEX IF NOT EXISTS pdf_render_sessions_expires_at_idx ON public.pdf_render_sessions (expires_at);

ALTER TABLE public.pdf_render_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdf_render_sessions_insert_own_school"
  ON public.pdf_render_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.school_id = pdf_render_sessions.school_id
    )
  );

COMMENT ON TABLE public.pdf_render_sessions IS 'Temporary JSON payloads for SPA-based PDF rendering; TTL enforced in application code.';
