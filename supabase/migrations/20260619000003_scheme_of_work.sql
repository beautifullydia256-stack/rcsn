-- Scheme of Work: header table (one per class/subject/term/year per teacher)
CREATE TABLE IF NOT EXISTS public.scheme_of_work (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL,
  teacher_id  uuid NOT NULL,
  class_name  text NOT NULL,
  subject     text NOT NULL,
  term        text NOT NULL,
  year        int  NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS scheme_of_work_uq
  ON public.scheme_of_work (school_id, teacher_id, class_name, subject, term, year);

CREATE INDEX IF NOT EXISTS scheme_of_work_school_idx ON public.scheme_of_work (school_id);

-- Scheme of Work entries (one row = one lesson/period)
CREATE TABLE IF NOT EXISTS public.scheme_of_work_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id      uuid NOT NULL REFERENCES public.scheme_of_work(id) ON DELETE CASCADE,
  week_number    int  NOT NULL DEFAULT 1,
  period_number  int  NOT NULL DEFAULT 1,
  theme          text NOT NULL DEFAULT '',
  sub_theme      text NOT NULL DEFAULT '',
  content        text NOT NULL DEFAULT '',
  competences    text NOT NULL DEFAULT '',
  methods        text NOT NULL DEFAULT '',
  activity       text NOT NULL DEFAULT '',
  life_skills    text NOT NULL DEFAULT '',
  materials      text NOT NULL DEFAULT '',
  reference      text NOT NULL DEFAULT '',
  remarks        text NOT NULL DEFAULT '',
  sort_order     int  NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheme_of_work_entries_scheme_id_idx
  ON public.scheme_of_work_entries (scheme_id);

-- RLS
ALTER TABLE public.scheme_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_of_work_entries ENABLE ROW LEVEL SECURITY;

-- scheme_of_work: school members can read their school's schemes
CREATE POLICY "sow_select" ON public.scheme_of_work
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
  );

-- scheme_of_work: school members can insert/update/delete for their school
CREATE POLICY "sow_insert" ON public.scheme_of_work
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "sow_update" ON public.scheme_of_work
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "sow_delete" ON public.scheme_of_work
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
  );

-- scheme_of_work_entries: access via parent scheme
CREATE POLICY "sow_entries_select" ON public.scheme_of_work_entries
  FOR SELECT TO authenticated
  USING (
    scheme_id IN (
      SELECT id FROM public.scheme_of_work
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "sow_entries_insert" ON public.scheme_of_work_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    scheme_id IN (
      SELECT id FROM public.scheme_of_work
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "sow_entries_update" ON public.scheme_of_work_entries
  FOR UPDATE TO authenticated
  USING (
    scheme_id IN (
      SELECT id FROM public.scheme_of_work
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    scheme_id IN (
      SELECT id FROM public.scheme_of_work
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "sow_entries_delete" ON public.scheme_of_work_entries
  FOR DELETE TO authenticated
  USING (
    scheme_id IN (
      SELECT id FROM public.scheme_of_work
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_of_work TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_of_work_entries TO authenticated;
