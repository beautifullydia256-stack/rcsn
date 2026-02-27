-- =============================================================================
-- Sync API: sync_pull and sync_push RPCs for offline-first clients.
-- See docs/SYNC_API.md. Requires auth.uid() and user school access.
-- =============================================================================

-- Helper: get school_id(s) the current user can access (from public.users).
CREATE OR REPLACE FUNCTION public.user_allowed_school_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.users
  WHERE user_id = auth.uid() AND school_id IS NOT NULL
  UNION
  SELECT s.school_id FROM public.schools s
  WHERE s.admin_id = auth.uid();
$$;

-- Pull: return all rows from synced tables for school_id since last_sync_timestamp.
-- Returns jsonb: { "ok": true, "data": { "schools": [...], "school_terms": [...], ... }, "server_timestamp": "..." }
CREATE OR REPLACE FUNCTION public.sync_pull(
  p_school_id uuid,
  p_last_sync_timestamp timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
  v_schools jsonb;
  v_school_terms jsonb;
  v_classes jsonb;
  v_students jsonb;
  v_teachers jsonb;
  v_exam_sets jsonb;
  v_exam_results jsonb;
  v_report_snapshots jsonb;
  v_data jsonb := '{}'::jsonb;
  v_ts timestamptz := now();
BEGIN
  -- Ensure user can access this school
  SELECT EXISTS (SELECT 1 FROM user_allowed_school_ids() AS s WHERE s = p_school_id) INTO v_allowed;
  IF NOT v_allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'School not allowed');
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_schools
  FROM (SELECT * FROM public.schools WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_school_terms
  FROM (SELECT * FROM public.school_terms WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_classes
  FROM (SELECT * FROM public.classes WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_students
  FROM (SELECT * FROM public.students WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_teachers
  FROM (SELECT * FROM public.teachers WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_exam_sets
  FROM (SELECT * FROM public.exam_sets WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_exam_results
  FROM (SELECT * FROM public.exam_results WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_report_snapshots
  FROM (SELECT * FROM public.report_snapshots WHERE school_id = p_school_id
        AND (p_last_sync_timestamp IS NULL OR updated_at > p_last_sync_timestamp)) t;

  v_data := jsonb_build_object(
    'schools', coalesce(v_schools, '[]'::jsonb),
    'school_terms', coalesce(v_school_terms, '[]'::jsonb),
    'classes', coalesce(v_classes, '[]'::jsonb),
    'students', coalesce(v_students, '[]'::jsonb),
    'teachers', coalesce(v_teachers, '[]'::jsonb),
    'exam_sets', coalesce(v_exam_sets, '[]'::jsonb),
    'exam_results', coalesce(v_exam_results, '[]'::jsonb),
    'report_snapshots', coalesce(v_report_snapshots, '[]'::jsonb)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'data', v_data,
    'server_timestamp', v_ts
  );
END;
$$;

COMMENT ON FUNCTION public.sync_pull(uuid, timestamptz) IS 'Offline-first sync: pull changes for school since last_sync_timestamp. Requires auth.';

-- Push: apply client payloads (last-write-wins). payloads = { "table_name": [ { row } ], ... }
CREATE OR REPLACE FUNCTION public.sync_push(
  p_device_id text,
  p_payloads jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_row jsonb;
  v_school_id uuid;
  v_allowed boolean;
  v_updated jsonb := '{}'::jsonb;
BEGIN
  -- Validate each row's school_id against user_allowed_school_ids
  FOR v_key IN SELECT jsonb_object_keys(p_payloads)
  LOOP
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_payloads -> v_key)
    LOOP
      v_school_id := (v_row ->> 'school_id')::uuid;
      IF v_school_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM user_allowed_school_ids() AS s WHERE s = v_school_id) INTO v_allowed;
        IF NOT v_allowed THEN
          RETURN jsonb_build_object('ok', false, 'error', 'School not allowed: ' || v_key);
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Apply payloads: for each table, upsert rows. (Simplified: only report_snapshots, report_snapshot_data, generated_reports for now.)
  -- Full implementation would loop over p_payloads and dynamic SQL per table.
  IF p_payloads ? 'report_snapshots' THEN
    INSERT INTO public.report_snapshots (id, school_id, term, year, exam_set_id, status, created_at, updated_at, version, device_id)
    SELECT
      (elem->>'id')::uuid,
      (elem->>'school_id')::uuid,
      (elem->>'term')::int,
      (elem->>'year')::int,
      (elem->>'exam_set_id')::uuid,
      coalesce(elem->>'status', 'draft'),
      coalesce((elem->>'created_at')::timestamptz, now()),
      now(),
      coalesce((elem->>'version')::int, 1) + 1,
      p_device_id
    FROM jsonb_array_elements(p_payloads -> 'report_snapshots') AS elem
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now(),
      version = report_snapshots.version + 1,
      device_id = p_device_id,
      status = EXCLUDED.status;
  END IF;

  IF p_payloads ? 'report_snapshot_data' THEN
    INSERT INTO public.report_snapshot_data (id, snapshot_id, student_id, class_name, subject, marks_obtained, total_marks, grade, average_percentage, aggregate, division, position, class_teacher_comment, headteacher_comment, attendance_percentage, fees_balance, fees_paid, frozen_data, created_at, updated_at, version, device_id)
    SELECT
      (elem->>'id')::uuid,
      (elem->>'snapshot_id')::uuid,
      (elem->>'student_id')::uuid,
      elem->>'class_name',
      elem->>'subject',
      (elem->>'marks_obtained')::numeric,
      (elem->>'total_marks')::numeric,
      elem->>'grade',
      (elem->>'average_percentage')::numeric,
      (elem->>'aggregate')::numeric,
      elem->>'division',
      (elem->>'position')::int,
      elem->>'class_teacher_comment',
      elem->>'headteacher_comment',
      (elem->>'attendance_percentage')::numeric,
      (elem->>'fees_balance')::numeric,
      (elem->>'fees_paid')::numeric,
      elem->>'frozen_data',
      coalesce((elem->>'created_at')::timestamptz, now()),
      now(),
      coalesce((elem->>'version')::int, 1) + 1,
      p_device_id
    FROM jsonb_array_elements(p_payloads -> 'report_snapshot_data') AS elem
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now(),
      version = report_snapshot_data.version + 1,
      device_id = p_device_id;
  END IF;

  IF p_payloads ? 'generated_reports' THEN
    INSERT INTO public.generated_reports (id, snapshot_id, student_id, template_id, report_data, pdf_url, generated_at, generated_by)
    SELECT
      (elem->>'id')::uuid,
      (elem->>'snapshot_id')::uuid,
      (elem->>'student_id')::uuid,
      (elem->>'template_id')::uuid,
      elem->>'report_data',
      elem->>'pdf_url',
      coalesce((elem->>'generated_at')::timestamptz, now()),
      auth.uid()
    FROM jsonb_array_elements(p_payloads -> 'generated_reports') AS elem
    ON CONFLICT (id) DO UPDATE SET
      report_data = EXCLUDED.report_data,
      pdf_url = EXCLUDED.pdf_url;
  END IF;

  RETURN jsonb_build_object('ok', true, 'updated', v_updated);
END;
$$;

COMMENT ON FUNCTION public.sync_push(text, jsonb) IS 'Offline-first sync: push local changes. Validates school access.';
