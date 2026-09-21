-- Optimize get_students_with_balances to aggregate both student_balances and active student_invoices.
-- Guarantees that students with outstanding invoices or balances are never omitted,
-- eliminating the intermittent 0 balance bug and speeding up ledger calculation.

CREATE OR REPLACE FUNCTION public.get_students_with_balances(p_school_id uuid)
 RETURNS TABLE(
   student_id uuid,
   name text,
   current_class text,
   boarding_type text,
   admission_number text,
   total_billed numeric,
   total_paid numeric,
   balance numeric,
   created_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH student_bals AS (
    SELECT 
      sb.student_id,
      SUM(COALESCE(sb.total_fees, 0)) AS total_billed,
      SUM(COALESCE(sb.total_paid, 0)) AS total_paid,
      SUM(GREATEST(COALESCE(sb.balance, 0), 0)) AS balance
    FROM public.student_balances sb
    WHERE sb.school_id = p_school_id
    GROUP BY sb.student_id
  ),
  invoice_bals AS (
    SELECT
      si.student_id,
      SUM(COALESCE(si.total_amount, 0)) AS total_billed,
      SUM(COALESCE(si.amount_paid, 0)) AS total_paid,
      SUM(GREATEST(COALESCE(si.balance, 0), 0)) AS balance
    FROM public.student_invoices si
    WHERE si.school_id = p_school_id AND si.status != 'cancelled'
    GROUP BY si.student_id
  )
  SELECT
    s.student_id,
    COALESCE(s.name, '')                     AS name,
    COALESCE(s.current_class, '')            AS current_class,
    COALESCE(s.boarding_type, 'Day Scholar') AS boarding_type,
    COALESCE(s.admission_number, '')         AS admission_number,
    COALESCE(sb.total_billed, ib.total_billed, 0)::numeric AS total_billed,
    COALESCE(sb.total_paid, ib.total_paid, 0)::numeric AS total_paid,
    COALESCE(sb.balance, ib.balance, 0)::numeric AS balance,
    s.created_at
  FROM public.students s
  LEFT JOIN student_bals sb ON sb.student_id = s.student_id
  LEFT JOIN invoice_bals ib ON ib.student_id = s.student_id
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND (
      COALESCE(sb.balance, ib.balance, 0) > 0 
      OR COALESCE(sb.total_billed, ib.total_billed, 0) > 0
    )
  ORDER BY s.name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_students_with_balances(uuid) TO authenticated, anon, service_role;
