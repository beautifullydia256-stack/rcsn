-- Recreate the unique constraint and verify everything is working

-- Step 1: Recreate the unique constraint
CREATE UNIQUE INDEX students_admission_number_global_key
  ON public.students (lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- Step 2: Verify all admission number formats are correct
SELECT 
  sc.name as school_name,
  sc.school_code,
  s.admission_number,
  s.old_admission_number,
  CASE 
    WHEN s.admission_number ~ ('^' || sc.school_code || '[0-9]{4}[0-9]{2}[0-9]{3}') THEN 'Correct format'
    ELSE 'Still wrong format'
  END as format_status
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL
ORDER BY sc.name, s.admission_number
LIMIT 30;

-- Step 3: Test the admission number generation function
SELECT generate_admission_number(
  (SELECT school_id FROM schools WHERE name = 'Mulungi High School'),
  'Test',
  '',
  'Student',
  CURRENT_DATE
) as test_admission_number;

-- Step 4: Show summary by school
SELECT 
  sc.name as school_name,
  sc.school_code,
  COUNT(s.student_id) as total_students,
  COUNT(CASE WHEN s.admission_number ~ ('^' || sc.school_code || '[0-9]{4}[0-9]{2}[0-9]{3}') THEN 1 END) as correct_format,
  COUNT(CASE WHEN NOT s.admission_number ~ ('^' || sc.school_code || '[0-9]{4}[0-9]{2}[0-9]{3}') THEN 1 END) as wrong_format
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL AND s.admission_number != ''
GROUP BY sc.name, sc.school_code
ORDER BY sc.name;