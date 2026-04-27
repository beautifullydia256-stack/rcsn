-- Add the missing nursery classes to the classes table for Rakai
-- This will sync the database with what the UI already shows

INSERT INTO public.classes (school_id, class_name, max_students)
SELECT '97e253ae-1fed-4016-bea3-90d7e7c58d11', class_name, 1000
FROM (VALUES 
  ('Baby Class'),
  ('Middle Class'),
  ('Top Class')
) AS nursery_classes(class_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.classes c
  WHERE c.school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
    AND c.class_name = nursery_classes.class_name
);

-- Verify the fix
SELECT 
  class_name,
  max_students
FROM classes
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
ORDER BY class_name;