-- Fix Rakai by creating proper class-subject assignments
-- The subjects exist but aren't assigned to classes

DO $$
DECLARE
    v_school_id uuid := '97e253ae-1fed-4016-bea3-90d7e7c58d11'; -- Rakai school ID
BEGIN
    RAISE NOTICE 'Creating class-subject assignments for Rakai Infant Primary School...';

    -- For Nursery/Primary schools, we need to assign subjects to each class
    -- Based on Mulungi's pattern, let's create the proper assignments

    -- Baby Class - Nursery subjects
    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT v_school_id, 'Baby Class', subject_name
    FROM (VALUES 
        ('Development and using language (Language II)'),
        ('Development and using mathematical concepts'),
        ('Relating and knowing my environment (Language I)'),
        ('Relating with others (Social development)'),
        ('Taking care of myself (Health habits)')
    ) AS nursery_subjects(subject_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school_id 
          AND cs.class_name = 'Baby Class' 
          AND cs.subject = subject_name
    );

    -- Middle Class - Same nursery subjects
    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT v_school_id, 'Middle Class', subject_name
    FROM (VALUES 
        ('Development and using language (Language II)'),
        ('Development and using mathematical concepts'),
        ('Relating and knowing my environment (Language I)'),
        ('Relating with others (Social development)'),
        ('Taking care of myself (Health habits)')
    ) AS nursery_subjects(subject_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school_id 
          AND cs.class_name = 'Middle Class' 
          AND cs.subject = subject_name
    );

    -- Top Class - Same nursery subjects
    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT v_school_id, 'Top Class', subject_name
    FROM (VALUES 
        ('Development and using language (Language II)'),
        ('Development and using mathematical concepts'),
        ('Relating and knowing my environment (Language I)'),
        ('Relating with others (Social development)'),
        ('Taking care of myself (Health habits)')
    ) AS nursery_subjects(subject_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school_id 
          AND cs.class_name = 'Top Class' 
          AND cs.subject = subject_name
    );

    -- Primary 1-3 - Extended primary subjects
    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT v_school_id, class_name, subject_name
    FROM (VALUES 
        ('Primary 1'), ('Primary 2'), ('Primary 3')
    ) AS classes(class_name)
    CROSS JOIN (VALUES 
        ('ENGLISH'),
        ('LITERACY I'),
        ('LITERACY II'),
        ('MATHEMATICS'),
        ('Reading'),
        ('Religious Education (R.E)'),
        ('Luganda')
    ) AS primary_subjects(subject_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school_id 
          AND cs.class_name = classes.class_name 
          AND cs.subject = subject_name
    );

    -- Primary 4-7 - Core primary subjects
    INSERT INTO public.class_subjects (school_id, class_name, subject)
    SELECT v_school_id, class_name, subject_name
    FROM (VALUES 
        ('Primary 4'), ('Primary 5'), ('Primary 6'), ('Primary 7')
    ) AS classes(class_name)
    CROSS JOIN (VALUES 
        ('ENGLISH'),
        ('MATHEMATICS'),
        ('SCIENCE'),
        ('SOCIAL STUDIES')
    ) AS core_subjects(subject_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school_id 
          AND cs.class_name = classes.class_name 
          AND cs.subject = subject_name
    );

    RAISE NOTICE 'Successfully created class-subject assignments for Rakai Infant Primary School';
END $$;