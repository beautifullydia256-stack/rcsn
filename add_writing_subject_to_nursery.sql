-- Migration: Add "Writing" subject to nursery pre-primary holistic configuration
-- This adds Writing as a 6th subject for nursery classes

-- Check if the configuration exists and add Writing strand
DO $$
DECLARE
  v_school_id uuid;
  v_config_id uuid;
  v_existing_strands jsonb;
  v_new_strands jsonb;
  v_writing_exists boolean;
BEGIN
  -- Loop through all schools
  FOR v_school_id IN 
    SELECT id FROM schools
  LOOP
    -- Get the pre-primary holistic config for this school
    SELECT id, strands INTO v_config_id, v_existing_strands
    FROM pre_primary_holistic_config
    WHERE school_id = v_school_id;
    
    -- If config exists, check if Writing already exists
    IF v_config_id IS NOT NULL THEN
      -- Check if Writing strand already exists
      SELECT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(v_existing_strands) AS strand
        WHERE strand->>'subject' = 'Writing'
      ) INTO v_writing_exists;
      
      -- If Writing doesn't exist, add it
      IF NOT v_writing_exists THEN
        -- Add Writing strand to existing strands
        v_new_strands := v_existing_strands || jsonb_build_array(
          jsonb_build_object(
            'subject', 'Writing',
            'skills', jsonb_build_array(
              jsonb_build_object(
                'key', 'writing',
                'label', 'Writing'
              )
            )
          )
        );
        
        -- Update the configuration
        UPDATE pre_primary_holistic_config
        SET strands = v_new_strands,
            updated_at = now()
        WHERE id = v_config_id;
        
        RAISE NOTICE 'Added Writing subject to school: %', v_school_id;
      ELSE
        RAISE NOTICE 'Writing subject already exists for school: %', v_school_id;
      END IF;
    ELSE
      -- If no config exists, create one with all 6 subjects including Writing
      INSERT INTO pre_primary_holistic_config (school_id, strands, created_at, updated_at)
      VALUES (
        v_school_id,
        jsonb_build_array(
          jsonb_build_object(
            'subject', 'Relating with others (Social development)',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'relating_with_others', 'label', 'Relating with others'),
              jsonb_build_object('key', 'games', 'label', 'Games'),
              jsonb_build_object('key', 'helping', 'label', 'Helping others')
            )
          ),
          jsonb_build_object(
            'subject', 'Relating and knowing my environment (Language I)',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'naming', 'label', 'Naming'),
              jsonb_build_object('key', 'cleanliness', 'label', 'Cleanliness'),
              jsonb_build_object('key', 'caring_for_the_environment', 'label', 'Caring for the environment')
            )
          ),
          jsonb_build_object(
            'subject', 'Taking care of myself (Health habits)',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'taking_care_of_myself', 'label', 'Taking care of myself'),
              jsonb_build_object('key', 'toilet_habits', 'label', 'Toilet habits'),
              jsonb_build_object('key', 'body_hygiene', 'label', 'Body hygiene')
            )
          ),
          jsonb_build_object(
            'subject', 'Development and using mathematical concepts',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'reciting_numbers', 'label', 'Reciting numbers'),
              jsonb_build_object('key', 'counting_concepts', 'label', 'Counting concepts'),
              jsonb_build_object('key', 'addition_concepts', 'label', 'Additional concepts')
            )
          ),
          jsonb_build_object(
            'subject', 'Development and using language (Language II)',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'drawing', 'label', 'Drawing'),
              jsonb_build_object('key', 'reading', 'label', 'Reading'),
              jsonb_build_object('key', 'writing', 'label', 'Writing')
            )
          ),
          jsonb_build_object(
            'subject', 'Writing',
            'skills', jsonb_build_array(
              jsonb_build_object('key', 'writing', 'label', 'Writing')
            )
          )
        ),
        now(),
        now()
      );
      
      RAISE NOTICE 'Created new pre-primary config with Writing for school: %', v_school_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Verify the changes
SELECT 
  s.name AS school_name,
  jsonb_array_length(pphc.strands) AS number_of_subjects,
  jsonb_pretty(pphc.strands) AS subjects_configuration
FROM pre_primary_holistic_config pphc
JOIN schools s ON s.id = pphc.school_id
ORDER BY s.name;
