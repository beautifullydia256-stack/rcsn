-- School events table for the "Upcoming Events" dashboard section.
-- Admins create events with a date, title, type and optional description.

CREATE TABLE IF NOT EXISTS public.school_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  title       text NOT NULL,
  event_date  date NOT NULL,
  event_type  text NOT NULL DEFAULT 'other'
                CHECK (event_type IN ('exam','holiday','meeting','sports','other')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_events_school_date
  ON public.school_events (school_id, event_date);

ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_members_read_events"
  ON public.school_events FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "school_admin_write_events"
  ON public.school_events FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

CREATE POLICY "school_admin_update_events"
  ON public.school_events FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','owner','head_teacher','headteacher')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

CREATE POLICY "school_admin_delete_events"
  ON public.school_events FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );
