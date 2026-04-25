-- COMPREHENSIVE FIX FOR ADMISSION NUMBER FORMATS
-- This script will fix all admission number format issues and prevent future problems

-- ============================================================================
-- STEP 1: Ensure all schools have proper school codes
-- ============================================================================

-- Fix schools with missing or invalid school codes
UPDATE schools 
SET school_code = CASE 
  WHEN school_code IS NULL OR school_code = '' THEN
    -- Generate code from first letters of each word (max 3 letters)
    UPPER(LEFT(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^A-Za-z ]', '', 'g'), -- Remove non-letters except spaces
        '\s+', ' ', 'g' -- Normalize spaces
      ), 3
    ))
  ELSE school_code
END
WHERE school_code IS NULL 
   OR school_code = '' 
   OR LENGTH(school_code) < 2;

-- Handle potential duplicate school codes by adding numbers
WITH duplicate_codes AS (
  SELECT school_code, COUNT(*) as count
  FROM schools 
  WHERE school_code IS NOT NULL
  GROUP BY school_code
  HAVING COUNT(*) > 1
),
numbered_schools AS (
  SELECT 
    s.school_id,
    s.school_code,
    ROW_NUMBER() OVER (PARTITION BY s.school_code ORDER BY s.created_at) as rn
  FROM schools s
  INNER JOIN duplicate_codes dc ON s.school_code = dc.school_code
)
UPDATE schools 
SET school_code = schools.school_code || numbered_schools.rn::text
FROM numbered_schools
WHERE schools.school_id = numbered_schools.school_id 
  AND numbered_schools.rn > 1;

-- ============================================================================
-- STEP 2: Create backup of current admission numbers
-- ============================================================================

-- Add column to store old admission numbers for reference
ALTER TABLE students ADD COLUMN IF NOT EXISTS old_admission_number TEXT;

-- Backup current admission numbers
UPDATE students 
SET old_admission_number = admission_number
WHERE old_admission_number IS NULL 
  AND admission_number IS NOT NULL 
  AND admission_number != '';

-- ============================================================================
-- STEP 3: Fix admission numbers for all students
-- ============================================================================

-- Update students with wrong format admission numbers
-- First, let's do this in a simpler way using a CTE
WITH student_new_numbers AS (
  SELECT 
    s.student_id,
    sc.school_code || 
    EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at))::text ||
    LPAD(EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at))::text, 2, '0') ||
    LPAD(
      (ROW_NUMBER() OVER (
        PARTITION BY s.school_id, 
        EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at)),
        EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at))
        ORDER BY COALESCE(s.admission_date, s.created_at), s.created_at
      ))::text, 
      3, '0'
    ) as new_admission_number
  FROM students s
  JOIN schools sc ON s.school_id = sc.school_id
  WHERE s.admission_number IS NULL 
     OR s.admission_number = ''
     OR s.admission_number LIKE 'ADM-%'  -- Fix old format
     OR s.admission_number LIKE 'SCH%'   -- Fix default format
     OR NOT (s.admission_number ~ '^[A-Z]{2,5}[0-9]{4}[0-9]{2}[0-9]{3}$') -- Fix any other wrong formats
)
UPDATE students 
SET admission_number = snn.new_admission_number
FROM student_new_numbers snn
WHERE students.student_id = snn.student_id;

-- ============================================================================
-- STEP 4: Ensure the admission number generation function is correct
-- ============================================================================

-- Update the function to use school_code instead of generating abbreviation
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
  -- Get the proper school code (not abbreviation from name)
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
    
    -- Ultimate fallback
    IF v_school_code IS NULL THEN
      v_school_code := 'SCH';
    END IF;
  END IF;

  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');

  -- Lock to prevent concurrent generation conflicts
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

-- ============================================================================
-- STEP 5: Set up proper constraints
-- ============================================================================

-- Remove old global constraint (if it exists)
DROP INDEX IF EXISTS public.idx_students_admission_number;
DROP INDEX IF EXISTS public.students_admission_number_key;

-- Create proper global unique constraint (admission numbers should be globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS students_admission_number_global_key
  ON public.students (lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- ============================================================================
-- STEP 6: Create trigger to auto-generate admission numbers
-- ============================================================================

-- Function to auto-generate admission numbers on insert/update
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
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_admission_number ON students;
CREATE TRIGGER trigger_auto_generate_admission_number
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_admission_number();

-- ============================================================================
-- STEP 7: Verification queries
-- ============================================================================

-- Check schools and their codes
SELECT 
  name as school_name,
  school_code,
  CASE 
    WHEN school_code IS NULL OR school_code = '' THEN 'Missing code'
    WHEN LENGTH(school_code) < 2 THEN 'Code too short'
    ELSE 'OK'
  END as status
FROM schools
ORDER BY name;

-- Check sample admission numbers after fix
SELECT 
  sc.name as school_name,
  sc.school_code,
  s.admission_number,
  s.old_admission_number,
  CASE 
    WHEN s.admission_number ~ ('^' || sc.school_code || '[0-9]{4}[0-9]{2}[0-9]{3}$') THEN 'Correct format'
    ELSE 'Still wrong format'
  END as format_status
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL
ORDER BY sc.name, s.admission_number
LIMIT 20;

-- Check for any duplicate admission numbers
SELECT 
  admission_number,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ', ') as student_names
FROM students 
WHERE admission_number IS NOT NULL AND admission_number != ''
GROUP BY admission_number
HAVING COUNT(*) > 1;

COMMENT ON COLUMN students.old_admission_number IS 'Backup of original admission number before format fix';