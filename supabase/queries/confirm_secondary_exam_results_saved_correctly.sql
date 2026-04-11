-- =============================================================================
-- Confirm Senior secondary exam_results are stored consistently with the grid:
--   marks_obtained = final_score, total_marks = 100 (when scored),
--   final = formative + exam (within float tolerance),
--   descriptor from activity, optional grade vs default A–E,
--   processed mirror aligned.
--
-- How to read results:
--   • Section A always returns ONE summary row — check the *_bad counts (all0 = good).
--   • grade_ne_default_ae_bad may be >0 if you only use custom teacher_exam_grade_bands (not default A–E).
--   • Sections B–D: NO ROWS = nothing wrong. Section E is a sample (always rows if data exists).
-- =============================================================================

-- A) Summary (expect marks_ne_final = 0, final_ne_sum = 0, descriptor_bad = 0, etc.)
WITH senior AS (
  SELECT
    er.*,
    CASE
      WHEN coalesce(er.activity_score, 0) < 1 THEN 'Basic'
      WHEN coalesce(er.activity_score, 0) < 2.5 THEN 'Moderate'
      ELSE 'Outstanding'
    END AS expected_descriptor,
    (coalesce(er.formative_score, 0) + coalesce(er.exam_score, 0)) AS sum_fe,
    CASE
      WHEN floor(coalesce(er.final_score, 0)) >= 80 THEN 'A'
      WHEN floor(coalesce(er.final_score, 0)) >= 70 THEN 'B'
      WHEN floor(coalesce(er.final_score, 0)) >= 60 THEN 'C'
      WHEN floor(coalesce(er.final_score, 0)) >= 50 THEN 'D'
      ELSE 'E'
    END AS expected_grade_ae
  FROM public.exam_results er
  WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
    AND (
      coalesce(er.activity_score, 0) <> 0
      OR coalesce(er.formative_score, 0) <> 0
      OR coalesce(er.exam_score, 0) <> 0
      OR coalesce(er.final_score, 0) <> 0
      OR coalesce(trim(er.topic), '') <> ''
    )
),
ps AS (
  SELECT
    er.id,
    ps.marks_obtained AS ps_marks,
    ps.grade AS ps_grade
  FROM public.exam_results er
  LEFT JOIN public.processed_secondary_exam_results ps
    ON ps.school_id = er.school_id
   AND ps.exam_set_id = er.exam_set_id
   AND ps.student_id = er.student_id
   AND trim(ps.subject) = trim(er.subject)
   AND ps.proc_topic_key = er.exam_topic_key
   AND ps.proc_paper_key = er.exam_paper_key
  WHERE er.id IN (SELECT id FROM senior)
)
SELECT
  (SELECT count(*) FROM senior)::bigint AS senior_scored_lines,
  (SELECT count(*) FROM senior WHERE coalesce(marks_obtained, -1) IS DISTINCT FROM coalesce(final_score, -2))::bigint
    AS marks_ne_final_bad,
  (SELECT count(*) FROM senior WHERE coalesce(final_score, 0) > 0 AND (total_marks IS DISTINCT FROM 100))::bigint
    AS total_marks_not_100_bad,
  (SELECT count(*) FROM senior WHERE abs(coalesce(final_score, 0) - coalesce(sum_fe, 0)) > 0.0001)::bigint
    AS final_ne_formative_plus_exam_bad,
  (SELECT count(*) FROM senior WHERE coalesce(trim(descriptor), '') IS DISTINCT FROM expected_descriptor)::bigint
    AS descriptor_bad,
  (SELECT count(*) FROM senior WHERE coalesce(final_score, 0) > 0 AND upper(trim(coalesce(grade, ''))) LIKE 'F%' AND length(trim(grade)) > 1)::bigint
    AS grade_looks_primary_f9_style_bad,
  (SELECT count(*) FROM senior s WHERE coalesce(final_score, 0) > 0 AND coalesce(trim(grade), '') <> coalesce(expected_grade_ae, '') AND NOT (
 upper(trim(coalesce(grade, ''))) LIKE 'F%'
      ))::bigint
    AS grade_ne_default_ae_bad,
  (SELECT count(*) FROM senior s JOIN ps ON ps.id = s.id WHERE coalesce(s.final_score, 0) > 0 AND ps.ps_marks IS NULL)::bigint
    AS processed_row_missing_bad,
  (SELECT count(*) FROM senior s JOIN ps ON ps.id = s.id WHERE ps.ps_marks IS NOT NULL AND coalesce(s.marks_obtained, s.final_score, -1) IS DISTINCT FROM coalesce(ps.ps_marks, -2))::bigint
    AS processed_marks_mismatch_bad,
  (SELECT count(*) FROM senior s JOIN ps ON ps.id = s.id WHERE ps.ps_grade IS NOT NULL AND coalesce(trim(s.grade), '') IS DISTINCT FROM coalesce(trim(ps.ps_grade), ''))::bigint
    AS processed_grade_mismatch_bad,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM senior s
      WHERE coalesce(marks_obtained, -1) IS DISTINCT FROM coalesce(final_score, -2)
         OR (coalesce(final_score, 0) > 0 AND total_marks IS DISTINCT FROM 100)
         OR abs(coalesce(final_score, 0) - (coalesce(formative_score, 0) + coalesce(exam_score, 0))) > 0.0001
         OR coalesce(trim(descriptor), '') IS DISTINCT FROM (
 CASE
             WHEN coalesce(activity_score, 0) < 1 THEN 'Basic'
             WHEN coalesce(activity_score, 0) < 2.5 THEN 'Moderate'
             ELSE 'Outstanding'
           END
         )
    ) AND NOT EXISTS (
      SELECT 1 FROM senior s
      JOIN ps ON ps.id = s.id
      WHERE (coalesce(s.final_score, 0) > 0 AND ps.ps_marks IS NULL)
 OR (ps.ps_marks IS NOT NULL AND coalesce(s.marks_obtained, s.final_score, -1) IS DISTINCT FROM coalesce(ps.ps_marks, -2))
         OR (ps.ps_grade IS NOT NULL AND coalesce(trim(s.grade), '') IS DISTINCT FROM coalesce(trim(ps.ps_grade), ''))
    )
    THEN 'OK — core checks pass for senior scored lines'
    ELSE 'REVIEW — some *_bad counts above are non-zero'
  END AS verdict;

