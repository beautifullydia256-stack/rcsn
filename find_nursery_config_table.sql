-- Step 1: Find all tables that might contain nursery/pre-primary configuration
-- Run this first to see what tables exist

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%nursery%' 
    OR table_name LIKE '%primary%' 
    OR table_name LIKE '%holistic%'
    OR table_name LIKE '%config%'
    OR table_name LIKE '%strand%'
  )
ORDER BY table_name;

-- Step 2: After you see the table names above, check each one for 'strands' or 'subjects' column
-- Replace 'TABLE_NAME_HERE' with the actual table name from Step 1

-- Example queries to check table structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'TABLE_NAME_HERE';

-- Step 3: Look for tables with jsonb columns that might contain subjects
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type = 'jsonb'
  AND (
    column_name LIKE '%strand%' 
    OR column_name LIKE '%subject%'
    OR column_name LIKE '%config%'
    OR column_name LIKE '%skill%'
  )
ORDER BY table_name, column_name;
