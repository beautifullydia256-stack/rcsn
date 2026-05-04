-- SIMPLE & CORRECT: Add Writing subject to nursery
-- Run this in Supabase SQL Editor

-- First, see your school_id
SELECT id, name FROM schools LIMIT 5;

-- Then run this (it will add Writing to ALL schools that have nursery config)
DO $$
DECLARE
  v_school_id uuid;
  v_strand_id uuid;
  v_max_sort int;
BEGIN
  FOR v_school_id IN 
    SELECT DISTINCT school_id FROM pre_primary_holistic_strands
  LOOP
    -- Check if Writing already exists
    IF NOT EXISTS (
      SELECT 1 FROM pre_primary_holistic_strands 
      WHERE school_id = v_school_id AND subject = 'Writing'
    ) THEN
      -- Get next sort order
      SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max_sort
      FROM pre_primary_holistic_strands WHERE school_id = v_school_id;
      
      -- Add Writing strand
      INSERT INTO pre_primary_holistic_strands (school_id, subject, sort_order)
      VALUES (v_school_id, 'Writing', v_max_sort)
      RETURNING id INTO v_strand_id;
      
      -- Add Writing skill
      INSERT INTO pre_primary_holistic_skills (school_id, strand_id, skill_key, label, sort_order)
      VALUES (v_school_id, v_strand_id, 'writing', 'Writing', 1);
      
      RAISE NOTICE 'Added Writing to school %', v_school_id;
    END IF;
  END LOOP;
END $$;

-- Verify it worked
SELECT 
  s.name,
  COUNT(*) as subject_count,
  string_agg(phs.subject, ', ' ORDER BY phs.sort_order) as subjects
FROM pre_primary_holistic_strands phs
JOIN schools s ON s.id = phs.school_id
GROUP BY s.name;
