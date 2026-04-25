-- Apply the correct migration for admission number generation
-- This fixes the concurrency issue during CSV import

-- Step 1: Remove the global unique constraint we created (this was wrong)
DROP INDEX IF EXISTS students_admission_number_global_key;

-- Step 2: Create global uniqueness constraint (admission numbers should be globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS students_admission_number_global_key
  ON public.students (lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- Step 3: Update the generation function to use proper school codes and locking
CREATE OR REPLACE FUNCTION public.generate_admission_number(
  p_school_id UUID,
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_admission_date DATE
) RETURNS TEXT AS $$
DECLARE
  v_school_code TEXT;
  v_year TEXT;
  v_month TEXT;
  v_sequence INT;
  v_number TEXT;
BEGIN
  -- Get the proper school code (not just abbreviation from name)
  SELECT school_code
  INTO v_school_code
  FROM schools
  WHERE school_id = p_school_id;

  -- Fallback if school code is missing
  IF v_school_code IS NULL OR LENGTH(v_school_code) < 2 THEN
    SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
    INTO v_school_code
    FROM schools
    WHERE school_id = p_school_id;
    
    IF v_school_code IS NULL THEN
      v_school_code := 'SCH';
    END IF;
  END IF;

  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');

  -- Block concurrent generators for this school + calendar month only
  PERFORM pg_advisory_xact_lock(
    hashtext(p_school_id::text),
    hashtext(v_year || v_month)
  );

  -- Get next sequence number for this school/year/month
  SELECT COALESCE(MAX(
    CASE
      WHEN admission_number ~ ('^' || v_school_code || v_year || v_month || '[0-9]+$')
      THEN CAST(SUBSTRING(admission_number FROM '[0-9]+$') AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM students
  WHERE school_id = p_school_id;

  v_number := LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_school_code || v_year || v_month || v_number;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Test the function
SELECT 
  'Testing admission number generation:' as test,
  generate_admission_number(
    (SELECT school_id FROM schools WHERE name LIKE '%Mulungi High%'),
    'Test',
    '',
    'Student',
    CURRENT_DATE
  ) as generated_number;

-- Step 5: Verify the constraint is per-school now
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'students' 
  AND (indexname LIKE '%admission%' OR indexdef LIKE '%admission%');