-- B) Detail: marks_obtained ≠ final_score (want 0 rows here)
SELECT 'marks_obtained_ne_final_score' AS check_name, id, class_name, subject, topic, marks_obtained, final_score
FROM public.exam_results er
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND coalesce(marks_obtained, -1) IS DISTINCT FROM coalesce(final_score, -2)
  AND (coalesce(er.final_score, 0) > 0 OR coalesce(er.marks_obtained, 0) > 0)
LIMIT 200;

-- C) Detail: final ≠ formative + exam (want 0 rows)
SELECT 'final_ne_sum' AS check_name, id, class_name, subject, topic, formative_score, exam_score, final_score,
       (coalesce(formative_score, 0) + coalesce(exam_score, 0)) AS sum_fe
FROM public.exam_results er
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND abs(coalesce(final_score, 0) - (coalesce(formative_score, 0) + coalesce(exam_score, 0))) > 0.0001
LIMIT 200;

-- D) Detail: processed mirror (want 0 rows)
SELECT 'processed_mismatch' AS check_name, er.id, er.class_name, er.subject, er.topic,
       er.marks_obtained AS er_marks, er.final_score AS er_final, er.grade AS er_grade,
       ps.marks_obtained AS ps_marks, ps.grade AS ps_grade
FROM public.exam_results er
LEFT JOIN public.processed_secondary_exam_results ps
  ON ps.school_id = er.school_id
 AND ps.exam_set_id = er.exam_set_id
 AND ps.student_id = er.student_id
 AND trim(ps.subject) = trim(er.subject)
 AND ps.proc_topic_key = er.exam_topic_key
 AND ps.proc_paper_key = er.exam_paper_key
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND coalesce(er.activity_score, 0) + coalesce(er.formative_score, 0) + coalesce(er.exam_score, 0) > 0
  AND (
    ps.student_id IS NULL
    OR coalesce(er.marks_obtained, er.final_score, -1) IS DISTINCT FROM coalesce(ps.marks_obtained, -2)
    OR coalesce(trim(er.grade), '') IS DISTINCT FROM coalesce(trim(ps.grade), '')
  )
LIMIT 200;

-- E) Recent sample (always shows rows if any senior data exists — eyeball Topic/Activity/… columns)
SELECT
  er.class_name,
  er.subject,
  er.topic,
  er.activity_score,
  er.descriptor,
  er.formative_score,
  er.exam_score,
  er.final_score,
  er.marks_obtained,
  er.total_marks,
  er.grade,
  left(coalesce(er.overall_remark, ''), 40) AS remark_preview,
  er.teacher_initials,
  er.updated_at
FROM public.exam_results er
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND coalesce(er.final_score, 0) > 0
ORDER BY er.updated_at DESC NULLS LAST
LIMIT 25;
