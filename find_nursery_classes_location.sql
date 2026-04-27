-- Find where Baby Class, Middle Class, Top Class are stored for Rakai school
-- Check if they're in a different table or view

-- 1. Check class_subjects table directly
SELECT DISTINCT class_name
FROM class_subjects
WHERE school_id = '97e253ae-1fed-4016-bea3-90d7e7c58d11'
ORDER BY class_name;

-- 2. Check if there's a pre_primary_classes table or similar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%class%'
ORDER BY table_name;

-- 3. Check all tables that might contain class information
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%nursery%' OR table_name ILIKE '%pre%primary%' OR table_name ILIKE '%infant%')
ORDER BY table_name;