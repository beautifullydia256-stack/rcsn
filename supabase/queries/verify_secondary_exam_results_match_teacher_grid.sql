-- =============================================================================
-- Secondary O-Level exam grid vs public.exam_results (teacher save path)
-- Run the WHOLE file in Supabase SQL Editor (one batch). Edit params once below.
--
-- Teacher UI columns (e.g. Senior 1) map to DB roughly as:
--   Topic              → exam_results.topic  (exam_topic_key is GENERATED from topic)
--   Activity [3]       → activity_score
--   Descriptor         → descriptor (app derives from activity: see expected_descriptor)
--   Formative [20%]    → formative_score
--   Exam [80%]         → exam_score
--   Final [100%]       → final_score
--   Grade              → grade
--   Remark             → overall_remark
--   Initials           → teacher_initials
--
-- After migration 20260527120000: marks_obtained = final_score, total_marks = 100.
-- =============================================================================

-- 0) Edit filters here only (used for sections A–B and D).
DROP TABLE IF EXISTS _pweza_audit_secondary_exam_annotated;
CREATE TEMP TABLE _pweza_audit_secondary_exam_annotated AS
WITH params AS (
  SELECT
    NULL::uuid AS school_id,           -- set your school uuid or leave NULL for all schools
    'Senior 1'::text AS class_name,    -- must match grid class name
    NULL::text AS subject,             -- e.g. 'Mathematics', or NULL = all subjects
    NULL::uuid AS exam_set_id          -- optional filter
),
candidates AS (
  SELECT er.*
  FROM public.exam_results er
  CROSS JOIN params p
  WHERE er.class_name IS NOT NULL
    AND trim(er.class_name) = trim(p.class_name)
    AND (p.school_id IS NULL OR er.school_id = p.school_id)
    AND (p.subject IS NULL OR trim(er.subject) = trim(p.subject))
    AND (p.exam_set_id IS NULL OR er.exam_set_id = p.exam_set_id)
    AND (
      er.activity_score IS NOT NULL
      OR er.descriptor IS NOT NULL
      OR er.formative_score IS NOT NULL
      OR er.exam_score IS NOT NULL
      OR coalesce(trim(er.topic), '') <> ''
    )
)
SELECT
  c.id,
  c.school_id,
  c.exam_set_id,
  c.student_id,
  c.class_name,
  c.subject,
  c.topic,
  c.exam_topic_key,
  c.exam_paper_key,
  c.activity_score,
  c.descriptor,
  c.formative_score,
  c.exam_score,
  c.final_score,
  c.marks_obtained,
  c.total_marks,
  c.grade,
  c.overall_remark,
  c.teacher_initials,
  c.updated_at,
  CASE
    WHEN coalesce(c.activity_score, 0) < 1 THEN 'Basic'
    WHEN coalesce(c.activity_score, 0) < 2.5 THEN 'Moderate'
    ELSE 'Outstanding'
  END AS expected_descriptor,
  (coalesce(c.formative_score, 0) + coalesce(c.exam_score, 0)) AS sum_formative_exam,
  floor(coalesce(c.final_score, 0))::int AS final_floor,
  CASE
    WHEN floor(coalesce(c.final_score, 0)) >= 80 THEN 'A'
    WHEN floor(coalesce(c.final_score, 0)) >= 70 THEN 'B'
    WHEN floor(coalesce(c.final_score, 0)) >= 60 THEN 'C'
    WHEN floor(coalesce(c.final_score, 0)) >= 50 THEN 'D'
    ELSE 'E'
  END AS expected_grade_default_bands
FROM candidates c;

-- A) Raw sample
SELECT
  'SAMPLE_RAW' AS section,
  class_name,
  subject,
  topic AS "Topic",
  activity_score AS "Activity_3",
  descriptor AS "Descriptor_DB",
  expected_descriptor AS "Descriptor_expected",
  formative_score AS "Formative_20",
  exam_score AS "Exam_80",
  final_score AS "Final_100",
  sum_formative_exam AS "formative_plus_exam",
  marks_obtained,
  total_marks,
  grade AS "Grade_DB",
  expected_grade_default_bands AS "Grade_expected_default_AE",
  overall_remark AS "Remark",
  teacher_initials AS "Initials",
  updated_at
FROM _pweza_audit_secondary_exam_annotated
ORDER BY updated_at DESC NULLS LAST
LIMIT 80;

-- B) Inconsistencies (each query is independent; all read the temp table)
SELECT
  'ISSUE_marks_not_final' AS issue,
  id,
  class_name,
  subject,
  topic,
  final_score,
  marks_obtained,
  total_marks
FROM _pweza_audit_secondary_exam_annotated
WHERE coalesce(marks_obtained, -1) IS DISTINCT FROM coalesce(final_score, -1)
   OR (total_marks IS NOT NULL AND total_marks <> 100 AND coalesce(final_score, 0) <> 0);

SELECT
  'ISSUE_final_not_sum_formative_exam' AS issue,
  id,
  class_name,
  subject,
  topic,
  formative_score,
  exam_score,
  final_score,
  sum_formative_exam,
  abs(coalesce(final_score, 0) - coalesce(sum_formative_exam, 0)) AS delta
