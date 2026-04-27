-- Find where the nursery classes actually are (they must exist somewhere if students are in them)

-- 1. Check if students have those class names
SELECT DISTINCT current_class
FROM students
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
ORDER BY current_class;

-- 2. Check class_subjects for those nursery classes
SELECT DISTINCT class_name
FROM class_subjects
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
  AND class_name IN ('Baby Class', 'Middle Class', 'Top Class')
ORDER BY class_name;

-- 3. Check if there's a view or materialized view that includes these classes
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%class%'
ORDER BY table_name;

-- 4. Count students in each class for this school
SELECT 
  current_class,
  COUNT(*) as student_count
FROM students
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
GROUP BY current_class
ORDER BY current_class;