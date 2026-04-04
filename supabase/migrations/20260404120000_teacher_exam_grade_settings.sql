-- Persist teacher exam grade bands and class-level exam prefs (formative max, remark toggles, grade remark texts).
-- Scoped by school + teacher + class (+ subject + scale on band table). Does not alter existing exam_results schema.

-- Helper used by RLS policies across this project (safe if already defined).
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 1) Per-class exam UI preferences (one row per teacher + class)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_exam_class_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers (teacher_id) ON DELETE CASCADE,
  class_name text NOT NULL,
  o_level_formative_max integer NOT NULL DEFAULT 20
    CHECK (o_level_formative_max >= 0 AND o_level_formative_max <= 100),
  auto_remark_enabled boolean NOT NULL DEFAULT true,
  primary_division_settings jsonb,
  grade_remarks_olevel jsonb NOT NULL DEFAULT '{}'::jsonb,
  grade_remarks_alevel jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_exam_class_prefs_unique UNIQUE (school_id, teacher_id, class_name)
);

COMMENT ON TABLE public.teacher_exam_class_prefs IS
  'Teacher exam entry preferences per class: formative cap, auto-remark, optional primary division thresholds, O/A-Level grade remark templates.';

CREATE INDEX IF NOT EXISTS idx_teacher_exam_class_prefs_scope
  ON public.teacher_exam_class_prefs (school_id, teacher_id, class_name);

ALTER TABLE public.teacher_exam_class_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tegp_prefs_select ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;

CREATE POLICY tegp_prefs_select ON public.teacher_exam_class_prefs
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

CREATE POLICY tegp_prefs_all ON public.teacher_exam_class_prefs
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR teacher_id = (
        SELECT u2.linked_teacher_id FROM public.users u2
        WHERE u2.user_id = auth.uid() LIMIT 1
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR teacher_id = (
        SELECT u2.linked_teacher_id FROM public.users u2
        WHERE u2.user_id = auth.uid() LIMIT 1
      )
    )
  );

CREATE OR REPLACE FUNCTION public.trg_teacher_exam_class_prefs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_teacher_exam_class_prefs_updated_at ON public.teacher_exam_class_prefs;
CREATE TRIGGER tr_teacher_exam_class_prefs_updated_at
  BEFORE UPDATE ON public.teacher_exam_class_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_teacher_exam_class_prefs_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Grade bands: primary (D1–F9 style) or secondary (A–E) per subject
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_exam_grade_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers (teacher_id) ON DELETE CASCADE,
  class_name text NOT NULL,
  subject text NOT NULL,
  scale_kind text NOT NULL CHECK (scale_kind IN ('primary', 'secondary')),
  min_percent integer NOT NULL CHECK (min_percent >= 0 AND min_percent <= 100),
  max_percent integer NOT NULL CHECK (max_percent >= 0 AND max_percent <= 100),
  grade_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_exam_grade_bands_range_ok CHECK (min_percent <= max_percent)
);

COMMENT ON TABLE public.teacher_exam_grade_bands IS
  'Percentage → grade label bands for teacher exam entry. primary = school primary scale; secondary = O/A-Level letters A–E.';

CREATE INDEX IF NOT EXISTS idx_teacher_exam_grade_bands_scope
  ON public.teacher_exam_grade_bands (school_id, teacher_id, class_name, subject, scale_kind);

ALTER TABLE public.teacher_exam_grade_bands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tegb_bands_select ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;

CREATE POLICY tegb_bands_select ON public.teacher_exam_grade_bands
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

CREATE POLICY tegb_bands_all ON public.teacher_exam_grade_bands
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR teacher_id = (
        SELECT u2.linked_teacher_id FROM public.users u2
        WHERE u2.user_id = auth.uid() LIMIT 1
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.school_id = public.current_school_id()
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR teacher_id = (
        SELECT u2.linked_teacher_id FROM public.users u2
        WHERE u2.user_id = auth.uid() LIMIT 1
      )
    )
  );

CREATE OR REPLACE FUNCTION public.trg_teacher_exam_grade_bands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_teacher_exam_grade_bands_updated_at ON public.teacher_exam_grade_bands;
CREATE TRIGGER tr_teacher_exam_grade_bands_updated_at
  BEFORE UPDATE ON public.teacher_exam_grade_bands
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_teacher_exam_grade_bands_updated_at();
