-- =============================================================================
-- After deploy: Senior 5–6 rows with marks should have grade + uace_points
-- matching server defaults (public.uace_default_grade_from_percent).
-- Expect 0 rows in the final SELECT when data is consistent.
-- =============================================================================
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
