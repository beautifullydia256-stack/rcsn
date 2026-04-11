-- =============================================================================
-- Repair Senior 5–6 exam_results: set grade + uace_points from marks using
-- public.uace_default_grade_from_percent (same as teacher_upsert_exam_result_alevel).
--
-- Prerequisite: migration 20260602120000_uace_default_grade_server_exam_points.sql
--   applied (functions + uace_points column exist).
--
-- Preview (dry run): uncomment the SELECT at the bottom; comment out UPDATE.
-- =============================================================================

-- Preview what would change (run this first)
SELECT
  er.id,
  er.class_name,
  er.subject,
  er.student_id,
  er.marks_obtained,
  er.total_marks,
  er.grade AS grade_before,
  public.uace_default_grade_from_percent(
    (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
  ) AS grade_after,
  er.uace_points AS points_before,
  public.uace_default_points_from_grade(
    public.uace_default_grade_from_percent(
      (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
    )
  ) AS points_after
FROM public.exam_results er
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
  AND er.marks_obtained IS NOT NULL
  AND coalesce(er.total_marks, 0) > 0
  AND upper(trim(coalesce(er.grade, ''))) IS DISTINCT FROM public.uace_default_grade_from_percent(
    (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
  )
ORDER BY er.class_name, er.subject, er.student_id;

-- Apply repair (run after preview looks correct)
/*
UPDATE public.exam_results er
SET
  grade = public.uace_default_grade_from_percent(
    (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
  ),
  uace_points = public.uace_default_points_from_grade(
    public.uace_default_grade_from_percent(
      (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
    )
  ),
  updated_at = now()
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
  AND er.marks_obtained IS NOT NULL
  AND coalesce(er.total_marks, 0) > 0
  AND upper(trim(coalesce(er.grade, ''))) IS DISTINCT FROM public.uace_default_grade_from_percent(
    (er.marks_obtained::numeric / nullif(coalesce(nullif(er.total_marks, 0), 100), 0)) * 100
  );
*/
