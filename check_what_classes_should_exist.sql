-- Check what classes SHOULD exist for Nursery/Primary schools
-- by looking at a working school like Mulungi

SELECT 
  s.name as school_name,
  s.type as school_type,
  COUNT(c.class_name) as total_classes,
  STRING_AGG(c.class_name, ', ' ORDER BY c.class_name) as all_classes
FROM schools s
LEFT JOIN classes c ON s.school_id = c.school_id
WHERE s.name IN ('Mulungi Infant Primary School', 'Rakai Infant Primary School')
GROUP BY s.school_id, s.name, s.type
ORDER BY s.name;