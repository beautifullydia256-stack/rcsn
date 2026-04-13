-- O-Level reporting in Postgres: every *expected* subject per learner × exam set, with explicit missing-result flags
-- and nullable columns from exam_results when a line exists.
--
-- Fixes mismatch where students.current_class lags exam_results.class_name (band resolution failed in SQL only).
-- Application / Edge can read from these views; Table Editor and SQL clients show missing rows as result_missing = true.

CREATE OR REPLACE VIEW public.olevel_subject_exam_coverage
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
student_expected_subjects AS (
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
FROM student_expected_subjects ses
INNER JOIN public.exam_sets es ON es.school_id = ses.school_id;

COMMENT ON VIEW public.olevel_subject_exam_coverage IS
  'O-Level: student × exam_set × expected subject. has_exam_result = row exists in exam_results for that subject name. Expected subjects: S1–2 from class_subjects by senior band; S3–4 from student_olevel_subjects. Effective class = latest exam_results.class_name for that student at the school, else students.current_class.';

-- One logical row per expected subject and exam: explicit result_missing + optional representative exam_results line.
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
  'O-Level grid in the database: expected subject × exam_set with result_missing, line count, and nullable marks from one representative exam_results row (latest updated).';

GRANT SELECT ON public.olevel_exam_subject_lines TO authenticated;
GRANT SELECT ON public.olevel_exam_subject_lines TO service_role;
