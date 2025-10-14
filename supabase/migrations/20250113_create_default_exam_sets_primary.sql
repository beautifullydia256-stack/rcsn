-- Create default exam sets for all primary schools
-- This migration adds "Mid Term" and "End of Term" exam sets to all Nursery/Primary schools

-- Insert default exam sets for all primary schools
INSERT INTO exam_sets (school_id, name, term, year, is_published, created_at, updated_at)
SELECT 
    s.school_id,
    exam_name,
    CASE 
        WHEN exam_name = 'Mid Term' THEN 1
        WHEN exam_name = 'End of Term' THEN 3
    END as term,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    false as is_published,
    NOW() as created_at,
    NOW() as updated_at
FROM schools s
CROSS JOIN (
    VALUES ('Mid Term'), ('End of Term')
) AS exam_sets(exam_name)
WHERE s.type = 'Nursery/Primary'
AND NOT EXISTS (
    SELECT 1 FROM exam_sets es 
    WHERE es.school_id = s.school_id 
    AND es.name = exam_sets.exam_name
    AND es.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Add comment for documentation
COMMENT ON TABLE exam_sets IS 'Exam sets for schools - includes default Mid Term and End of Term for primary schools';
