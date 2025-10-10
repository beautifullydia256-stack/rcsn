-- ============================================================================
-- Generate admission numbers for students who don't have them
-- Format: SCHOOL-YEAR-MONTH-NUMBER (e.g., KPS-2025-01-001)
-- ============================================================================

-- Function to generate admission number based on school abbreviation, admission date
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
  -- Get school abbreviation (first 3 letters of school name, uppercase)
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
  INTO v_school_abbr
  FROM schools
  WHERE school_id = p_school_id;
  
  -- If no school found or name is too short, use 'SCH'
  IF v_school_abbr IS NULL OR LENGTH(v_school_abbr) < 3 THEN
    v_school_abbr := 'SCH';
  END IF;
  
  -- Extract year and month from admission date
  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');
  
  -- Format sequence number with leading zeros (3 digits)
  v_number := LPAD(p_sequence::TEXT, 3, '0');
  
  -- Return formatted admission number
  RETURN v_school_abbr || '-' || v_year || '-' || v_month || '-' || v_number;
END;
$$ LANGUAGE plpgsql;

-- Update existing students who don't have admission numbers
DO $$
DECLARE
  v_student RECORD;
  v_sequence INT;
  v_new_admission_number TEXT;
BEGIN
  -- Process each school separately to maintain proper sequencing
  FOR v_student IN (
    SELECT 
      student_id,
      school_id,
      COALESCE(admission_date, created_at::DATE, CURRENT_DATE) AS admission_date,
      ROW_NUMBER() OVER (
        PARTITION BY school_id 
        ORDER BY COALESCE(admission_date, created_at::DATE, CURRENT_DATE), created_at
      ) AS seq
    FROM students
    WHERE admission_number IS NULL OR admission_number = ''
    ORDER BY school_id, admission_date, created_at
  ) LOOP
    -- Generate admission number
    v_new_admission_number := generate_admission_number_for_student(
      v_student.school_id,
      v_student.admission_date,
      v_student.seq::INT
    );
    
    -- Update student record
    UPDATE students
    SET admission_number = v_new_admission_number
    WHERE student_id = v_student.student_id;
    
    RAISE NOTICE 'Generated admission number % for student %', v_new_admission_number, v_student.student_id;
  END LOOP;
END $$;

-- Create RPC function for future use when adding new students
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
  -- Get school abbreviation (first 3 letters of school name, uppercase)
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
  INTO v_school_abbr
  FROM schools
  WHERE school_id = p_school_id;
  
  -- If no school found or name is too short, use 'SCH'
  IF v_school_abbr IS NULL OR LENGTH(v_school_abbr) < 3 THEN
    v_school_abbr := 'SCH';
  END IF;
  
  -- Extract year and month from admission date
  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');
  
  -- Get next sequence number for this school, year, and month
  SELECT COALESCE(MAX(
    CASE 
      WHEN admission_number ~ (v_school_abbr || '-' || v_year || '-' || v_month || '-[0-9]+')
      THEN CAST(SUBSTRING(admission_number FROM '[0-9]+$') AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM students
  WHERE school_id = p_school_id;
  
  -- Format sequence number with leading zeros (3 digits)
  v_number := LPAD(v_sequence::TEXT, 3, '0');
  
  -- Return formatted admission number
  RETURN v_school_abbr || '-' || v_year || '-' || v_month || '-' || v_number;
END;
$$ LANGUAGE plpgsql;

-- Verify the update
DO $$
DECLARE
  v_total INT;
  v_with_admission INT;
  v_without_admission INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM students;
  SELECT COUNT(*) INTO v_with_admission FROM students WHERE admission_number IS NOT NULL AND admission_number <> '';
  SELECT COUNT(*) INTO v_without_admission FROM students WHERE admission_number IS NULL OR admission_number = '';
  
  RAISE NOTICE '=== Admission Number Generation Complete ===';
  RAISE NOTICE 'Total students: %', v_total;
  RAISE NOTICE 'Students with admission numbers: %', v_with_admission;
  RAISE NOTICE 'Students without admission numbers: %', v_without_admission;
END $$;

