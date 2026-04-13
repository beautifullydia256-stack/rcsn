-- O-Level: expose whether each *expected* subject has at least one exam_results row per exam set.
-- Expected subjects: Senior 1–2 → class_subjects (same senior band as student); Senior 3–4 → student_olevel_subjects.
-- Class labels "S1" / "Senior 1" resolve via olevel_class_senior_band().

CREATE OR REPLACE FUNCTION public.olevel_class_senior_band(class_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (regexp_match(trim(both from COALESCE(class_name, '')), '^senior\s*([1-4])(?:\s|$)', 'i'))[1]::integer,
    (regexp_match(trim(both from COALESCE(class_name, '')), '^s\.?\s*([1-4])(?:\s|$)', 'i'))[1]::integer
  );
$$;

COMMENT ON FUNCTION public.olevel_class_senior_band(text) IS
  'Senior 1–4 band number from class label (e.g. Senior 1, S1, S.1). NULL if not O-Level shaped.';

CREATE OR REPLACE VIEW public.olevel_subject_exam_coverage
WITH (security_invoker = true) AS
WITH student_expected_subjects AS (
  SELECT DISTINCT
    s.student_id,
    s.school_id,
    trim(both from cs.subject) AS subject_name
  FROM public.students s
  INNER JOIN public.class_subjects cs
    ON cs.school_id = s.school_id
    AND public.olevel_class_senior_band(cs.class_name) = public.olevel_class_senior_band(s.current_class)
    AND public.olevel_class_senior_band(s.current_class) IN (1, 2)
  UNION
  SELECT DISTINCT
    s.student_id,
    s.school_id,
    trim(both from sos.subject_name) AS subject_name
  FROM public.students s
  INNER JOIN public.student_olevel_subjects sos
    ON sos.student_id = s.student_id
    AND sos.school_id = s.school_id
  WHERE public.olevel_class_senior_band(s.current_class) IN (3, 4)
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
      AND trim(both from er.subject) = trim(both from ses.subject_name)
  ) AS has_exam_result
FROM student_expected_subjects ses
INNER JOIN public.exam_sets es ON es.school_id = ses.school_id;

COMMENT ON VIEW public.olevel_subject_exam_coverage IS
  'Per student, exam set, and expected O-Level subject: has_exam_result is true if at least one exam_results row exists for that subject line.';

GRANT SELECT ON public.olevel_subject_exam_coverage TO authenticated;
GRANT SELECT ON public.olevel_subject_exam_coverage TO service_role;
