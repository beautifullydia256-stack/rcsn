-- Fix admission numbers safely by handling duplicates properly

-- Step 1: Temporarily remove the unique constraint
DROP INDEX IF EXISTS students_admission_number_global_key;

-- Step 2: Update admission numbers with proper sequencing to avoid duplicates
WITH student_new_numbers AS (
  SELECT 
    s.student_id,
    s.school_id,
    sc.school_code,
    EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at)) as year_part,
    EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at)) as month_part,
    ROW_NUMBER() OVER (
      PARTITION BY 
        s.school_id, 
        EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at)),
        EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at))
      ORDER BY 
        COALESCE(s.admission_date, s.created_at), 
        s.created_at,
        s.student_id  -- Add student_id for consistent ordering
    ) as sequence_num
  FROM students s
  JOIN schools sc ON s.school_id = sc.school_id
  WHERE s.admission_number IS NOT NULL 
    AND s.admission_number != ''
    -- Only update students whose admission numbers don't start with their school code
    AND NOT (s.admission_number LIKE (sc.school_code || '%'))
),
formatted_numbers AS (
  SELECT 
    student_id,
    school_code || 
    year_part::text ||
    LPAD(month_part::text, 2, '0') ||
    LPAD(sequence_num::text, 3, '0') as new_admission_number
  FROM student_new_numbers
)
UPDATE students 
SET admission_number = fn.new_admission_number
FROM formatted_numbers fn
WHERE students.student_id = fn.student_id;

-- Step 3: Check for any remaining duplicates before recreating constraint
SELECT 
  admission_number,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ', ') as student_names
FROM students 
WHERE admission_number IS NOT NULL AND admission_number != ''
GROUP BY admission_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 4: If no duplicates found above, recreate the unique constraint
-- (Run this only if the query above returns no results)
CREATE UNIQUE INDEX students_admission_number_global_key
  ON public.students (lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

-- Step 5: Verification - check the final results
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
LIMIT 25;