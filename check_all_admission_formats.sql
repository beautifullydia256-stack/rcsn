-- Check admission number formats across all schools

SELECT 
  sc.name as school_name,
  sc.school_code,
  s.admission_number,
  CASE 
    WHEN s.admission_number LIKE 'ADM-%' THEN 'Old format: ADM-YYYY-NNNN'
    WHEN s.admission_number ~ '^[A-Z]{3}[0-9]{4}[0-9]{2}[0-9]+$' THEN 'New format: SCHOOL+YEAR+MONTH+SEQ'
    WHEN s.admission_number LIKE (sc.school_code || '%') THEN 'Uses school code prefix'
    WHEN s.admission_number LIKE 'SCH%' THEN 'Uses default SCH prefix'
    ELSE 'Other format'
  END as format_type,
  COUNT(*) as student_count
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE s.admission_number IS NOT NULL 
  AND s.admission_number != ''
GROUP BY sc.name, sc.school_code, s.admission_number, format_type
ORDER BY sc.name, student_count DESC;