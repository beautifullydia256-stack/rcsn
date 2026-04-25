-- Check Mulungi High School students and their admission numbers

SELECT 
  s.name as student_name,
  s.admission_number,
  s.current_class,
  s.admission_date,
  sc.name as school_name,
  sc.school_code as expected_code,
  SUBSTRING(s.admission_number FROM 1 FOR 3) as actual_prefix_in_admission,
  CASE 
    WHEN s.admission_number LIKE 'MHS%' THEN 'Uses correct MHS prefix'
    WHEN s.admission_number LIKE 'SCH%' THEN 'Uses default SCH prefix (wrong)'
    ELSE 'Uses other prefix: ' || SUBSTRING(s.admission_number FROM 1 FOR 3)
  END as admission_number_analysis
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
WHERE sc.name = 'Mulungi High School'
  AND s.admission_number IS NOT NULL 
  AND s.admission_number != ''
ORDER BY s.admission_date DESC, s.admission_number
LIMIT 20;