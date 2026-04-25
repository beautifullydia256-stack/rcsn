-- Step 2: Add missing columns to system_health_metrics table
-- This adds the columns our owner dashboard expects

ALTER TABLE system_health_metrics 
ADD COLUMN IF NOT EXISTS cpu_usage NUMERIC,
ADD COLUMN IF NOT EXISTS memory_usage NUMERIC,
ADD COLUMN IF NOT EXISTS disk_usage NUMERIC,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS uptime_hours INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'healthy',
ADD COLUMN IF NOT EXISTS database_size_gb NUMERIC,
ADD COLUMN IF NOT EXISTS storage_usage_gb NUMERIC,
ADD COLUMN IF NOT EXISTS active_connections INTEGER,
ADD COLUMN IF NOT EXISTS last_backup TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Insert some sample data with all required fields
INSERT INTO system_health_metrics (
    metric_type, 
    metric_name, 
    cpu_usage, 
    memory_usage, 
    disk_usage, 
    response_time_ms, 
    uptime_hours, 
    status,
    database_size_gb,
    storage_usage_gb,
    active_connections,
    last_backup
) VALUES 
(
    'system_performance', 
    'current_metrics',
    45.2, 
    67.8, 
    23.1, 
    120, 
    168, 
    'healthy',
    2.5,
    5.15,
    25,
    NOW() - INTERVAL '2 hours'
),
(
    'system_performance', 
    'historical_metrics',
    52.1, 
    71.3, 
    24.5, 
    135, 
    169, 
    'healthy',
    2.5,
    5.18,
    28,
    NOW() - INTERVAL '4 hours'
),
(
    'system_performance', 
    'historical_metrics',
    38.9, 
    63.2, 
    22.8, 
    98, 
    170, 
    'healthy',
    2.5,
    5.12,
    22,
    NOW() - INTERVAL '6 hours'
)
ON CONFLICT DO NOTHING;