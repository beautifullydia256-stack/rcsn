-- Class teachers: assigned from teacher profile by admin (same as old December 2025 flow).
-- One row per (school, class_name, teacher); report comments use the assigned class teacher for each class.
CREATE TABLE IF NOT EXISTS public.class_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (school_id, class_name)
);

CREATE INDEX IF NOT EXISTS idx_class_teachers_school_class ON public.class_teachers(school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher ON public.class_teachers(school_id, teacher_id);

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ct_select_school ON public.class_teachers;
DROP POLICY IF EXISTS ct_manage_school ON public.class_teachers;

-- Select: same-school users
CREATE POLICY ct_select_school ON public.class_teachers
  FOR SELECT TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
  );

-- Insert/Update/Delete: admin/owner/head_teacher only
CREATE POLICY ct_manage_school ON public.class_teachers
  FOR ALL TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    AND (SELECT role FROM public.users WHERE user_id = auth.uid() LIMIT 1) IN ('admin','owner','head_teacher')
  )
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    AND (SELECT role FROM public.users WHERE user_id = auth.uid() LIMIT 1) IN ('admin','owner','head_teacher')
  );

COMMENT ON TABLE public.class_teachers IS 'Assigned class teacher per class (admin assigns from teacher profile). Used for reports and Class Teacher column.';
