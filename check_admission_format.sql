-- Check the actual format of admission numbers in your database

-- Step 1: See sample admission numbers from your existing students
SELECT 
  s.name,
  s.current_class,
  s.admission_number,
  s.admission_date,
  sc.name as school_name
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL 
  AND s.admission_number != ''
ORDER BY s.created_at DESC
LIMIT 20;

-- Step 2: Check the pattern/format of admission numbers
SELECT 
  admission_number,
  LENGTH(admission_number) as length,
  CASE 
    WHEN admission_number ~ '^[A-Z]{3}[0-9]{4}[0-9]{2}[0-9]{3}$' THEN 'Format: SCH2025010001 (School+Year+Month+Sequence)'
    WHEN admission_number ~ '^[A-Z]{3}-[0-9]{4}-[0-9]{2}-[0-9]+$' THEN 'Format: SCH-2025-01-001 (School-Year-Month-Sequence)'
    WHEN admission_number ~ '^[0-9]+$' THEN 'Format: Simple numbers (001, 002, etc.)'
    WHEN admission_number ~ '^[A-Z]+[0-9]+$' THEN 'Format: Letters+Numbers (ABC123)'
    ELSE 'Custom/Other format'
  END as format_type,
  COUNT(*) as count
FROM students 
WHERE admission_number IS NOT NULL 
  AND admission_number != ''
GROUP BY admission_number, LENGTH(admission_number)
ORDER BY count DESC, admission_number
LIMIT 15;

-- Step 3: Check if there are any duplicate admission numbers across different schools
SELECT 
  admission_number,
  COUNT(DISTINCT s.school_id) as schools_with_same_number,
  COUNT(*) as total_students,
  STRING_AGG(DISTINCT sc.name, ', ') as school_names
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL 
  AND s.admission_number != ''
GROUP BY admission_number
HAVING COUNT(DISTINCT s.school_id) > 1
ORDER BY total_students DESC;

-- Step 4: Show the current constraint causing the problem
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'students' 
  AND (indexname LIKE '%admission%' OR indexdef LIKE '%admission%');