-- Check what exam sets exist for primary schools
-- This will help us understand why we only have Mid Term results

-- Check exam sets for primary schools
SELECT 
  es.id,
  es.name,
  es.term,
  es.year,
  s.name as school_name,
  s.type as school_type,
  es.is_active
FROM exam_sets es
JOIN schools s ON s.school_id = es.school_id
WHERE s.type = 'Nursery/Primary'
ORDER BY s.name, es.term, es.name;

-- Check if there are any End of Term exam sets
SELECT 
  es.name,
  COUNT(*) as count
FROM exam_sets es
JOIN schools s ON s.school_id = es.school_id
WHERE s.type = 'Nursery/Primary'
GROUP BY es.name
ORDER BY es.name;
