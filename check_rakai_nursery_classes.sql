-- Check if Rakai school has the nursery classes (Baby Class, Middle Class, Top Class)
SELECT 
  s.name as school_name,
  c.class_name,
  COUNT(cs.subject) as subject_count
FROM schools s
LEFT JOIN classes c ON s.school_id = c.school_id
LEFT JOIN class_subjects cs ON s.school_id = cs.school_id AND c.class_name = cs.class_name
WHERE s.name = 'Rakai Infant Primary School'
GROUP BY s.school_id, s.name, c.class_name
ORDER BY c.class_name;

-- Also check what classes exist for Rakai
SELECT 
  class_name,
  max_students
FROM classes
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
ORDER BY class_name;