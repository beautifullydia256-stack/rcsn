-- Order expected O-Level subjects: compulsory (uce_offering_type) first, then subsidiary, then unknown.
-- Drop dependent views first (column shape changes: offering_sort added to coverage grain).

DROP VIEW IF EXISTS public.olevel_exam_subject_lines;
DROP VIEW IF EXISTS public.olevel_subject_exam_coverage;
DROP VIEW IF EXISTS public.olevel_student_expected_subjects;

CREATE VIEW public.olevel_student_expected_subjects
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
  SELECT * FROM (
    SELECT DISTINCT ON (sec.student_id, sec.school_id, BTRIM(cs.subject::text))
      sec.student_id,
      sec.school_id,
      BTRIM(cs.subject::text) AS subject_name,
      CASE
        WHEN cs.uce_offering_type = 'compulsory' THEN 0
        WHEN cs.uce_offering_type = 'subsidiary' THEN 1
        ELSE 2
      END AS offering_sort
    FROM student_effective_class sec
    INNER JOIN public.class_subjects cs
      ON cs.school_id = sec.school_id
      AND public.olevel_class_senior_band(cs.class_name) = public.olevel_class_senior_band(sec.effective_class)
      AND public.olevel_class_senior_band(sec.effective_class) IN (1, 2)
    WHERE public.olevel_class_senior_band(sec.effective_class) IS NOT NULL
    ORDER BY sec.student_id, sec.school_id, BTRIM(cs.subject::text), offering_sort ASC
  ) s12
  UNION
  SELECT * FROM (
    SELECT DISTINCT ON (sec.student_id, sec.school_id, BTRIM(sos.subject_name::text))
      sec.student_id,
      sec.school_id,
      BTRIM(sos.subject_name::text) AS subject_name,
      CASE
        WHEN cs.uce_offering_type = 'compulsory' THEN 0
        WHEN cs.uce_offering_type = 'subsidiary' THEN 1
        ELSE 2
      END AS offering_sort
    FROM student_effective_class sec
    INNER JOIN public.student_olevel_subjects sos
      ON sos.student_id = sec.student_id
      AND sos.school_id = sec.school_id
    LEFT JOIN public.class_subjects cs
      ON cs.school_id = sec.school_id
      AND public.olevel_class_senior_band(cs.class_name) = public.olevel_class_senior_band(sec.effective_class)
      AND BTRIM(cs.subject) = BTRIM(sos.subject_name)
    WHERE public.olevel_class_senior_band(sec.effective_class) IN (3, 4)
      AND public.olevel_class_senior_band(sec.effective_class) IS NOT NULL
    ORDER BY sec.student_id, sec.school_id, BTRIM(sos.subject_name::text), offering_sort ASC
  ) s34
)
SELECT student_id, school_id, subject_name, offering_sort
FROM rows
WHERE BTRIM(subject_name) <> '';

COMMENT ON VIEW public.olevel_student_expected_subjects IS
  'O-Level expected subjects per student; offering_sort 0=compulsory, 1=subsidiary, 2=unknown. Order reports by offering_sort then subject_name.';

GRANT SELECT ON public.olevel_student_expected_subjects TO authenticated;
GRANT SELECT ON public.olevel_student_expected_subjects TO service_role;

CREATE VIEW public.olevel_subject_exam_coverage
WITH (security_invoker = true) AS
SELECT
  ses.student_id,
  ses.school_id,
  es.id AS exam_set_id,
  es.name AS exam_set_name,
  es.term AS exam_term,
  es.year AS exam_year,
  ses.subject_name,
  ses.offering_sort,
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
  'O-Level: student × exam_set × expected subject; has_exam_result from exam_results. Includes offering_sort for report ordering.';

GRANT SELECT ON public.olevel_subject_exam_coverage TO authenticated;
GRANT SELECT ON public.olevel_subject_exam_coverage TO service_role;

CREATE VIEW public.olevel_exam_subject_lines
WITH (security_invoker = true) AS
SELECT
  c.student_id,
  c.school_id,
  c.exam_set_id,
  c.exam_set_name,
  c.exam_term,
  c.exam_year,
  c.subject_name,
  c.offering_sort,
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

GRANT SELECT ON public.olevel_exam_subject_lines TO authenticated;
GRANT SELECT ON public.olevel_exam_subject_lines TO service_role;
