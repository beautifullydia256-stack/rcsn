-- Fix security warnings by setting search_path for admission number functions

-- Fix generate_admission_number function
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
  v_pattern TEXT;
BEGIN
  -- Get the proper school code
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
  v_pattern := v_school_code || v_year || v_month;

  -- Block concurrent generators for this school + calendar month only
  PERFORM pg_advisory_xact_lock(
    hashtext(p_school_id::text),
    hashtext(v_year || v_month)
  );

  -- Find the highest existing sequence number for this school/year/month pattern
  SELECT COALESCE(MAX(
    CASE
      WHEN admission_number ~ ('^' || v_pattern || '[0-9]{3}$')
      THEN CAST(RIGHT(admission_number, 3) AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM students
  WHERE school_id = p_school_id
    AND admission_number LIKE (v_pattern || '%');

  v_number := LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_pattern || v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix auto_generate_admission_number function
CREATE OR REPLACE FUNCTION auto_generate_admission_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if admission_number is null or empty
  IF NEW.admission_number IS NULL OR TRIM(NEW.admission_number) = '' THEN
    NEW.admission_number := generate_admission_number(
      NEW.school_id,
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.middle_name, ''),
      COALESCE(NEW.last_name, ''),
      COALESCE(NEW.admission_date, CURRENT_DATE)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify the functions are updated
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proconfig as search_path_config
FROM pg_proc 
WHERE proname IN ('generate_admission_number', 'auto_generate_admission_number')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');