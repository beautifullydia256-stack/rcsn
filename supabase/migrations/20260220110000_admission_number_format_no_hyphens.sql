-- Admission number format: no hyphens (e.g. KAM202503001 instead of KAM-2025-03-001)
-- Still matches existing hyphenated numbers when computing next sequence.

-- Helper used by backfills (if any)
CREATE OR REPLACE FUNCTION generate_admission_number_for_student(
  p_school_id UUID,
  p_admission_date DATE,
  p_sequence INT
) RETURNS TEXT AS $$
DECLARE
  v_school_abbr TEXT;
  v_year TEXT;
  v_month TEXT;
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
  v_number := LPAD(p_sequence::TEXT, 3, '0');

  RETURN v_school_abbr || v_year || v_month || v_number;
END;
$$ LANGUAGE plpgsql;

-- RPC used when adding new students
CREATE OR REPLACE FUNCTION generate_admission_number(
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

  -- Next sequence: match both old (KAM-2025-03-001) and new (KAM202503001) formats
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
