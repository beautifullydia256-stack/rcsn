-- One-time prior-system balance per student: cannot stack entries term over term, and not after
-- the student already has invoice history on a closed term (see school_terms.is_closed).

-- Merge legacy duplicate rows (sum amounts into earliest entry, drop extras).
UPDATE public.prior_system_balance_entries AS p
SET amount_outstanding = sub.total
FROM (
  SELECT school_id, student_id,
         SUM(amount_outstanding)::numeric(12, 2) AS total,
         (array_agg(id ORDER BY entered_at ASC, id ASC))[1] AS keep_id
  FROM public.prior_system_balance_entries
  GROUP BY school_id, student_id
  HAVING COUNT(*) > 1
) AS sub
WHERE p.id = sub.keep_id;

DELETE FROM public.prior_system_balance_entries AS p
WHERE p.id NOT IN (
  SELECT DISTINCT ON (school_id, student_id) id
  FROM public.prior_system_balance_entries
  ORDER BY school_id, student_id, entered_at ASC, id ASC
);

DROP INDEX IF EXISTS idx_prior_system_balance_school_student;

ALTER TABLE public.prior_system_balance_entries
  DROP CONSTRAINT IF EXISTS uq_prior_system_balance_school_student;

ALTER TABLE public.prior_system_balance_entries
  ADD CONSTRAINT uq_prior_system_balance_school_student UNIQUE (school_id, student_id);

COMMENT ON CONSTRAINT uq_prior_system_balance_school_student ON public.prior_system_balance_entries IS
  'At most one prior-system (external) row per student per school; use term invoices after onboarding.';

CREATE OR REPLACE FUNCTION public.prior_system_balance_entries_enforce_one_time_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.student_invoices AS si
    INNER JOIN public.school_terms AS st
      ON st.id = si.term_id
     AND st.school_id = si.school_id
    WHERE si.student_id = NEW.student_id
      AND si.school_id = NEW.school_id
      AND st.is_closed IS TRUE
  ) THEN
    RAISE EXCEPTION
      'prior_system_balance_entries: cannot add external/prior balance for this student because they already have invoice history on a closed term. One-time prior entry is only allowed during onboarding (before any closed term).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prior_system_balance_one_time_guard
  ON public.prior_system_balance_entries;

CREATE TRIGGER trg_prior_system_balance_one_time_guard
  BEFORE INSERT ON public.prior_system_balance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prior_system_balance_entries_enforce_one_time_new_student();

COMMENT ON FUNCTION public.prior_system_balance_entries_enforce_one_time_new_student() IS
  'Rejects INSERT when the student has any student_invoices row for a school_terms row with is_closed = true.';
