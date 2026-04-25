-- Check school codes and names to see if they're properly set up

-- Step 1: Check schools and their codes
SELECT 
  school_id,
  name as school_name,
  school_code,
  UPPER(SUBSTRING(name FROM 1 FOR 3)) as generated_abbr_from_name,
  CASE 
    WHEN school_code IS NULL THEN 'Missing school code'
    WHEN LENGTH(school_code) < 3 THEN 'School code too short'
    WHEN school_code != UPPER(SUBSTRING(name FROM 1 FOR 3)) THEN 'School code doesn\'t match name pattern'
    ELSE 'OK'
  END as status
FROM schools
ORDER BY name;

-- Step 2: Check sample admission numbers and their patterns
SELECT 
  s.admission_number,
  s.name as student_name,
  sc.name as school_name,
  sc.school_code,
  UPPER(SUBSTRING(sc.name FROM 1 FOR 3)) as expected_prefix,
  CASE 
    WHEN s.admission_number LIKE (COALESCE(sc.school_code, UPPER(SUBSTRING(sc.name FROM 1 FOR 3))) || '%') THEN 'Correct prefix'
    ELSE 'Wrong prefix - should start with ' || COALESCE(sc.school_code, UPPER(SUBSTRING(sc.name FROM 1 FOR 3)))
  END as admission_number_status
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL 
  AND s.admission_number != ''
ORDER BY sc.name, s.admission_number
LIMIT 20;

-- Step 3: Check for schools without proper codes
SELECT 
  COUNT(*) as schools_without_codes
FROM schools 
WHERE school_code IS NULL OR school_code = '';

-- Step 4: Check for duplicate school codes
SELECT 
  school_code,
  COUNT(*) as schools_with_same_code,
  STRING_AGG(name, ', ') as school_names
FROM schools 
WHERE school_code IS NOT NULL AND school_code != ''
GROUP BY school_code
HAVING COUNT(*) > 1;