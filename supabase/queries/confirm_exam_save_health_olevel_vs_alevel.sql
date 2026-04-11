-- =============================================================================
-- Run in Supabase SQL Editor. Paste ALL results (or export JSON) for review.
--
-- Part1 — One summary row per track: O-Level (Senior 1–4) vs A-Level (Senior 5–6)
-- Part 2 — Sample rows per track (up to 15 each); column meanings:
--          docs/EXAM_RESULTS_HOW_SAVES_WORK.md
--
-- Expect: Part 1 olevl_*_bad and alevl_*_bad all 0 when data matches intended rules.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART 1: Summary
-- ---------------------------------------------------------------------------
WITH
olevel_lines AS (
  SELECT er.*
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
    AND (
      coalesce(er.activity_score, 0) <> 0
      OR coalesce(er.formative_score, 0) <> 0
      OR coalesce(er.exam_score, 0) <> 0
      OR coalesce(er.final_score, 0) <> 0
      OR coalesce(trim(er.topic), '') <> ''
    )
),
olevel_x AS (
  SELECT
    o.*,
    CASE
      WHEN coalesce(o.activity_score, 0) < 1 THEN 'Basic'
      WHEN coalesce(o.activity_score, 0) < 2.5 THEN 'Moderate'
      ELSE 'Outstanding'
    END AS expected_descriptor,
    (coalesce(o.formative_score, 0) + coalesce(o.exam_score, 0)) AS sum_fe,
    CASE
      WHEN floor(coalesce(o.final_score, 0)) >= 80 THEN 'A'
      WHEN floor(coalesce(o.final_score, 0)) >= 70 THEN 'B'
      WHEN floor(coalesce(o.final_score, 0)) >= 60 THEN 'C'
      WHEN floor(coalesce(o.final_score, 0)) >= 50 THEN 'D'
      ELSE 'E'
    END AS expected_grade_ae
  FROM olevel_lines o
),
alevel_lines AS (
  SELECT er.*
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
    AND er.marks_obtained IS NOT NULL
    AND coalesce(er.total_marks, 0) > 0
)
SELECT
  (SELECT count(*) FROM olevel_lines)::bigint AS olevl_row_count,
  (SELECT count(*) FROM olevel_x WHERE coalesce(final_score, 0) > 0 AND coalesce(marks_obtained, -1) IS DISTINCT FROM coalesce(final_score, -2))::bigint
    AS olevl_marks_ne_final_bad,
  (SELECT count(*) FROM olevel_x WHERE coalesce(final_score, 0) > 0 AND total_marks IS DISTINCT FROM 100)::bigint
    AS olevl_total_not_100_bad,
  (SELECT count(*) FROM olevel_x WHERE abs(coalesce(final_score, 0) - coalesce(sum_fe, 0)) > 0.0001)::bigint
    AS olevl_final_ne_sum_formative_exam_bad,
  (SELECT count(*) FROM olevel_x WHERE coalesce(trim(descriptor), '') IS DISTINCT FROM expected_descriptor)::bigint
    AS olevl_descriptor_bad,
  (SELECT count(*) FROM olevel_x WHERE coalesce(final_score, 0) > 0 AND coalesce(trim(grade), '') <> '' AND coalesce(trim(grade), '') IS DISTINCT FROM expected_grade_ae)::bigint
    AS olevl_grade_ne_default_ae_bad,
  (SELECT count(*) FROM alevel_lines)::bigint AS alevl_scored_row_count,
  (SELECT count(*) FROM alevel_lines al WHERE upper(trim(coalesce(al.grade, ''))) IS DISTINCT FROM public.uace_default_grade_from_percent(
    (al.marks_obtained::numeric / nullif(coalesce(nullif(al.total_marks, 0), 100), 0)) * 100
  ))::bigint AS alevl_grade_ne_uace_bad,
  (SELECT count(*) FROM alevel_lines al WHERE al.uace_points IS DISTINCT FROM public.uace_default_points_from_grade(al.grade))::bigint
    AS alevl_points_ne_grade_bad;

-- ---------------------------------------------------------------------------
-- PART 2: Samples (comment out if you only want Part 1)
-- ---------------------------------------------------------------------------
(
  SELECT
    'olevel'::text AS track,
    er.id,
    er.class_name,
    er.subject,
    er.student_id,
    er.topic,
    er.activity_score,
    er.descriptor,
    er.formative_score,
    er.exam_score,
    er.final_score,
    er.marks_obtained,
    er.total_marks,
    er.grade,
    er.exam_topic_key,
    er.exam_paper_key
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
    AND coalesce(er.final_score, 0) > 0
  ORDER BY er.updated_at DESC NULLS LAST
  LIMIT 15
)
UNION ALL
(
  SELECT
    'alevel'::text AS track,
    er.id,
    er.class_name,
    er.subject,
    er.student_id,
    er.topic,
    er.activity_score,
    er.descriptor,
    er.formative_score,
    er.exam_score,
    er.final_score,
    er.marks_obtained,
    er.total_marks,
    er.grade,
    er.exam_topic_key,
    er.exam_paper_key
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
    AND er.marks_obtained IS NOT NULL
    AND coalesce(er.total_marks, 0) > 0
  ORDER BY er.updated_at DESC NULLS LAST
  LIMIT 15
);
