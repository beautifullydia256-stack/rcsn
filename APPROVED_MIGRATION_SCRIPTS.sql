-- ============================================================================
-- APPROVED MIGRATION SCRIPTS FOR NURSERY OLD FORMAT
-- ============================================================================
-- BACKWARD COMPATIBLE - Existing Latest format continues working
-- Execute migration-by-migration with validation after each step
-- ============================================================================

-- ============================================================================
-- Migration 1 — Add nursery_report_format to both tables (safe defaults)
-- ============================================================================
BEGIN;

-- 1) exam_results
ALTER TABLE public.exam_results
ADD COLUMN IF NOT EXISTS nursery_report_format varchar(20);

ALTER TABLE public.exam_results
ALTER COLUMN nursery_report_format SET DEFAULT 'latest';

UPDATE public.exam_results
SET nursery_report_format = 'latest'
WHERE nursery_report_format IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_exam_results_nursery_format'
      AND conrelid = 'public.exam_results'::regclass
  ) THEN
    ALTER TABLE public.exam_results
    ADD CONSTRAINT check_exam_results_nursery_format
    CHECK (nursery_report_format IN ('latest', 'old'));
  END IF;
END $$;

COMMENT ON COLUMN public.exam_results.nursery_report_format IS
'Format type for nursery reports: latest (holistic ratings - default) or old (marks-based).';

CREATE INDEX IF NOT EXISTS idx_exam_results_nursery_format
ON public.exam_results (nursery_report_format)
WHERE nursery_report_format IS NOT NULL;

-- 2) processed_primary_exam_results
ALTER TABLE public.processed_primary_exam_results
ADD COLUMN IF NOT EXISTS nursery_report_format varchar(20);

ALTER TABLE public.processed_primary_exam_results
ALTER COLUMN nursery_report_format SET DEFAULT 'latest';

UPDATE public.processed_primary_exam_results
SET nursery_report_format = 'latest'
WHERE nursery_report_format IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_processed_nursery_format'
      AND conrelid = 'public.processed_primary_exam_results'::regclass
  ) THEN
    ALTER TABLE public.processed_primary_exam_results
    ADD CONSTRAINT check_processed_nursery_format
    CHECK (nursery_report_format IN ('latest', 'old'));
  END IF;
END $$;

COMMENT ON COLUMN public.processed_primary_exam_results.nursery_report_format IS
'Format type for nursery reports: latest (holistic ratings - default) or old (marks-based).';

CREATE INDEX IF NOT EXISTS idx_processed_nursery_format
ON public.processed_primary_exam_results (nursery_report_format)
WHERE nursery_report_format IS NOT NULL;

-- Ensure processed table has percentage column for old-format reporting
ALTER TABLE public.processed_primary_exam_results
ADD COLUMN IF NOT EXISTS percentage numeric;

COMMIT;

-- Check after Migration 1
SELECT 'exam_results' AS table_name, nursery_report_format, count(*)
FROM public.exam_results
GROUP BY nursery_report_format
UNION ALL
SELECT 'processed_primary_exam_results' AS table_name, nursery_report_format, count(*)
FROM public.processed_primary_exam_results
GROUP BY nursery_report_format;

