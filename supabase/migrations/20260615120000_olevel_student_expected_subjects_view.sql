-- Authoritative list: each O-Level learner (S1–4 band) × expected subject name.
-- Edge `generate-report-preview` reads this view so preview matches `olevel_subject_exam_coverage` / SQL checks exactly.

CREATE OR REPLACE VIEW public.olevel_student_expected_subjects
WITH (security_invoker = true) AS
WITH student_effective_class AS (
  SELECT
    s.student_id,
    s.school_id,
    COALESCE(
      NULLIF(BTRIM(ec.class_from_exam), ''),
      NULLIF(BTRIM(s.current_class), '')
    ) AS effective_class
  FROM public.students s
  LEFT JOIN LATERAL (
    SELECT er.class_name AS class_from_exam
    FROM public.exam_results er
    WHERE er.student_id = s.student_id
      AND er.school_id = s.school_id
    ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
    LIMIT 1
  ) ec ON true
),
rows AS (
  SELECT DISTINCT
    sec.student_id,
    sec.school_id,
    BTRIM(cs.subject::text) AS subject_name
  FROM student_effective_class sec
  INNER JOIN public.class_subjects cs
    ON cs.school_id = sec.school_id
    AND public.olevel_class_senior_band(cs.class_name) = public.olevel_class_senior_band(sec.effective_class)
    AND public.olevel_class_senior_band(sec.effective_class) IN (1, 2)
  WHERE public.olevel_class_senior_band(sec.effective_class) IS NOT NULL
  UNION
  SELECT DISTINCT
    sec.student_id,
    sec.school_id,
    BTRIM(sos.subject_name::text) AS subject_name
  FROM student_effective_class sec
  INNER JOIN public.student_olevel_subjects sos
    ON sos.student_id = sec.student_id
    AND sos.school_id = sec.school_id
  WHERE public.olevel_class_senior_band(sec.effective_class) IN (3, 4)
    AND public.olevel_class_senior_band(sec.effective_class) IS NOT NULL
)
SELECT student_id, school_id, subject_name
FROM rows
WHERE BTRIM(subject_name) <> '';

COMMENT ON VIEW public.olevel_student_expected_subjects IS
  'O-Level: distinct expected subject names per student from class_subjects (S1–2, same senior band as effective class) or student_olevel_subjects (S3–4). Effective class prefers latest exam_results.class_name at the school.';

GRANT SELECT ON public.olevel_student_expected_subjects TO authenticated;
GRANT SELECT ON public.olevel_student_expected_subjects TO service_role;

-- Reuse the same grain for coverage (avoid duplicating CTE in multiple views).
CREATE OR REPLACE VIEW public.olevel_subject_exam_coverage
WITH (security_invoker = true) AS
SELECT
  ses.student_id,
  ses.school_id,
  es.id AS exam_set_id,
  es.name AS exam_set_name,
  es.term AS exam_term,
  es.year AS exam_year,
  ses.subject_name,
  EXISTS (
    SELECT 1
    FROM public.exam_results er
    WHERE er.student_id = ses.student_id
      AND er.exam_set_id = es.id
      AND er.school_id = ses.school_id
      AND BTRIM(er.subject) = BTRIM(ses.subject_name)
  ) AS has_exam_result
FROM public.olevel_student_expected_subjects ses
INNER JOIN public.exam_sets es ON es.school_id = ses.school_id;

COMMENT ON VIEW public.olevel_subject_exam_coverage IS
  'O-Level: student × exam_set × expected subject; has_exam_result from exam_results. Expected rows from olevel_student_expected_subjects.';

CREATE OR REPLACE VIEW public.olevel_exam_subject_lines
WITH (security_invoker = true) AS
SELECT
  c.student_id,
  c.school_id,
  c.exam_set_id,
  c.exam_set_name,
  c.exam_term,
  c.exam_year,
  c.subject_name,
  c.has_exam_result,
  (NOT c.has_exam_result) AS result_missing,
  (
    SELECT count(*)::integer
    FROM public.exam_results er0
    WHERE er0.student_id = c.student_id
      AND er0.exam_set_id = c.exam_set_id
      AND er0.school_id = c.school_id
      AND BTRIM(er0.subject) = BTRIM(c.subject_name)
  ) AS exam_result_line_count,
  er.id AS exam_result_id,
  er.class_name AS exam_result_class_name,
  er.marks_obtained,
  er.total_marks,
  er.final_score,
  er.formative_score,
  er.exam_score,
  er.activity_score,
  er.grade,
  er.descriptor,
  er.remarks,
  er.overall_remark,
  er.teacher_initials,
  er.topic,
  er.paper_code,
  er.paper_number
FROM public.olevel_subject_exam_coverage c
LEFT JOIN LATERAL (
  SELECT
    er.id,
    er.class_name,
    er.marks_obtained,
    er.total_marks,
    er.final_score,
    er.formative_score,
    er.exam_score,
    er.activity_score,
    er.grade,
    er.descriptor,
    er.remarks,
    er.overall_remark,
    er.teacher_initials,
    er.topic,
    er.paper_code,
    er.paper_number
  FROM public.exam_results er
  WHERE er.student_id = c.student_id
    AND er.exam_set_id = c.exam_set_id
    AND er.school_id = c.school_id
    AND BTRIM(er.subject) = BTRIM(c.subject_name)
  ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
  LIMIT 1
) er ON true;

COMMENT ON VIEW public.olevel_exam_subject_lines IS
  'O-Level: expected subject × exam_set with result_missing and representative exam_results row.';
