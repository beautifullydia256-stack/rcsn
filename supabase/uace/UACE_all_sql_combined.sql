-- =============================================================================
-- UACE (Senior 5–6) — ALL SCRIPTS IN ONE FILE FOR EASY OPENING
-- Source of truth for schema: ../migrations/20260602120000_uace_default_grade_server_exam_points.sql
-- If you edit behaviour, update that migration and re-copy here OR edit both.
--
-- HOW TO USE IN SUPABASE SQL EDITOR:
--   PART 1 — Run once to update database (functions + RPC + column + scale_kind).
--   PART 2 — Run after PART 1; expect 0 rows if grades match defaults.
--   PART 3 — Optional audit for primary-style grades (D1–F9) on A-Level classes.
-- =============================================================================


-- ##############################################################################
-- PART 1 — SCHEMA (apply once) — same as migrations/20260602120000_*.sql
-- ##############################################################################

-- UACE (Senior 5–6): server-side default % → grade + points; mirror TS calculateUacePrincipalGradeFromMarks.
-- @see docs/UACE_ALEVEL_GRADING_LOGIC.md

CREATE OR REPLACE FUNCTION public.uace_default_grade_from_percent(p_pct numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE
    WHEN p_pct >= 80 THEN 'A'
    WHEN p_pct >= 70 THEN 'B'
    WHEN p_pct >= 60 THEN 'C'
    WHEN p_pct >= 50 THEN 'D'
    WHEN p_pct >= 45 THEN 'E'
    WHEN p_pct >= 40 THEN 'O'
    ELSE 'F'
  END;
$$;

COMMENT ON FUNCTION public.uace_default_grade_from_percent(numeric) IS
  'Default UNEB-style UACE letter from subject % (0–100). Pair with app: reportUtils.calculateUacePrincipalGradeFromMarks. See docs/UACE_ALEVEL_GRADING_LOGIC.md.';

CREATE OR REPLACE FUNCTION public.uace_default_points_from_grade(p_grade text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(trim(COALESCE(p_grade, '')))
    WHEN 'A' THEN 6
    WHEN 'B' THEN 5
    WHEN 'C' THEN 4
    WHEN 'D' THEN 3
    WHEN 'E' THEN 2
    WHEN 'O' THEN 1
    WHEN 'F' THEN 0
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.uace_default_points_from_grade(text) IS
  'UACE points from letter grade (principal scale). See docs/UACE_ALEVEL_GRADING_LOGIC.md.';

ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS uace_points integer;

COMMENT ON COLUMN public.exam_results.uace_points IS
  'UACE points (0–6 principal grades; O=1, F=0) when grade was set via default bands; optional.';

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_alevel(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_marks_obtained numeric,
  p_total_marks numeric,
  p_grade text,
  p_remarks text,
  p_teacher_id uuid,
  p_teacher_comment text,
  p_paper_number text DEFAULT NULL,
  p_paper_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  v_topic_key text := '';
  v_paper_key text;
  v_grade text;
  v_points integer;
  v_pct numeric;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  v_grade := p_grade;
  v_points := public.uace_default_points_from_grade(p_grade);

  IF p_marks_obtained IS NOT NULL
     AND p_total_marks IS NOT NULL
     AND p_total_marks > 0 THEN
    v_pct := (p_marks_obtained / p_total_marks) * 100;
    v_grade := public.uace_default_grade_from_percent(v_pct);
    v_points := public.uace_default_points_from_grade(v_grade);
  END IF;

  SELECT er.id INTO result_id
  FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = v_topic_key
    AND er.exam_paper_key = v_paper_key;

  IF result_id IS NOT NULL THEN
    UPDATE public.exam_results
    SET
      marks_obtained = p_marks_obtained,
      total_marks = p_total_marks,
      grade = v_grade,
      uace_points = v_points,
      remarks = p_remarks,
      teacher_comment = p_teacher_comment,
      teacher_id = p_teacher_id::text,
      paper_code = NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      paper_number = NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      updated_at = now()
    WHERE id = result_id;

    RETURN json_build_object('success', true, 'action', 'updated', 'id', result_id);
  END IF;

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    uace_points,
    remarks,
    teacher_comment,
    teacher_id,
    paper_code,
    paper_number,
    nursery_skill_performance,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    v_grade,
    v_points,
    p_remarks,
    p_teacher_comment,
    p_teacher_id::text,
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO result_id;

  RETURN json_build_object('success', true, 'action', 'inserted', 'id', result_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text
) IS 'A-Level marks upsert; line key = paper_code/paper_number. Grade and uace_points derived from marks/total using default UACE bands when total > 0.';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'teacher_exam_grade_bands'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%scale_kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.teacher_exam_grade_bands DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.teacher_exam_grade_bands
  ADD CONSTRAINT teacher_exam_grade_bands_scale_kind_check
  CHECK (scale_kind IN ('primary', 'secondary', 'uace'));

COMMENT ON TABLE public.teacher_exam_grade_bands IS
  'Percentage → grade label bands for teacher exam entry. primary = D1–F9 style; secondary = O-Level A–E; uace = reserved for per-school A-Level % bands (future).';


-- ##############################################################################
-- PART 2 — VERIFY (read-only; needs PART 1 applied). Expect 0 rows if OK.
-- ##############################################################################

WITH senior56 AS (
  SELECT
    er.id,
    er.class_name,
    er.subject,
    er.student_id,
    er.marks_obtained,
    er.total_marks,
    er.grade,
    er.uace_points,
    (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100 AS pct
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
    AND er.marks_obtained IS NOT NULL
    AND coalesce(er.total_marks, 0) > 0
)
SELECT
  s.id,
  s.class_name,
  s.subject,
  s.student_id,
  round(s.pct::numeric, 4) AS percent,
  s.grade AS grade_stored,
  public.uace_default_grade_from_percent(s.pct) AS grade_expected,
  s.uace_points AS points_stored,
  public.uace_default_points_from_grade(s.grade) AS points_from_stored_grade
FROM senior56 s
WHERE upper(trim(coalesce(s.grade, ''))) IS DISTINCT FROM public.uace_default_grade_from_percent(s.pct)
   OR s.uace_points IS DISTINCT FROM public.uace_default_points_from_grade(s.grade)
ORDER BY s.class_name, s.subject, s.student_id
LIMIT 500;


-- ##############################################################################
-- PART 3 — AUDIT optional (primary-style D1–F9 on Senior 5–6)
-- ##############################################################################

WITH senior56 AS (
  SELECT
    er.*,
    (coalesce(er.marks_obtained::numeric, 0) / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100 AS pct
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
),
annotated AS (
  SELECT
    s.*,
    CASE
      WHEN s.pct >= 80 THEN 'A'
      WHEN s.pct >= 70 THEN 'B'
      WHEN s.pct >= 60 THEN 'C'
      WHEN s.pct >= 50 THEN 'D'
      WHEN s.pct >= 45 THEN 'E'
      WHEN s.pct >= 40 THEN 'O'
      ELSE 'F'
    END AS uace_grade_from_marks
  FROM senior56 s
)
SELECT
  class_name,
  subject,
  student_id,
  marks_obtained,
  coalesce(nullif(total_marks, 0), 100) AS total_marks,
  round(pct::numeric, 2) AS percent,
  grade AS grade_stored,
  uace_grade_from_marks AS grade_expected_uace
FROM annotated
WHERE coalesce(trim(grade), '') <> ''
  AND (
    grade ~* '^(D[12]|C[34]|C[56]|P[78]|F9)\b'
    OR grade ~* 'division|credit|pass [0-9]'
    OR upper(trim(grade)) IS DISTINCT FROM uace_grade_from_marks
  )
ORDER BY class_name, subject, student_id
LIMIT 500;
