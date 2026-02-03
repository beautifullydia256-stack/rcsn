-- =============================================================================
-- CHECK PRIMARY 7 GRADES IN SUPABASE
-- Run this in Supabase SQL Editor to see what grades are really stored.
-- Primary should use D1, D2, C3, C4, C5, C6, P7, P8, F9 (Subject Grade Boundaries).
-- If you see A, B, C, D, E, F here, run the grade backfill (see REPORT_DATA_FROM_SUPABASE_FIX_PER_SCHOOL_GRADING.sql).
-- =============================================================================

-- 1) exam_results: grades for Primary 7 (class_name like '%7%' or 'Primary 7' / 'P.7' / 'P7')
SELECT
  er.school_id,
  s.name AS school_name,
  er.class_name,
  er.subject,
  er.marks_obtained,
  er.total_marks,
  er.grade,
  er.remarks
FROM public.exam_results er
JOIN public.schools s ON s.school_id = er.school_id
WHERE s.type IN ('Nursery/Primary', 'Primary')
  AND (
    er.class_name ILIKE '%7%'
    OR er.class_name ILIKE 'primary 7'
    OR er.class_name ILIKE 'p.7'
    OR er.class_name ILIKE 'p7'
  )
ORDER BY er.school_id, er.class_name, er.subject
LIMIT 50;

-- 2) Count: how many exam_results have A–F (wrong for primary)?
SELECT
  'exam_results with A–F grade (wrong for primary)' AS check_name,
  COUNT(*) AS cnt
FROM public.exam_results er
JOIN public.schools s ON s.school_id = er.school_id
WHERE s.type IN ('Nursery/Primary', 'Primary')
  AND er.grade IN ('A', 'B', 'C', 'D', 'E', 'F');

-- 3) processed_primary_exam_results: grades for Primary 7
SELECT
  school_id,
  class_name,
  subject,
  marks_obtained,
  total_marks,
  grade,
  teacher_remark
FROM public.processed_primary_exam_results
WHERE class_name ILIKE '%7%'
   OR class_name ILIKE 'primary 7'
   OR class_name ILIKE 'p.7'
   OR class_name ILIKE 'p7'
ORDER BY school_id, class_name, subject
LIMIT 50;

-- 4) Count: processed_primary_exam_results with A–F?
SELECT
  'processed_primary with A–F grade' AS check_name,
  COUNT(*) AS cnt
FROM public.processed_primary_exam_results
WHERE grade IN ('A', 'B', 'C', 'D', 'E', 'F');

-- 5) If you see A–F above, run this to fix exam_results (per-school scale):
-- UPDATE public.exam_results
-- SET grade = public.calculate_primary_grade_from_marks(marks_obtained, total_marks, school_id)
-- WHERE (grade IS NULL OR grade = '' OR grade IN ('A','B','C','D','E','F'))
--   AND marks_obtained IS NOT NULL
--   AND total_marks IS NOT NULL
--   AND total_marks > 0
--   AND school_id IN (SELECT school_id FROM public.schools WHERE type IN ('Nursery/Primary', 'Primary'));

-- 6) And fix processed_primary_exam_results:
-- UPDATE public.processed_primary_exam_results
-- SET grade = public.calculate_primary_grade_from_marks(marks_obtained, total_marks, school_id)
-- WHERE (grade IS NULL OR grade = '' OR grade IN ('A','B','C','D','E','F'))
--   AND marks_obtained IS NOT NULL
--   AND total_marks IS NOT NULL
--   AND total_marks > 0;
