-- Fix remaining students who still don't have correct school code prefixes

-- Update ALL students to use their proper school codes
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
  WHERE s.admission_number IS NOT NULL 
    AND s.admission_number != ''
    -- Fix students whose admission numbers don't start with their school code
    AND NOT (s.admission_number LIKE (sc.school_code || '%'))
)
UPDATE students 
SET admission_number = snn.new_admission_number
FROM student_new_numbers snn
WHERE students.student_id = snn.student_id;

-- Verification: Check the results
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