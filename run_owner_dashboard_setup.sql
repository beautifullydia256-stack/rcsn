-- Manual setup for owner dashboard - run only the essential parts
-- This avoids running all the problematic migrations

-- Create system_health_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    memory_usage DECIMAL(5,2) DEFAULT 0,
    disk_usage DECIMAL(5,2) DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    uptime_hours INTEGER DEFAULT 0,
    status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create login_activities table if it doesn't exist
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

-- Create school_requests table if it doesn't exist
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

-- Add missing columns to existing tables if they don't exist
DO $$ 
BEGIN
    -- Add columns to users table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_count') THEN
        ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_ip') THEN
        ALTER TABLE users ADD COLUMN last_ip INET;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;

    -- Add columns to schools table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'student_count') THEN
        ALTER TABLE schools ADD COLUMN student_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'teacher_count') THEN
        ALTER TABLE schools ADD COLUMN teacher_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'subscription_plan') THEN
        ALTER TABLE schools ADD COLUMN subscription_plan TEXT DEFAULT 'basic';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'subscription_status') THEN
        ALTER TABLE schools ADD COLUMN subscription_status TEXT DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE schools ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'last_activity') THEN
        ALTER TABLE schools ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create function to get database size
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

-- Insert sample system health metrics
INSERT INTO system_health_metrics (cpu_usage, memory_usage, disk_usage, response_time_ms, uptime_hours, status)
VALUES 
    (45.2, 67.8, 23.1, 120, 168, 'healthy'),
    (52.1, 71.3, 24.5, 135, 169, 'healthy'),
    (38.9, 63.2, 22.8, 98, 170, 'healthy')
ON CONFLICT DO NOTHING;

-- Insert sample school requests
INSERT INTO school_requests (school_name, contact_name, contact_email, contact_phone, address, city, country, student_count, requested_plan, message, status)
VALUES 
    ('Bright Future Academy', 'Sarah Johnson', 'sarah@brightfuture.edu', '+1-555-0123', '123 Education St', 'Springfield', 'USA', 450, 'premium', 'We are looking for a comprehensive school management system.', 'pending'),
    ('Mountain View Elementary', 'Michael Chen', 'michael@mountainview.edu', '+1-555-0456', '456 Hill Road', 'Denver', 'USA', 280, 'basic', 'Small elementary school seeking basic features.', 'approved'),
    ('Tech Innovation High', 'Dr. Lisa Rodriguez', 'lisa@techinnovation.edu', '+1-555-0789', '789 Innovation Blvd', 'San Francisco', 'USA', 1200, 'enterprise', 'Large high school requiring enterprise features.', 'pending')
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owner access
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Owner can view system health metrics" ON system_health_metrics;
    DROP POLICY IF EXISTS "Owner can view all user sessions" ON user_sessions;
    DROP POLICY IF EXISTS "Owner can view all login activities" ON login_activities;
    DROP POLICY IF EXISTS "Owner can manage school requests" ON school_requests;
    
    -- Create new policies
    CREATE POLICY "Owner can view system health metrics" ON system_health_metrics
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.user_id = auth.uid() 
                AND users.role = 'owner'
            )
        );

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
END $$;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_dashboard_metrics() TO authenticated;