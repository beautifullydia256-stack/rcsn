-- Check what subjects are assigned to each class for both schools
SELECT 
  s.name as school_name,
  cs.class_name,
  COUNT(cs.subject) as subject_count,
  STRING_AGG(cs.subject, ', ' ORDER BY cs.subject) as subjects
FROM schools s
LEFT JOIN class_subjects cs ON s.school_id = cs.school_id
WHERE s.name IN ('Mulungi Infant Primary School', 'Rakai Infant Primary School')
GROUP BY s.school_id, s.name, cs.class_name
ORDER BY s.name, cs.class_name;
