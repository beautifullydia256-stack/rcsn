-- CORRECT Migration: Add "Writing" subject to nursery configuration
-- Tables: pre_primary_holistic_strands and pre_primary_holistic_skills

-- Step 1: Check what schools have nursery configuration
SELECT DISTINCT school_id 
FROM pre_primary_holistic_strands
ORDER BY school_id;

-- Step 2: For each school, add Writing strand and skill
-- Replace 'YOUR_SCHOOL_ID_HERE' with your actual school_id from Step 1

DO $$
DECLARE
  v_school_id uuid;
  v_strand_id uuid;
  v_max_sort_order int;
  v_writing_exists boolean;
BEGIN
  -- Loop through all schools that have nursery config
  FOR v_school_id IN 
    SELECT DISTINCT school_id FROM pre_primary_holistic_strands
  LOOP
    -- Check if Writing strand already exists for this school
    SELECT EXISTS (
      SELECT 1 
      FROM pre_primary_holistic_strands
      WHERE school_id = v_school_id
        AND subject = 'Writing'
    ) INTO v_writing_exists;
    
    IF NOT v_writing_exists THEN
      -- Get the max sort_order to add Writing at the end
      SELECT COALESCE(MAX(sort_order), 0) + 1
      INTO v_max_sort_order
      FROM pre_primary_holistic_strands
      WHERE school_id = v_school_id;
      
      -- Insert Writing strand
      INSERT INTO pre_primary_holistic_strands (school_id, subject, sort_order)
      VALUES (v_school_id, 'Writing', v_max_sort_order)
      RETURNING id INTO v_strand_id;
      
      -- Insert Writing skill
      INSERT INTO pre_primary_holistic_skills (school_id, strand_id, skill_key, label, sort_order)
      VALUES (v_school_id, v_strand_id, 'writing', 'Writing', 1);
      
      RAISE NOTICE 'Added Writing subject to school: %', v_school_id;
    ELSE
      RAISE NOTICE 'Writing subject already exists for school: %', v_school_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Step 3: Verify the changes
SELECT 
  s.name AS school_name,
  COUNT(DISTINCT phs.id) AS number_of_subjects,
  string_agg(DISTINCT phs.subject, ', ' ORDER BY phs.subject) AS subjects
FROM pre_primary_holistic_strands phs
JOIN schools s ON s.id = phs.school_id
GROUP BY s.name
ORDER BY s.name;

-- Step 4: Check Writing specifically
SELECT 
  s.name AS school_name,
  phs.subject,
  phsk.skill_key,
  phsk.label
FROM pre_primary_holistic_strands phs
JOIN schools s ON s.id = phs.school_id
LEFT JOIN pre_primary_holistic_skills phsk ON phsk.strand_id = phs.id
WHERE phs.subject = 'Writing'
ORDER BY s.name;
