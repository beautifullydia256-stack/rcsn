-- Grade bands + class exam prefs are shared for a class (one row per school+class for prefs;
-- bands keyed by school+class+subject+scale). Any teacher assigned in teacher_class_subjects
-- for that class (and subject, for bands) can read/write.

-- ---------------------------------------------------------------------------
-- Policies off → schema change → policies on
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tegp_prefs_select ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegp_prefs_all ON public.teacher_exam_class_prefs;
DROP POLICY IF EXISTS tegb_bands_select ON public.teacher_exam_grade_bands;
DROP POLICY IF EXISTS tegb_bands_all ON public.teacher_exam_grade_bands;

-- Keep one prefs row per (school_id, class_name)
DELETE FROM public.teacher_exam_class_prefs p
WHERE p.id NOT IN (
  SELECT DISTINCT ON (school_id, class_name) id
  FROM public.teacher_exam_class_prefs
  ORDER BY school_id, class_name, updated_at DESC NULLS LAST, id
);

ALTER TABLE public.teacher_exam_class_prefs
  DROP CONSTRAINT IF EXISTS teacher_exam_class_prefs_unique;

ALTER TABLE public.teacher_exam_class_prefs
  DROP COLUMN IF EXISTS teacher_id;

ALTER TABLE public.teacher_exam_class_prefs
  ADD CONSTRAINT teacher_exam_class_prefs_unique UNIQUE (school_id, class_name);

DROP INDEX IF EXISTS idx_teacher_exam_class_prefs_scope;
CREATE INDEX idx_teacher_exam_class_prefs_scope
  ON public.teacher_exam_class_prefs (school_id, class_name);

-- Bands: drop duplicate rows before removing teacher_id
DELETE FROM public.teacher_exam_grade_bands a
USING public.teacher_exam_grade_bands b
WHERE a.ctid > b.ctid
  AND a.school_id = b.school_id
  AND a.class_name = b.class_name
  AND a.subject = b.subject
  AND a.scale_kind = b.scale_kind
  AND a.sort_order = b.sort_order;

ALTER TABLE public.teacher_exam_grade_bands
  DROP COLUMN IF EXISTS teacher_id;

DROP INDEX IF EXISTS idx_teacher_exam_grade_bands_scope;
CREATE INDEX idx_teacher_exam_grade_bands_scope
  ON public.teacher_exam_grade_bands (school_id, class_name, subject, scale_kind);

-- ---------------------------------------------------------------------------
-- RLS: school staff read prefs; write if admin/head or assigned to the class (any subject)
-- ---------------------------------------------------------------------------
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
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_class_prefs.school_id
          AND tcs.class_name = teacher_exam_class_prefs.class_name
          AND u.linked_teacher_id IS NOT NULL
          AND u.linked_teacher_id = tcs.teacher_id
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
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_class_prefs.school_id
          AND tcs.class_name = teacher_exam_class_prefs.class_name
          AND u.linked_teacher_id IS NOT NULL
          AND u.linked_teacher_id = tcs.teacher_id
      )
    )
  );

-- Bands: must be assigned to this class+subject (or admin)
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
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_grade_bands.school_id
          AND tcs.class_name = teacher_exam_grade_bands.class_name
          AND tcs.subject = teacher_exam_grade_bands.subject
          AND u.linked_teacher_id IS NOT NULL
          AND u.linked_teacher_id = tcs.teacher_id
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
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = auth.uid() AND u.school_id = tcs.school_id
        WHERE tcs.school_id = teacher_exam_grade_bands.school_id
          AND tcs.class_name = teacher_exam_grade_bands.class_name
          AND tcs.subject = teacher_exam_grade_bands.subject
          AND u.linked_teacher_id IS NOT NULL
          AND u.linked_teacher_id = tcs.teacher_id
      )
    )
  );

COMMENT ON TABLE public.teacher_exam_class_prefs IS
  'Shared per-class exam entry prefs (formative max, remarks, divisions). One row per school+class.';

COMMENT ON TABLE public.teacher_exam_grade_bands IS
  'Shared percentage→grade bands per school+class+subject. Co-teachers of the same class+subject share these rows.';
