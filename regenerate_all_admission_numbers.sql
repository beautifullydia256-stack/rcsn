-- Regenerate ALL admission numbers from scratch to eliminate any conflicts

-- Step 1: Remove constraint
DROP INDEX IF EXISTS students_admission_number_global_key;

-- Step 2: Show the problematic duplicates first
SELECT 
  admission_number,
  COUNT(*) as count,
  STRING_AGG(s.name || ' (ID: ' || s.student_id || ')', ', ') as students
FROM students s
WHERE admission_number IS NOT NULL AND admission_number != ''
GROUP BY admission_number
HAVING COUNT(*) > 1
ORDER BY admission_number;

-- Step 3: Regenerate ALL admission numbers from scratch
-- This ensures proper sequencing and no conflicts
WITH all_students_resequenced AS (
  SELECT 
    s.student_id,
    sc.school_code,
    EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at)) as year_part,
    EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at)) as month_part,
    -- Global sequence per school/year/month starting from 1
    ROW_NUMBER() OVER (
      PARTITION BY 
        s.school_id,
        EXTRACT(YEAR FROM COALESCE(s.admission_date, s.created_at)),
        EXTRACT(MONTH FROM COALESCE(s.admission_date, s.created_at))
      ORDER BY 
        COALESCE(s.admission_date, s.created_at),
        s.created_at,
        s.student_id
    ) as new_sequence
  FROM students s
  JOIN schools sc ON s.school_id = sc.school_id
  WHERE s.admission_number IS NOT NULL AND s.admission_number != ''
)
UPDATE students 
SET admission_number = (
  asr.school_code || 
  asr.year_part::text ||
  LPAD(asr.month_part::text, 2, '0') ||
  LPAD(asr.new_sequence::text, 3, '0')
)
FROM all_students_resequenced asr
WHERE students.student_id = asr.student_id;

-- Step 4: Check for any remaining duplicates
SELECT 
  admission_number,
  COUNT(*) as count
FROM students 
WHERE admission_number IS NOT NULL AND admission_number != ''
GROUP BY admission_number
HAVING COUNT(*) > 1;

-- Step 5: Show sample of regenerated numbers
SELECT 
  sc.name as school_name,
  sc.school_code,
  s.admission_number,
  s.name as student_name
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL
ORDER BY sc.name, s.admission_number
LIMIT 20;