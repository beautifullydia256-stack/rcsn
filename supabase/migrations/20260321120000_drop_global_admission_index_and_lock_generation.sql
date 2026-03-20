-- 1) Remove global unique index on admission_number alone (often created as
--    idx_students_admission_number in the dashboard). It conflicts with
--    multi-tenant auto-generation: same pattern can legitimately appear in
--    different schools, and races on MAX(seq)+1 only collide within a school.
DROP INDEX IF EXISTS public.idx_students_admission_number;
DROP INDEX IF EXISTS public.students_admission_number_key;

-- Keep per-school uniqueness (see also 20260321100000).
CREATE UNIQUE INDEX IF NOT EXISTS students_school_admission_number_key
  ON public.students (school_id, lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- 2) Serialize "next sequence" per school + year-month so concurrent inserts
--    cannot receive the same generated admission number.
CREATE OR REPLACE FUNCTION public.generate_admission_number(
  p_school_id UUID,
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_admission_date DATE
) RETURNS TEXT AS $$
DECLARE
  v_school_abbr TEXT;
  v_year TEXT;
  v_month TEXT;
  v_sequence INT;
  v_number TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
  INTO v_school_abbr
  FROM schools
  WHERE school_id = p_school_id;

  IF v_school_abbr IS NULL OR LENGTH(v_school_abbr) < 3 THEN
    v_school_abbr := 'SCH';
  END IF;

  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');

  -- Block concurrent generators for this school + calendar month only.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_school_id::text),
    hashtext(v_year || v_month)
  );

  SELECT COALESCE(MAX(
    CASE
      WHEN admission_number ~ (v_school_abbr || '-' || v_year || '-' || v_month || '-[0-9]+')
        OR admission_number ~ (v_school_abbr || v_year || v_month || '[0-9]+$')
      THEN CAST(SUBSTRING(admission_number FROM '[0-9]+$') AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM students
  WHERE school_id = p_school_id;

  v_number := LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_school_abbr || v_year || v_month || v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_admission_number(UUID, TEXT, TEXT, TEXT, DATE) IS
  'Next admission number for school/month; uses advisory lock to avoid duplicate seq under concurrency.';
