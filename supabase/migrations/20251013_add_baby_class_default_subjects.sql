-- ============================================================================
-- DEFAULT SUBJECTS FOR BABY CLASS (PRIMARY SCHOOLS)
-- These subjects are automatically added for Baby Class in all Primary schools
-- Schools can delete or add more subjects as needed
-- ============================================================================

-- Insert default Baby Class subjects for all Nursery/Primary schools
INSERT INTO class_subjects (school_id, class_name, subject_name)
SELECT 
  s.school_id,
  'Baby Class' as class_name,
  subject.subject_name
FROM schools s
CROSS JOIN (
  VALUES 
    ('Toilet'),
    ('Recognition of numbers'),
    ('Property care'),
    ('Handling of pencil'),
    ('Re-sighting Alphabet'),
    ('Attention span'),
    ('Punctuality'),
    ('Shading'),
    ('Nose care'),
    ('Recognition of shapes'),
    ('Respect'),
    ('Arrival time'),
    ('Counting Number sequence'),
    ('Re-sighting Poems'),
    ('Love or Interest'),
    ('Drawing'),
    ('Recognition of letters'),
    ('Sharing'),
    ('Friendship'),
    ('Colours'),
    ('Playing'),
    ('Emotional'),
    ('Smartness')
) AS subject(subject_name)
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, class_name, subject_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE class_subjects IS 'Subjects per class for each school. Includes default subjects that can be customized.';

-- ============================================================================
-- COMPLETE
-- ============================================================================

