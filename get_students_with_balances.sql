-- Create function to get students with their current balances
-- This is used by the Student Fee Sync page for balance updates

CREATE OR REPLACE FUNCTION public.get_students_with_balances(p_school_id UUID)
RETURNS TABLE (
  student_id UUID,
  name TEXT,
  current_class TEXT,
  boarding_type TEXT,
  admission_number TEXT,
  total_billed NUMERIC,
  total_paid NUMERIC,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.current_class,
    COALESCE(s.boarding_type, 'Day Scholar') as boarding_type,
    s.admission_number,
    COALESCE(SUM(si.total_amount), 0) as total_billed,
    COALESCE(SUM(si.amount_paid), 0) as total_paid,
    COALESCE(SUM(si.balance), 0) as balance
  FROM public.students s
  LEFT JOIN public.student_invoices si ON (
    si.student_id = s.student_id 
    AND si.school_id = s.school_id
    AND si.is_supplementary = false
    AND si.status != 'cancelled'
  )
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.student_invoices si2 
      WHERE si2.student_id = s.student_id 
        AND si2.school_id = s.school_id
        AND si2.is_supplementary = false
        AND si2.status != 'cancelled'
    )
  GROUP BY s.student_id, s.name, s.current_class, s.boarding_type, s.admission_number
  ORDER BY s.name;
END;
$;

COMMENT ON FUNCTION public.get_students_with_balances(UUID) IS
  'Returns students who have existing invoices with their current balance information for the Student Fee Sync page';