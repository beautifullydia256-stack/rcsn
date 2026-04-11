-- =============================================================================
-- A-Level (Senior 5–6): find exam_results grades that look like PRIMARY (D1–F9)
-- instead of UACE letters (A–F, O). Compare to expected UACE band from marks.
-- Bands: 80+ A, 70–79 B, 60–69 C, 50–59 D, 45–49 E, 40–44 O, &lt;40 F
-- @see docs/UACE_ALEVEL_GRADING_LOGIC.md
-- =============================================================================

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

-- Summary: counts by stored grade for Senior 5–6 (quick sanity check)
-- SELECT grade, count(*) FROM public.exam_results
-- WHERE trim(coalesce(class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
-- GROUP BY grade ORDER BY count(*) DESC;
