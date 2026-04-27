-- Check if Rakai Infant Primary School now has subjects
SELECT 
  s.school_id,
  s.name as school_name,
  s.type as school_type,
  COUNT(subj.name) as subject_count,
  STRING_AGG(subj.name, ', ' ORDER BY subj.name) as subjects_list
FROM schools s
LEFT JOIN subjects subj ON s.school_id = subj.school_id
WHERE s.name ILIKE '%rakai%infant%' OR s.name ILIKE '%rakai%primary%'
GROUP BY s.school_id, s.name, s.type;

-- Also check classes count for comparison
SELECT 
  s.school_id,
  s.name as school_name,
  COUNT(c.class_name) as class_count,
  STRING_AGG(c.class_name, ', ' ORDER BY c.class_name) as classes_list
FROM schools s
LEFT JOIN classes c ON s.school_id = c.school_id
WHERE s.name ILIKE '%rakai%infant%' OR s.name ILIKE '%rakai%primary%'
GROUP BY s.school_id, s.name;