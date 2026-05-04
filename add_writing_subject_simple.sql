-- Simple Migration: Add "Writing" subject to nursery configuration
-- Run this in your Supabase SQL Editor

-- First, let's see what we have
SELECT 
  school_id,
  strands
FROM pre_primary_holistic_config
LIMIT 1;

-- Add Writing to all schools that have pre-primary config
UPDATE pre_primary_holistic_config
SET strands = strands || '[
  {
    "subject": "Writing",
    "skills": [
      {
        "key": "writing",
        "label": "Writing"
      }
    ]
  }
]'::jsonb,
updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(strands) AS strand
  WHERE strand->>'subject' = 'Writing'
);

-- Verify the update
SELECT 
  school_id,
  jsonb_array_length(strands) AS number_of_subjects,
  (
    SELECT string_agg(strand->>'subject', ', ')
    FROM jsonb_array_elements(strands) AS strand
  ) AS subject_list
FROM pre_primary_holistic_config;
