-- Partial publish: update only the students in p_student_rows without deleting other
-- published rows for the same class/term/exam. Removes stale class ZIP metadata.
-- Used when staff publishes one student from "Single Student" report mode.

CREATE OR REPLACE FUNCTION public.patch_published_reports_for_students(
  p_school_id uuid,
  p_class_id uuid,
  p_term integer,
  p_year integer,
  p_exam_set_id uuid,
  p_student_rows jsonb
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

  FOR r IN SELECT * FROM jsonb_array_elements(p_student_rows)
  LOOP
    v_sid := NULLIF(trim(r->> 'student_id'), '')::uuid;
    DELETE FROM public.published_student_reports
    WHERE school_id = p_school_id
      AND class_id = p_class_id
      AND term = p_term
      AND year = p_year
      AND exam_set_id = p_exam_set_id
      AND student_id = v_sid;
  END LOOP;

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

  DELETE FROM public.published_class_report_bundles
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_published_reports_for_students(
  uuid, uuid, integer, integer, uuid, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.patch_published_reports_for_students(
  uuid, uuid, integer, integer, uuid, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.patch_published_reports_for_students IS
  'After uploading PDFs for a subset of students, upserts only those rows and invalidates the class ZIP record. Does not remove other students'' published rows.';
