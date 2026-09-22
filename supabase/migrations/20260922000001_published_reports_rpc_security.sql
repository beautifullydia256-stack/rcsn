-- =============================================================================
-- Migration: 20260922000001_published_reports_rpc_security.sql
-- Description:
-- Fix [42501] "query would be affected by row-level security policy for table users"
-- when publishing student reports.
--
-- Root Cause:
-- Migration 20260726000003 converted `patch_published_reports_for_students` and
-- `replace_published_reports_for_scope` to SECURITY INVOKER without resetting the
-- `SET row_security = off` clause configured on the original functions.
-- When a non-superuser calls a SECURITY INVOKER function having row_security=off,
-- PostgreSQL raises error 42501 if any query touches a table with RLS enabled
-- (such as `users` in `published_reports_user_is_school_staff`).
--
-- Fix:
-- 1. Restore `published_reports_user_is_school_staff` as SECURITY DEFINER with
--    explicit search_path to securely verify staff membership without RLS interference.
-- 2. Restore `patch_published_reports_for_students` and `replace_published_reports_for_scope`
--    as SECURITY DEFINER with `SET search_path = public` and explicit `RESET row_security`.
-- 3. Grant EXECUTE to authenticated users.
-- 4. Add missing RLS policies on `published_class_report_bundles` for defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper: published_reports_user_is_school_staff (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.published_reports_user_is_school_staff(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND (
        (u.school_id IS NOT NULL AND u.school_id = p_school_id AND lower(trim(u.role::text)) IN (
          'admin',
          'accountant',
          'teacher',
          'head_teacher',
          'director_of_studies',
          'dos',
          'bursar',
          'secretary',
          'nurse',
          'matron',
          'warden',
          'librarian',
          'lab_technician',
          'security_guard',
          'deputy_head_teacher',
          'deputy_principal',
          'principal',
          'super_admin'
        ))
        OR lower(trim(u.role::text)) = 'owner'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.published_reports_user_is_school_staff(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. RPC: patch_published_reports_for_students (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
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
AS $$
DECLARE
  r jsonb;
  v_sid uuid;
  v_path text;
  v_expected text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden: caller is not authorized school staff' USING ERRCODE = '42501';
  END IF;

  IF p_student_rows IS NULL OR jsonb_typeof(p_student_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_student_rows must be a JSON array';
  END IF;

  -- Validate storage paths
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

  -- Remove existing published rows for these specific students
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

  -- Insert the newly published report rows
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

  -- Remove stale full-class bundle metadata
  DELETE FROM public.published_class_report_bundles
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;
END;
$$;

ALTER FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) SECURITY DEFINER;
ALTER FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) RESET row_security;

GRANT EXECUTE ON FUNCTION public.patch_published_reports_for_students(
  uuid, uuid, integer, integer, uuid, jsonb
) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. RPC: replace_published_reports_for_scope (SECURITY DEFINER)
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
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden: caller is not authorized school staff' USING ERRCODE = '42501';
  END IF;

  IF p_student_rows IS NULL OR jsonb_typeof(p_student_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_student_rows must be a JSON array';
  END IF;

  -- Validate storage paths
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

ALTER FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) SECURITY DEFINER;
ALTER FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) SET search_path = public;
ALTER FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) RESET row_security;

GRANT EXECUTE ON FUNCTION public.replace_published_reports_for_scope(
  uuid, uuid, integer, integer, uuid, jsonb, text
) TO authenticated;


-- -----------------------------------------------------------------------------
-- 4. RLS Parity for published_class_report_bundles
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_class_report_bundles' AND policyname='published_class_report_bundles_select_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_class_report_bundles_select_school_staff ON public.published_class_report_bundles AS PERMISSIVE FOR SELECT TO authenticated USING (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_class_report_bundles' AND policyname='published_class_report_bundles_insert_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_class_report_bundles_insert_school_staff ON public.published_class_report_bundles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_class_report_bundles' AND policyname='published_class_report_bundles_delete_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_class_report_bundles_delete_school_staff ON public.published_class_report_bundles AS PERMISSIVE FOR DELETE TO authenticated USING (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
END $$;
