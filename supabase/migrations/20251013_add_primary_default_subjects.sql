-- ============================================================================
-- DEFAULT SUBJECTS FOR PRIMARY CLASSES (P.1 - P.7)
-- These subjects are automatically added for Primary classes
-- Schools can delete or add more subjects as needed
-- ============================================================================

-- PRIMARY 1 TO PRIMARY 3 (Lower Section)
-- Subjects: English, Mathematics, Literacy I, Literacy II, Reading, Luganda, R.E
INSERT INTO class_subjects (school_id, class_name, subject)
SELECT 
  s.school_id,
  cls.class_name,
  subj.subject_name
FROM schools s
CROSS JOIN (
  VALUES ('Primary 1'), ('Primary 2'), ('Primary 3')
) AS cls(class_name)
CROSS JOIN (
  VALUES 
    ('ENGLISH'),
    ('MATHEMATICS'),
    ('LITERACY I'),
    ('LITERACY II'),
    ('READING'),
    ('LUGANDA'),
    ('R.E')
) AS subj(subject_name)
WHERE s.type = 'Nursery/Primary'
  AND NOT EXISTS (
    SELECT 1 
    FROM class_subjects cs 
    WHERE cs.school_id = s.school_id 
      AND cs.class_name = cls.class_name 
      AND cs.subject = subj.subject_name
  );

-- PRIMARY 4 TO PRIMARY 7 (Upper Section)
-- Subjects: English, Mathematics, S.S.T, Science
INSERT INTO class_subjects (school_id, class_name, subject)
SELECT 
  s.school_id,
  cls.class_name,
  subj.subject_name
FROM schools s
CROSS JOIN (
  VALUES ('Primary 4'), ('Primary 5'), ('Primary 6'), ('Primary 7')
) AS cls(class_name)
CROSS JOIN (
  VALUES 
    ('ENGLISH'),
    ('MATHEMATICS'),
    ('S.S.T'),
    ('SCIENCE')
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
COMMENT ON TABLE class_subjects IS 'Subjects per class for each school. Primary 1-3 have 7 subjects, Primary 4-7 have 4 core subjects.';

-- ============================================================================
-- COMPLETE
-- ============================================================================

