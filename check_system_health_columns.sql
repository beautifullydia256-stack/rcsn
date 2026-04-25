-- Check what columns exist in system_health_metrics table
SELECT 'Checking system_health_metrics table structure...' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'system_health_metrics'
ORDER BY ordinal_position;