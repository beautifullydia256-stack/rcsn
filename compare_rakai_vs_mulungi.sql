-- Compare Rakai (broken) vs Mulungi (working) to find the difference

-- 1. Check both schools' basic info
SELECT 
  school_id,
  name,
  type,
  created_at
FROM schools 
WHERE name ILIKE '%rakai%infant%' OR name ILIKE '%mulungi%infant%'
ORDER BY name;

-- 2. Compare subjects structure for both schools
SELECT 
  s.name as school_name,
  subj.subject_id,
  subj.name as subject_name,
  subj.created_at
FROM schools s
JOIN subjects subj ON s.school_id = subj.school_id
WHERE s.name ILIKE '%rakai%infant%' OR s.name ILIKE '%mulungi%infant%'
ORDER BY s.name, subj.name;

-- 3. Check if there are any missing columns or different data structure
SELECT 
  s.name as school_name,
  COUNT(subj.subject_id) as subject_count,
  COUNT(c.class_name) as class_count
FROM schools s
LEFT JOIN subjects subj ON s.school_id = subj.school_id
LEFT JOIN classes c ON s.school_id = c.school_id
WHERE s.name ILIKE '%rakai%infant%' OR s.name ILIKE '%mulungi%infant%'
GROUP BY s.school_id, s.name
ORDER BY s.name;

-- 4. Check if there are any class-subject assignments (this might be the missing link)
SELECT 
  s.name as school_name,
  cs.class_name,
  cs.subject,
  COUNT(*) as assignment_count
FROM schools s
LEFT JOIN class_subjects cs ON s.school_id = cs.school_id
WHERE s.name ILIKE '%rakai%infant%' OR s.name ILIKE '%mulungi%infant%'
GROUP BY s.school_id, s.name, cs.class_name, cs.subject
ORDER BY s.name, cs.class_name, cs.subject;