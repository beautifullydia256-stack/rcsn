-- Online review: staff-publish PDFs per student (and optional class ZIP) without snapshot/generate-final.
-- Parents read published_student_reports + signed URLs; bundle metadata is staff-only.

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.published_student_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (class_id) ON DELETE CASCADE,
  term integer NOT NULL,
  year integer NOT NULL,
  exam_set_id uuid NOT NULL REFERENCES public.exam_sets (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students (student_id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'published-reports',
  storage_object_path text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES public.users (user_id) ON DELETE SET NULL,
  CONSTRAINT published_student_reports_scope_student_unique UNIQUE (
    school_id,
    class_id,
    term,
    year,
    exam_set_id,
    student_id
  )
);

CREATE INDEX IF NOT EXISTS idx_published_student_reports_student
  ON public.published_student_reports (student_id);

CREATE INDEX IF NOT EXISTS idx_published_student_reports_scope
  ON public.published_student_reports (school_id, class_id, term, year, exam_set_id);

CREATE TABLE IF NOT EXISTS public.published_class_report_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (class_id) ON DELETE CASCADE,
  term integer NOT NULL,
  year integer NOT NULL,
  exam_set_id uuid NOT NULL REFERENCES public.exam_sets (id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'published-reports',
  storage_object_path text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES public.users (user_id) ON DELETE SET NULL,
  CONSTRAINT published_class_report_bundles_scope_unique UNIQUE (
    school_id,
    class_id,
    term,
    year,
    exam_set_id
  )
);

CREATE INDEX IF NOT EXISTS idx_published_class_bundles_scope
  ON public.published_class_report_bundles (school_id, class_id, term, year, exam_set_id);

-- -----------------------------------------------------------------------------
-- RLS helpers (staff roles aligned with report_snapshots / generated_reports)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.published_reports_user_is_school_staff(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.school_id IS NOT NULL
      AND u.school_id = p_school_id
      AND lower(trim(u.role::text)) IN (
        'admin',
        'accountant',
        'teacher',
        'head_teacher',
        'owner',
        'librarian',
        'lab_technician',
        'clinician'
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- published_student_reports RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.published_student_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "published_student_reports_staff_all" ON public.published_student_reports;
CREATE POLICY "published_student_reports_staff_all"
  ON public.published_student_reports
  FOR ALL
  TO authenticated
  USING (public.published_reports_user_is_school_staff(school_id))
  WITH CHECK (public.published_reports_user_is_school_staff(school_id));

DROP POLICY IF EXISTS "published_student_reports_parent_select" ON public.published_student_reports;
CREATE POLICY "published_student_reports_parent_select"
  ON public.published_student_reports
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT p.student_id
      FROM public.parents p
      WHERE p.parent_id = (SELECT auth.uid())
    )
    OR student_id IN (
      SELECT u.student_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.student_id IS NOT NULL
    )
  );

-- -----------------------------------------------------------------------------
-- published_class_report_bundles RLS (staff only — no parent/student paths)
-- -----------------------------------------------------------------------------

ALTER TABLE public.published_class_report_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "published_class_report_bundles_staff_all" ON public.published_class_report_bundles;
CREATE POLICY "published_class_report_bundles_staff_all"
  ON public.published_class_report_bundles
  FOR ALL
  TO authenticated
  USING (public.published_reports_user_is_school_staff(school_id))
  WITH CHECK (public.published_reports_user_is_school_staff(school_id));

-- -----------------------------------------------------------------------------
-- Storage bucket (private)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'published-reports',
  'published-reports',
  false,
  52428800,
  ARRAY['application/pdf', 'application/zip']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Staff: full access to objects under reports/{their_school_id}/...
DROP POLICY IF EXISTS "published_reports_storage_staff_select" ON storage.objects;
CREATE POLICY "published_reports_storage_staff_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND split_part(name, '/', 1) = 'reports'
    AND split_part(name, '/', 2) = (
      SELECT u.school_id::text
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND public.published_reports_user_is_school_staff(
      (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "published_reports_storage_staff_insert" ON storage.objects;
CREATE POLICY "published_reports_storage_staff_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'published-reports'
    AND split_part(name, '/', 1) = 'reports'
    AND split_part(name, '/', 2) = (
      SELECT u.school_id::text
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND public.published_reports_user_is_school_staff(
      (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "published_reports_storage_staff_update" ON storage.objects;
CREATE POLICY "published_reports_storage_staff_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND split_part(name, '/', 1) = 'reports'
    AND split_part(name, '/', 2) = (
      SELECT u.school_id::text
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND public.published_reports_user_is_school_staff(
      (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
  )
  WITH CHECK (
    bucket_id = 'published-reports'
    AND split_part(name, '/', 1) = 'reports'
    AND split_part(name, '/', 2) = (
      SELECT u.school_id::text
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND public.published_reports_user_is_school_staff(
      (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "published_reports_storage_staff_delete" ON storage.objects;
CREATE POLICY "published_reports_storage_staff_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND split_part(name, '/', 1) = 'reports'
    AND split_part(name, '/', 2) = (
      SELECT u.school_id::text
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND public.published_reports_user_is_school_staff(
      (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
  );

-- Parents / students: read only objects that match a published row they may see
DROP POLICY IF EXISTS "published_reports_storage_learner_select" ON storage.objects;
CREATE POLICY "published_reports_storage_learner_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND EXISTS (
      SELECT 1
      FROM public.published_student_reports psr
      WHERE psr.storage_bucket = 'published-reports'
        AND psr.storage_object_path = name
        AND (
          psr.student_id IN (
            SELECT p.student_id FROM public.parents p WHERE p.parent_id = (SELECT auth.uid())
          )
          OR psr.student_id IN (
            SELECT u.student_id
            FROM public.users u
            WHERE u.user_id = (SELECT auth.uid())
              AND u.student_id IS NOT NULL
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- RPC: transactional replace for one publish scope (after client uploads files)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.replace_published_reports_for_scope(
  p_school_id uuid,
  p_class_id uuid,
  p_term integer,
  p_year integer,
  p_exam_set_id uuid,
  p_student_rows jsonb,
  p_bundle_storage_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  r jsonb;
  v_sid uuid;
  v_path text;
  v_expected text;
  v_bundle_expected text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_student_rows IS NULL OR jsonb_typeof(p_student_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_student_rows must be a JSON array';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_student_rows)
  LOOP
    v_sid := NULLIF(trim(r->> 'student_id'), '')::uuid;
    v_path := NULLIF(trim(r->> 'storage_object_path'), '');
    IF v_sid IS NULL OR v_path IS NULL OR v_path = '' THEN
      RAISE EXCEPTION 'each row needs student_id and storage_object_path';
    END IF;
    v_expected := format(
      'reports/%s/%s/%s_%s/%s/students/%s.pdf',
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id,
      v_sid
    );
    IF v_path <> v_expected THEN
      RAISE EXCEPTION 'invalid storage path for student %', v_sid;
    END IF;
  END LOOP;

  IF p_bundle_storage_path IS NOT NULL AND length(trim(p_bundle_storage_path)) > 0 THEN
    v_bundle_expected := format(
      'reports/%s/%s/%s_%s/%s/class_bundle.zip',
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id
    );
    IF trim(p_bundle_storage_path) <> v_bundle_expected THEN
      RAISE EXCEPTION 'invalid bundle storage path';
    END IF;
  END IF;

  DELETE FROM public.published_student_reports
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;

  DELETE FROM public.published_class_report_bundles
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;

  INSERT INTO public.published_student_reports (
    school_id,
    class_id,
    term,
    year,
    exam_set_id,
    student_id,
    storage_bucket,
    storage_object_path,
    published_by
  )
  SELECT
    p_school_id,
    p_class_id,
    p_term,
    p_year,
    p_exam_set_id,
    NULLIF(trim(r->> 'student_id'), '')::uuid,
    'published-reports',
    NULLIF(trim(r->> 'storage_object_path'), ''),
    v_uid
  FROM jsonb_array_elements(p_student_rows) AS r;

  IF p_bundle_storage_path IS NOT NULL AND length(trim(p_bundle_storage_path)) > 0 THEN
    INSERT INTO public.published_class_report_bundles (
      school_id,
      class_id,
      term,
      year,
      exam_set_id,
      storage_bucket,
      storage_object_path,
      published_by
    )
    VALUES (
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id,
      'published-reports',
      trim(p_bundle_storage_path),
      v_uid
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_published_reports_for_scope(
  uuid, uuid, integer, integer, uuid, jsonb, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.replace_published_reports_for_scope(
  uuid, uuid, integer, integer, uuid, jsonb, text
) TO authenticated;

COMMENT ON FUNCTION public.replace_published_reports_for_scope IS
  'After uploading PDFs to storage, replaces published_student_reports (and optional bundle row) for the scope in one transaction.';
