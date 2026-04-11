-- One-off / batch repair: align marks_obtained + total_marks with final_score for Senior rows,
-- optionally fix letter grade when it looks like primary (F9, D1, etc.) on O-Level ECS.
-- After editing, run a trivial UPDATE so trigger re-syncs processed_secondary_exam_results.

-- --- Example: single row from audit (replace id if needed) ---
/*
UPDATE public.exam_results
SET
  marks_obtained = final_score,
  total_marks = 100,
  grade = CASE
    WHEN floor(coalesce(final_score, 0)) >= 80 THEN 'A'
    WHEN floor(coalesce(final_score, 0)) >= 70 THEN 'B'
    WHEN floor(coalesce(final_score, 0)) >= 60 THEN 'C'
    WHEN floor(coalesce(final_score, 0)) >= 50 THEN 'D'
    ELSE 'E'
  END
WHERE id = '7dbd0728-6387-4dca-b694-4a8f79c562cd';
*/

-- --- Batch: Senior 1–6 where marks_obtained is wrong vs final_score (does NOT auto-fix grade) ---
UPDATE public.exam_results er
SET
  marks_obtained = er.final_score,
  total_marks = CASE WHEN coalesce(er.total_marks, 0) = 0 THEN 100 ELSE er.total_marks END,
  updated_at = now()
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND er.final_score IS NOT NULL
  AND coalesce(er.marks_obtained, -1) IS DISTINCT FROM coalesce(er.final_score, -1);

-- Optional: set grade from default A–E bands only where grade looks like primary scale (tune pattern).
/*
UPDATE public.exam_results er
SET
  grade = CASE
    WHEN floor(coalesce(er.final_score, 0)) >= 80 THEN 'A'
    WHEN floor(coalesce(er.final_score, 0)) >= 70 THEN 'B'
    WHEN floor(coalesce(er.final_score, 0)) >= 60 THEN 'C'
    WHEN floor(coalesce(er.final_score, 0)) >= 50 THEN 'D'
    ELSE 'E'
  END,
  updated_at = now()
WHERE trim(coalesce(er.class_name, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)'
  AND er.final_score IS NOT NULL
  AND er.grade ~ '^[FD][0-9]|^D[12]';  -- crude: F9, D1-style; adjust for your data
*/
