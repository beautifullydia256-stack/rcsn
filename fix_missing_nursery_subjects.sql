-- FIX: Add missing nursery class subjects to schools that have primary classes but no nursery subjects
-- This fixes the bug where schools with partial class-subject assignments were skipped

DO $$
DECLARE
    school_record RECORD;
    nursery_subject_count INTEGER;
BEGIN
    RAISE NOTICE 'Adding missing nursery class subjects to all Nursery/Primary schools...';
    
    FOR school_record IN 
        SELECT DISTINCT s.school_id, s.name, s.type 
        FROM schools s
        JOIN classes c ON s.school_id = c.school_id
        WHERE s.type IN ('Primary', 'Nursery/Primary')
          AND c.class_name IN ('Baby Class', 'Middle Class', 'Top Class')
    LOOP
        -- Check if this school already has nursery class subjects
        SELECT COUNT(*) INTO nursery_subject_count 
        FROM class_subjects 
        WHERE school_id = school_record.school_id 
          AND class_name IN ('Baby Class', 'Middle Class', 'Top Class');
        
        -- If no nursery subjects, add them
        IF nursery_subject_count = 0 THEN
            RAISE NOTICE 'Adding nursery subjects for school: %', school_record.name;
            
            INSERT INTO public.class_subjects (school_id, class_name, subject)
            SELECT school_record.school_id, class_name, subject_name
            FROM (VALUES 
                ('Baby Class'), ('Middle Class'), ('Top Class')
            ) AS nursery_classes(class_name)
            CROSS JOIN (VALUES 
                ('Development and using language (Language II)'),
                ('Development and using mathematical concepts'),
                ('Relating and knowing my environment (Language I)'),
                ('Relating with others (Social development)'),
                ('Taking care of myself (Health habits)')
            ) AS nursery_subjects(subject_name)
            WHERE EXISTS (
                SELECT 1 FROM classes c 
                WHERE c.school_id = school_record.school_id 
                  AND c.class_name = nursery_classes.class_name
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.class_subjects cs
                WHERE cs.school_id = school_record.school_id 
                  AND cs.class_name = nursery_classes.class_name 
                  AND cs.subject = subject_name
            );
            
            RAISE NOTICE 'Successfully added nursery subjects for: %', school_record.name;
        ELSE
            RAISE NOTICE 'School % already has nursery subjects', school_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed adding missing nursery class subjects';
END $$;

-- Verify the fix
SELECT 
  s.name as school_name,
  cs.class_name,
  COUNT(cs.subject) as subject_count,
  STRING_AGG(cs.subject, ', ' ORDER BY cs.subject) as subjects
FROM schools s
LEFT JOIN class_subjects cs ON s.school_id = cs.school_id
WHERE s.name IN ('Mulungi Infant Primary School', 'Rakai Infant Primary School')
  AND cs.class_name IN ('Baby Class', 'Middle Class', 'Top Class')
GROUP BY s.school_id, s.name, cs.class_name
ORDER BY s.name, cs.class_name;
