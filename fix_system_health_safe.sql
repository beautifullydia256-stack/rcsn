-- Safe fix for system_health_metrics table
-- First, let's check what columns exist in the current table

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_health_metrics' 
ORDER BY ordinal_position;

-- Add missing columns safely (only if they don't exist)
DO $$ 
BEGIN
    -- Add cpu_usage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'cpu_usage') THEN
        ALTER TABLE system_health_metrics ADD COLUMN cpu_usage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added cpu_usage column';
    ELSE
        RAISE NOTICE 'cpu_usage column already exists';
    END IF;
    
    -- Add memory_usage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'memory_usage') THEN
        ALTER TABLE system_health_metrics ADD COLUMN memory_usage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added memory_usage column';
    ELSE
        RAISE NOTICE 'memory_usage column already exists';
    END IF;
    
    -- Add disk_usage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'disk_usage') THEN
        ALTER TABLE system_health_metrics ADD COLUMN disk_usage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added disk_usage column';
    ELSE
        RAISE NOTICE 'disk_usage column already exists';
    END IF;
    
    -- Add response_time_ms column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'response_time_ms') THEN
        ALTER TABLE system_health_metrics ADD COLUMN response_time_ms INTEGER DEFAULT 0;
        RAISE NOTICE 'Added response_time_ms column';
    ELSE
        RAISE NOTICE 'response_time_ms column already exists';
    END IF;
    
    -- Add uptime_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'uptime_hours') THEN
        ALTER TABLE system_health_metrics ADD COLUMN uptime_hours INTEGER DEFAULT 0;
        RAISE NOTICE 'Added uptime_hours column';
    ELSE
        RAISE NOTICE 'uptime_hours column already exists';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_health_metrics' AND column_name = 'status') THEN
        ALTER TABLE system_health_metrics ADD COLUMN status TEXT DEFAULT 'healthy';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Now let's see what the table structure looks like after adding columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_health_metrics' 
ORDER BY ordinal_position;

-- Insert sample data with proper handling of existing columns
-- We'll check what columns exist and insert accordingly
DO $$
DECLARE
    has_metric_type BOOLEAN;
    has_cpu_usage BOOLEAN;
    insert_sql TEXT;
BEGIN
    -- Check if metric_type column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_health_metrics' AND column_name = 'metric_type'
    ) INTO has_metric_type;
    
    -- Check if cpu_usage column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_health_metrics' AND column_name = 'cpu_usage'
    ) INTO has_cpu_usage;
    
    -- Only insert if we have the required columns and table is empty
    IF has_cpu_usage AND NOT EXISTS (SELECT 1 FROM system_health_metrics WHERE cpu_usage IS NOT NULL LIMIT 1) THEN
        IF has_metric_type THEN
            -- Insert with metric_type if it exists
            INSERT INTO system_health_metrics (metric_type, cpu_usage, memory_usage, disk_usage, response_time_ms, uptime_hours, status)
            VALUES 
                ('system_performance', 45.2, 67.8, 23.1, 120, 168, 'healthy'),
                ('system_performance', 52.1, 71.3, 24.5, 135, 169, 'healthy'),
                ('system_performance', 38.9, 63.2, 22.8, 98, 170, 'healthy')
            ON CONFLICT DO NOTHING;
        ELSE
            -- Insert without metric_type if it doesn't exist
            INSERT INTO system_health_metrics (cpu_usage, memory_usage, disk_usage, response_time_ms, uptime_hours, status)
            VALUES 
                (45.2, 67.8, 23.1, 120, 168, 'healthy'),
                (52.1, 71.3, 24.5, 135, 169, 'healthy'),
                (38.9, 63.2, 22.8, 98, 170, 'healthy')
            ON CONFLICT DO NOTHING;
        END IF;
        RAISE NOTICE 'Inserted sample system health metrics';
    ELSE
        RAISE NOTICE 'Skipped inserting sample data - either missing columns or data already exists';
    END IF;
END $$;

-- Create the other missing tables (these definitely don't exist)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS login_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    location TEXT,
    device_type TEXT
);

CREATE TABLE IF NOT EXISTS school_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    student_count INTEGER DEFAULT 0,
    requested_plan TEXT DEFAULT 'basic',
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Insert sample school requests
INSERT INTO school_requests (school_name, contact_name, contact_email, contact_phone, address, city, country, student_count, requested_plan, message, status)
VALUES 
    ('Bright Future Academy', 'Sarah Johnson', 'sarah@brightfuture.edu', '+1-555-0123', '123 Education St', 'Springfield', 'USA', 450, 'premium', 'We are looking for a comprehensive school management system.', 'pending'),
    ('Mountain View Elementary', 'Michael Chen', 'michael@mountainview.edu', '+1-555-0456', '456 Hill Road', 'Denver', 'USA', 280, 'basic', 'Small elementary school seeking basic features.', 'approved'),
    ('Tech Innovation High', 'Dr. Lisa Rodriguez', 'lisa@techinnovation.edu', '+1-555-0789', '789 Innovation Blvd', 'San Francisco', 'USA', 1200, 'enterprise', 'Large high school requiring enterprise features.', 'pending')
ON CONFLICT DO NOTHING;

-- Create database functions
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE(size_mb NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) as size_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get owner user statistics
CREATE OR REPLACE FUNCTION get_owner_user_stats()
RETURNS TABLE(
    total_users BIGINT,
    active_users BIGINT,
    admins BIGINT,
    teachers BIGINT,
    parents BIGINT,
    students BIGINT,
    suspended_users BIGINT,
    recent_logins BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE u.status = 'active') as active_users,
        COUNT(*) FILTER (WHERE u.role = 'admin') as admins,
        COUNT(*) FILTER (WHERE u.role = 'teacher') as teachers,
        COUNT(*) FILTER (WHERE u.role = 'parent') as parents,
        COUNT(*) FILTER (WHERE u.role = 'student') as students,
        COUNT(*) FILTER (WHERE u.status = 'suspended') as suspended_users,
        COUNT(*) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days') as recent_logins
    FROM users u;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get owner dashboard metrics
CREATE OR REPLACE FUNCTION get_owner_dashboard_metrics()
RETURNS TABLE(
    total_schools BIGINT,
    active_schools BIGINT,
    suspended_schools BIGINT,
    total_users BIGINT,
    active_users BIGINT,
    total_students BIGINT,
    total_teachers BIGINT,
    monthly_revenue NUMERIC,
    storage_usage_gb NUMERIC,
    database_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_schools,
        COUNT(*) FILTER (WHERE s.status = 'active') as active_schools,
        COUNT(*) FILTER (WHERE s.status = 'suspended') as suspended_schools,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') as total_teachers,
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ), 0) as monthly_revenue,
        5.15 as storage_usage_gb, -- Placeholder - will be calculated from actual storage
        (SELECT size_mb FROM get_database_size()) as database_size_mb
    FROM schools s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_dashboard_metrics() TO authenticated;

-- Enable RLS on new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owner access
CREATE POLICY "Owner can view all user sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.role = 'owner'
        )
    );

CREATE POLICY "Owner can view all login activities" ON login_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.role = 'owner'
        )
    );

CREATE POLICY "Owner can manage school requests" ON school_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.role = 'owner'
        )
    );

SELECT 'System health metrics table fixed successfully! All missing tables and functions created.' as result;