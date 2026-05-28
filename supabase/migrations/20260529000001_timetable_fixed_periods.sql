-- School-wide fixed timetable periods (break time, lunch time, custom).
-- These appear as coloured bands on the generated timetable PDF.
-- break + lunch are mandatory in the UI; custom periods are optional.

CREATE TABLE IF NOT EXISTS public.timetable_fixed_periods (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid        NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  name       text        NOT NULL,
  start_time text        NOT NULL,
  end_time   text        NOT NULL,
  color      text        NOT NULL DEFAULT '#EF4444',
  type       text        NOT NULL DEFAULT 'custom'
                         CHECK (type IN ('break', 'lunch', 'custom')),
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetable_fixed_periods_school
  ON public.timetable_fixed_periods (school_id);

ALTER TABLE public.timetable_fixed_periods ENABLE ROW LEVEL SECURITY;

-- All school members can read
CREATE POLICY "school_members_read_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = auth.uid()
    )
  );

-- Only admins/owners can write
CREATE POLICY "school_admin_write_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_fixed_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_fixed_periods TO service_role;