FROM _pweza_audit_secondary_exam_annotated
WHERE abs(coalesce(final_score, 0) - coalesce(sum_formative_exam, 0)) > 0.0001;

SELECT
  'ISSUE_descriptor_not_from_activity' AS issue,
  id,
  class_name,
  subject,
  topic,
  activity_score,
  descriptor,
  expected_descriptor
FROM _pweza_audit_secondary_exam_annotated
WHERE coalesce(descriptor, '') IS DISTINCT FROM expected_descriptor;

SELECT
  'ISSUE_grade_not_default_AE_bands' AS issue,
  id,
  class_name,
  subject,
  topic,
  final_floor,
  grade,
  expected_grade_default_bands,
  'If you use per-subject bands in teacher_exam_grade_bands, default A–E may differ — section C.' AS note
FROM _pweza_audit_secondary_exam_annotated
WHERE coalesce(trim(grade), '') <> coalesce(expected_grade_default_bands, '')
  AND coalesce(final_score, 0) > 0;

-- C) Grade vs teacher_exam_grade_bands (duplicate params — keep same values as step 0)
WITH params AS (
  SELECT
    NULL::uuid AS school_id,
    'Senior 1'::text AS class_name,
    NULL::text AS subject,
    NULL::uuid AS exam_set_id
),
candidates AS (
  SELECT er.*
  FROM public.exam_results er
  CROSS JOIN params p
  WHERE trim(er.class_name) = trim(p.class_name)
    AND (p.school_id IS NULL OR er.school_id = p.school_id)
    AND (p.subject IS NULL OR trim(er.subject) = trim(p.subject))
    AND (p.exam_set_id IS NULL OR er.exam_set_id = p.exam_set_id)
    AND coalesce(er.final_score, 0) > 0
),
with_band AS (
  SELECT
    c.id,
    c.school_id,
    c.class_name,
    c.subject,
    floor(coalesce(c.final_score, 0))::int AS pct,
    c.grade AS grade_in_row,
    (
      SELECT b.grade_label
      FROM public.teacher_exam_grade_bands b
      WHERE b.school_id = c.school_id
        AND trim(b.class_name) = trim(c.class_name)
        AND trim(b.subject) = trim(c.subject)
        AND b.scale_kind = 'secondary'
        AND floor(coalesce(c.final_score, 0))::int BETWEEN b.min_percent AND b.max_percent
      ORDER BY b.sort_order, b.min_percent DESC
      LIMIT 1
    ) AS grade_from_school_bands
  FROM candidates c
)
SELECT
  'ISSUE_grade_vs_teacher_exam_grade_bands' AS issue,
  id,
  class_name,
  subject,
  pct AS final_percent_floor,
  grade_in_row,
  grade_from_school_bands
FROM with_band
WHERE grade_from_school_bands IS NOT NULL
  AND upper(trim(coalesce(grade_in_row, ''))) IS DISTINCT FROM upper(trim(grade_from_school_bands));

-- D) Mirror: exam_results vs processed_secondary_exam_results (match params to step 0)
SELECT
  'ISSUE_processed_mirror_mismatch' AS issue,
  er.id AS exam_results_id,
  er.class_name,
  er.subject,
  er.topic,
  er.exam_topic_key,
  er.exam_paper_key,
  er.final_score AS er_final,
  er.marks_obtained AS er_marks_obtained,
  ps.marks_obtained AS ps_marks_obtained,
  er.grade AS er_grade,
  ps.grade AS ps_grade,
  coalesce(trim(er.overall_remark), '') AS er_remark,
  coalesce(trim(ps.teacher_remark), '') AS ps_teacher_remark
FROM public.exam_results er
LEFT JOIN public.processed_secondary_exam_results ps
  ON ps.school_id = er.school_id
 AND ps.exam_set_id = er.exam_set_id
 AND ps.student_id = er.student_id
 AND trim(ps.subject) = trim(er.subject)
 AND ps.proc_topic_key = er.exam_topic_key
 AND ps.proc_paper_key = er.exam_paper_key
CROSS JOIN (
  SELECT NULL::uuid AS school_id, 'Senior 1'::text AS class_name, NULL::text AS subject, NULL::uuid AS exam_set_id
) p
WHERE trim(er.class_name) = trim(p.class_name)
  AND (p.school_id IS NULL OR er.school_id = p.school_id)
  AND (p.subject IS NULL OR trim(er.subject) = trim(p.subject))
  AND (p.exam_set_id IS NULL OR er.exam_set_id = p.exam_set_id)
  AND coalesce(er.activity_score, 0) + coalesce(er.formative_score, 0) + coalesce(er.exam_score, 0) > 0
  AND (
    ps.student_id IS NULL
    OR coalesce(er.marks_obtained, er.final_score, -1) IS DISTINCT FROM coalesce(ps.marks_obtained, -1)
    OR coalesce(trim(er.grade), '') IS DISTINCT FROM coalesce(trim(ps.grade), '')
  )
LIMIT 100;
