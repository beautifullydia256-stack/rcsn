-- Step 1: Check what subjects exist for each school
SELECT 
  s.name as school_name,
  COUNT(subj.subject_id) as total_subjects,
  STRING_AGG(subj.name, ', ' ORDER BY subj.name) as subject_list
FROM schools s
LEFT JOIN subjects subj ON s.school_id = subj.school_id
WHERE s.name IN ('Mulungi Infant Primary School', 'Rakai Infant Primary School')
GROUP BY s.school_id, s.name
ORDER BY s.name;

-- Step 2: Check current class-subject assignments
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

-- Step 3: Check which classes are missing subject assignments
SELECT 
  s.name as school_name,
  c.class_name,
  CASE 
    WHEN COUNT(cs.subject) = 0 THEN 'NO SUBJECTS'
    ELSE 'HAS SUBJECTS'
  END as status,
  COUNT(cs.subject) as subject_count
FROM schools s
JOIN classes c ON s.school_id = c.school_id
LEFT JOIN class_subjects cs ON s.school_id = cs.school_id AND c.class_name = cs.class_name
WHERE s.name IN ('Mulungi Infant Primary School', 'Rakai Infant Primary School')
GROUP BY s.school_id, s.name, c.class_name
ORDER BY s.name, c.class_name;
