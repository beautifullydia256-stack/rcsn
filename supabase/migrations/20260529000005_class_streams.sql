-- Class streams: purely organisational sub-divisions of a class.
-- A class must have at least 2 streams for streaming to be active.
-- The underlying class_name in exam_results / reports never changes.

CREATE TABLE IF NOT EXISTS public.class_streams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  class_name  text NOT NULL,
  stream_name text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, class_name, stream_name)
);

CREATE INDEX IF NOT EXISTS class_streams_school_class
  ON public.class_streams (school_id, class_name);

-- Which stream each student belongs to for a given class.
-- student_id + class_name is unique (one stream per class per student).
CREATE TABLE IF NOT EXISTS public.student_stream_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  class_name  text NOT NULL,
  stream_name text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id, class_name)
);

CREATE INDEX IF NOT EXISTS student_stream_assignments_school_class
  ON public.student_stream_assignments (school_id, class_name);

-- Allow teacher–subject–class assignments to be stream-scoped.
-- NULL = applies to all streams of that class (legacy / non-streamed).
ALTER TABLE public.teacher_class_subjects
  ADD COLUMN IF NOT EXISTS stream_name text;

-- ── RLS: class_streams ───────────────────────────────────────────────────────
ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_members_read_class_streams"
  ON public.class_streams FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "school_admin_insert_class_streams"
  ON public.class_streams FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

CREATE POLICY "school_admin_delete_class_streams"
  ON public.class_streams FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

-- ── RLS: student_stream_assignments ─────────────────────────────────────────
ALTER TABLE public.student_stream_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_members_read_student_streams"
  ON public.student_stream_assignments FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "school_admin_insert_student_streams"
  ON public.student_stream_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

CREATE POLICY "school_admin_update_student_streams"
  ON public.student_stream_assignments FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );

CREATE POLICY "school_admin_delete_student_streams"
  ON public.student_stream_assignments FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin','owner','head_teacher','headteacher')
    )
  );
