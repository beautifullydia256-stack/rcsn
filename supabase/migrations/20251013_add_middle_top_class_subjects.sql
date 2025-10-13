-- ============================================================================
-- DEFAULT SUBJECTS FOR MIDDLE CLASS AND TOP CLASS (PRIMARY SCHOOLS)
-- These subjects are automatically added for Middle and Top Classes
-- Schools can delete or add more subjects as needed
-- ============================================================================

-- Insert default Middle Class and Top Class subjects for all Nursery/Primary schools
INSERT INTO class_subjects (school_id, class_name, subject)
SELECT 
  s.school_id,
  cls.class_name,
  subj.subject_name
FROM schools s
CROSS JOIN (
  VALUES ('Middle Class'), ('Top Class')
) AS cls(class_name)
CROSS JOIN (
  VALUES 
    ('LANGUAGE DEVELOPMENT 1'),
    ('LANGUAGE DEVELOPMENT 11'),
    ('NUMBERS'),
    ('HEALTH HABITS'),
    ('SOCIAL DEVELOPMENT'),
    ('WRITING')
) AS subj(subject_name)
WHERE s.type = 'Nursery/Primary'
  AND NOT EXISTS (
    SELECT 1 
    FROM class_subjects cs 
    WHERE cs.school_id = s.school_id 
      AND cs.class_name = cls.class_name 
      AND cs.subject = subj.subject_name
  );

-- Add comment
COMMENT ON TABLE class_subjects IS 'Middle Class and Top Class focus on language development, numbers, health, social skills, and writing.';

-- ============================================================================
-- COMPLETE
-- ============================================================================

