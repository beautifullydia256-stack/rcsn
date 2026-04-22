-- Bulk student import: batch tracking + scoped undo. Staff-only.

-- ---------------------------------------------------------------------------
-- Table: one row per file upload / import run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users (user_id) ON DELETE SET NULL,
  file_name text NOT NULL DEFAULT '',
  mode text NOT NULL CHECK (mode IN ('full_school', 'specific_class')),
  class_name text,
  students_added_count integer NOT NULL DEFAULT 0,
  row_error_count integer NOT NULL DEFAULT 0,
  errors_sample jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'undone')),
  undone_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_student_import_batches_school_created
  ON public.student_import_batches (school_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- students.import_batch_id — nullable; set on bulk-created students
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.student_import_batches (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_import_batch_id
  ON public.students (import_batch_id)
  WHERE import_batch_id IS NOT NULL;

COMMENT ON COLUMN public.students.import_batch_id IS
  'When set, student was created by bulk import; used for batch undo.';

-- ---------------------------------------------------------------------------
-- RLS: reuse school staff check from published-reports (same role set)
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_import_batches_staff_all" ON public.student_import_batches;
CREATE POLICY "student_import_batches_staff_all"
  ON public.student_import_batches
  FOR ALL
  TO authenticated
  USING (public.published_reports_user_is_school_staff(school_id))
  WITH CHECK (public.published_reports_user_is_school_staff(school_id));

-- ---------------------------------------------------------------------------
-- RPC: undo one batch — only students with this import_batch_id, same school
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_student_import_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_status text;
  v_count int;
  v_ids uuid[];
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT b.school_id, b.status
  INTO v_school_id, v_status
  FROM public.student_import_batches b
  WHERE b.id = p_batch_id;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'batch not found';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(v_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'import already undone or invalid state';
  END IF;

  SELECT coalesce(array_agg(s.student_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM public.students s
  WHERE s.import_batch_id = p_batch_id
    AND s.school_id = v_school_id;

  v_count := coalesce(array_length(v_ids, 1), 0);

  IF v_count = 0 THEN
    UPDATE public.student_import_batches
    SET status = 'undone', undone_at = now()
    WHERE id = p_batch_id;
    RETURN jsonb_build_object('deleted_count', 0, 'batch_id', p_batch_id);
  END IF;

  -- Clear portal link so DELETE students does not fail (users FK has no ON DELETE)
  UPDATE public.users u
  SET student_id = NULL
  WHERE u.student_id = ANY (v_ids);

  -- Parent links
  DELETE FROM public.parents p
  WHERE p.student_id = ANY (v_ids);

  DELETE FROM public.old_students o
  WHERE o.student_id = ANY (v_ids);

  DELETE FROM public.students s
  WHERE s.import_batch_id = p_batch_id
    AND s.school_id = v_school_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.student_import_batches
  SET status = 'undone', undone_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('deleted_count', v_count, 'batch_id', p_batch_id);
END;
$$;

REVOKE ALL ON FUNCTION public.undo_student_import_batch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_student_import_batch(uuid) TO authenticated;

COMMENT ON FUNCTION public.undo_student_import_batch(uuid) IS
  'Deletes only students created in a bulk import batch; clears users.student_id and parents first.';