-- ============================================================================
-- Migration 2 — Update teacher_upsert_exam_result_primary (backward-compatible)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_primary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_marks_obtained numeric,
  p_total_marks numeric,
  p_grade text,
  p_remarks text,
  p_teacher_id text,
  p_teacher_comment text DEFAULT NULL::text,
  p_nursery_skills jsonb DEFAULT NULL::jsonb,
  p_nursery_report_format text DEFAULT 'latest'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guard text;
  v_new_id uuid;
  v_is_nursery boolean;
  v_effective_format text;
  v_percentage numeric;
  v_final_grade text;
  v_existing_format text;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;

  IF p_class_name IS NULL OR p_subject IS NULL THEN
    RAISE EXCEPTION 'Class name and subject cannot be null';
  END IF;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  IF v_guard IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', v_guard);
  END IF;

  v_is_nursery := lower(coalesce(p_class_name, '')) SIMILAR TO '%(baby|nursery|pre-primary)%';

  -- Format handling
  IF v_is_nursery THEN
    v_effective_format := coalesce(p_nursery_report_format, 'latest');

    IF v_effective_format NOT IN ('latest', 'old') THEN
      RAISE EXCEPTION 'Invalid nursery_report_format. Must be latest or old';
    END IF;

    -- no-mix rule per student + exam_set (strictest)
    SELECT x.nursery_report_format
      INTO v_existing_format
    FROM (
      SELECT er.nursery_report_format
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND er.nursery_report_format IS NOT NULL
      UNION
      SELECT pr.nursery_report_format
      FROM public.processed_primary_exam_results pr
      WHERE pr.school_id = p_school_id
        AND pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND pr.nursery_report_format IS NOT NULL
    ) x
    LIMIT 1;

    IF v_existing_format IS NOT NULL AND v_existing_format <> v_effective_format THEN
      RAISE EXCEPTION 'Cannot mix formats for same student and exam set. Existing format: %, attempted: %',
        v_existing_format, v_effective_format;
    END IF;

    IF v_effective_format = 'old' THEN
      -- old format validation + calculation
      IF p_total_marks IS NULL OR p_total_marks <= 0 THEN
        p_total_marks := 100;
      END IF;

      IF p_marks_obtained IS NOT NULL AND (p_marks_obtained < 0 OR p_marks_obtained > p_total_marks) THEN
        RAISE EXCEPTION 'marks_obtained must be between 0 and total_marks';
      END IF;

      IF p_marks_obtained IS NOT NULL THEN
        v_percentage := (p_marks_obtained / p_total_marks) * 100;

        -- compute grade in-function (keeps this migration independent)
        v_final_grade := CASE
          WHEN v_percentage >= 90 THEN 'D1'
          WHEN v_percentage >= 80 THEN 'D2'
          WHEN v_percentage >= 70 THEN 'C3'
          WHEN v_percentage >= 60 THEN 'C4'
          WHEN v_percentage >= 50 THEN 'C5'
          WHEN v_percentage >= 40 THEN 'C6'
          WHEN v_percentage >= 30 THEN 'P7'
          WHEN v_percentage >= 20 THEN 'P8'
          ELSE 'F9'
        END;
      ELSE
        v_percentage := NULL;
        v_final_grade := NULL;
      END IF;

      -- enforce separation
      p_nursery_skills := NULL;

    ELSE
      -- latest format: silently null old-format fields
      p_marks_obtained := NULL;
      p_total_marks := NULL;
      v_percentage := NULL;
      v_final_grade := NULL;
      p_remarks := NULL;
      p_teacher_comment := NULL;
    END IF;

  ELSE
    -- non-nursery unchanged behavior
    v_effective_format := NULL;
    v_percentage := NULL;
    v_final_grade := p_grade;
  END IF;

  -- Existing delete+insert pattern preserved
  DELETE FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = ''
    AND er.exam_paper_key = '';

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    remarks,
    teacher_id,
    overall_remark,
    nursery_skill_performance,
    nursery_report_format,
    created_at,
    updated_at
  )
  VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    COALESCE(v_final_grade, p_grade),
    p_remarks,
    p_teacher_id,
    p_teacher_comment,
    COALESCE(p_nursery_skills, '{}'::jsonb),
    v_effective_format,
    now(),
    now()
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object(
    'success', true,
    'action', 'replaced',
    'id', v_new_id,
    'format', v_effective_format,
    'message', 'Exam result saved successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Check after Migration 2
SELECT p.oid::regprocedure::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname='teacher_upsert_exam_result_primary';

-- ============================================================================
-- Migration 3 — Create grade helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_nursery_old_format_grade(
  p_percentage numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF p_percentage IS NULL THEN
    RETURN NULL;
  ELSIF p_percentage >= 90 THEN
    RETURN 'D1';
  ELSIF p_percentage >= 80 THEN
    RETURN 'D2';
  ELSIF p_percentage >= 70 THEN
    RETURN 'C3';
  ELSIF p_percentage >= 60 THEN
    RETURN 'C4';
  ELSIF p_percentage >= 50 THEN
    RETURN 'C5';
  ELSIF p_percentage >= 40 THEN
    RETURN 'C6';
  ELSIF p_percentage >= 30 THEN
    RETURN 'P7';
  ELSIF p_percentage >= 20 THEN
    RETURN 'P8';
  ELSE
    RETURN 'F9';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.calculate_nursery_old_format_grade(numeric) TO authenticated;

-- Check after Migration 3
SELECT public.calculate_nursery_old_format_grade(85) AS grade_85;

-- ============================================================================
-- Migration 4 — Create get_nursery_report_data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_nursery_report_data(
  p_student_id uuid,
  p_exam_set_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_format text;
  v_class_name text;
  v_school_id uuid;
  v_results jsonb;
  v_average_percentage numeric;
  v_class_teacher_comment text;
  v_headteacher_comment text;
BEGIN
  SELECT s.current_class, s.school_id
    INTO v_class_name, v_school_id
  FROM public.students s
  WHERE s.student_id = p_student_id;

  SELECT pr.nursery_report_format
    INTO v_format
  FROM public.processed_primary_exam_results pr
  WHERE pr.student_id = p_student_id
    AND pr.exam_set_id = p_exam_set_id
    AND pr.nursery_report_format IS NOT NULL
  LIMIT 1;

  v_format := COALESCE(v_format, 'latest');

  IF v_format = 'old' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', pr.subject,
        'marks_obtained', pr.marks_obtained,
        'total_marks', pr.total_marks,
        'percentage', pr.percentage,
        'grade', pr.grade,
        'remark', pr.teacher_remark,
        'teacher_initials', pr.teacher_initials
      )
      ORDER BY pr.subject
    )
    INTO v_results
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND pr.nursery_report_format = 'old'
      AND lower(pr.subject) NOT LIKE '%gen%'
      AND lower(pr.subject) NOT LIKE '%knowledge%';

    SELECT AVG(pr.percentage)
      INTO v_average_percentage
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND pr.nursery_report_format = 'old'
      AND pr.percentage IS NOT NULL
      AND lower(pr.subject) NOT LIKE '%gen%'
      AND lower(pr.subject) NOT LIKE '%knowledge%';

    SELECT c.comment_text
      INTO v_class_teacher_comment
    FROM public.class_teacher_comments_settings c
    WHERE c.school_id = v_school_id
      AND c.class_name = v_class_name
      AND v_average_percentage >= c.min_percent
      AND v_average_percentage <= c.max_percent
    ORDER BY c.min_percent DESC
    LIMIT 1;

    SELECT h.comment_text
      INTO v_headteacher_comment
    FROM public.headteacher_comments_settings h
    WHERE h.school_id = v_school_id
      AND v_average_percentage >= h.min_percent
      AND v_average_percentage <= h.max_percent
    ORDER BY h.min_percent DESC
    LIMIT 1;

  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', pr.subject,
        'nursery_skill_performance', pr.nursery_skill_performance
      )
      ORDER BY pr.subject
    )
    INTO v_results
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND COALESCE(pr.nursery_report_format, 'latest') = 'latest';

    SELECT pr.class_teacher_comment, pr.headteacher_comment
      INTO v_class_teacher_comment, v_headteacher_comment
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND COALESCE(pr.nursery_report_format, 'latest') = 'latest'
    LIMIT 1;
  END IF;

  v_result := jsonb_build_object(
    'format', v_format,
    'results', COALESCE(v_results, '[]'::jsonb),
    'average_percentage', v_average_percentage,
    'class_teacher_comment', COALESCE(v_class_teacher_comment, 'Good progress. Keep it up.'),
    'headteacher_comment', COALESCE(v_headteacher_comment, 'Approved.'),
    'class_name', v_class_name
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'format', 'latest',
      'results', '[]'::jsonb
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_nursery_report_data(uuid, uuid) TO authenticated;

-- Check after Migration 4
SELECT p.oid::regprocedure::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname='get_nursery_report_data';

-- ============================================================================
-- Migration 5 — Create generate_nursery_report_data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_nursery_report_data(
  p_student_id uuid,
  p_exam_set_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_data jsonb;
  v_nursery_data jsonb;
  v_school_data jsonb;
  v_exam_set_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student_id', s.student_id,
    'name', s.name,
    'admission_number', s.admission_number,
    'current_class', s.current_class,
    'stream', s.stream,
    'school_id', s.school_id
  )
  INTO v_student_data
  FROM public.students s
  WHERE s.student_id = p_student_id;

  v_nursery_data := public.get_nursery_report_data(p_student_id, p_exam_set_id);

  SELECT jsonb_build_object(
    'name', sc.name,
    'subtitle', sc.subtitle,
    'address', sc.address,
    'pobox', sc.pobox,
    'contact_email', sc.contact_email,
    'contact_phone', sc.contact_phone,
    'motto', sc.motto,
    'logo_url', sc.logo_url,
    'header_school_name_color', sc.header_school_name_color,
    'header_subtitle_color', sc.header_subtitle_color,
    'header_address_color', sc.header_address_color,
    'header_contact_color', sc.header_contact_color,
    'header_motto_color', sc.header_motto_color
  )
  INTO v_school_data
  FROM public.schools sc
  WHERE sc.school_id = (v_student_data->>'school_id')::uuid;

  SELECT jsonb_build_object(
    'exam_set_id', es.exam_set_id,
    'name', es.name,
    'term', es.term,
    'year', es.year,
    'date', es.date
  )
  INTO v_exam_set_data
  FROM public.exam_sets es
  WHERE es.exam_set_id = p_exam_set_id;

  RETURN jsonb_build_object(
    'student', v_student_data,
    'school', v_school_data,
    'examSet', v_exam_set_data,
    'nurseryData', v_nursery_data,
    'format', v_nursery_data->>'format',
    'results', v_nursery_data->'results',
    'comments', jsonb_build_object(
      'class_teacher_text', v_nursery_data->>'class_teacher_comment',
      'head_teacher_text', v_nursery_data->>'headteacher_comment'
    ),
    'summary', jsonb_build_object(
      'averagePercentage', v_nursery_data->>'average_percentage'
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_nursery_report_data(uuid, uuid) TO authenticated;

-- Check after Migration 5
SELECT p.oid::regprocedure::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname='generate_nursery_report_data';

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
