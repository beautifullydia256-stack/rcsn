-- Return students who have exam results for the given exam set and class (for report generation).
-- Uses SECURITY DEFINER so graduated students are included regardless of RLS.
CREATE OR REPLACE FUNCTION public.get_report_students_for_class(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS TABLE (
  student_id UUID,
  name TEXT,
  admission_number TEXT,
  current_class TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT ON (s.student_id)
    s.student_id,
    s.name,
    s.admission_number,
    COALESCE(s.current_class, p_class_name) AS current_class
  FROM public.exam_results er
  JOIN public.students s ON s.student_id = er.student_id AND s.school_id = er.school_id
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.class_name = p_class_name
  ORDER BY s.student_id, s.name;
$$;

COMMENT ON FUNCTION public.get_report_students_for_class(UUID, UUID, TEXT) IS
  'Returns students with results for the given exam set and class (includes graduated). Used for report generator.';
