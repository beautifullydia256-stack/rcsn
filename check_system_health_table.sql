-- Check the current structure of system_health_metrics table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_health_metrics' 
ORDER BY ordinal_position;

-- Also check if the table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'system_health_metrics'
);