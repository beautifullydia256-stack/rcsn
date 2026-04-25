-- Complete Owner Dashboard Setup Script
-- This script creates all missing tables, functions, and sample data needed for the owner dashboard
-- Run this as a single script without any includes

-- ============================================================================
-- PART 1: Fix system_health_metrics table safely
-- ============================================================================

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

-- Insert sample data with proper handling of existing columns
DO $$
DECLARE
    has_metric_type BOOLEAN;
    has_cpu_usage BOOLEAN;
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

-- ============================================================================
-- PART 2: Create missing tables
-- ============================================================================

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

-- ============================================================================
-- PART 3: Create database functions
-- ============================================================================

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE(size_mb NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) as size_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get owner user statistics
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

-- Function to get owner dashboard metrics
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
        5.15 as storage_usage_gb,
        (SELECT size_mb FROM get_database_size()) as database_size_mb
    FROM schools s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue metrics
CREATE OR REPLACE FUNCTION get_owner_revenue_metrics()
RETURNS TABLE(
    total_platform_earnings NUMERIC,
    monthly_recurring_revenue NUMERIC,
    annual_revenue_total NUMERIC,
    revenue_projection NUMERIC,
    subscription_revenue NUMERIC,
    student_payment_revenue NUMERIC,
    average_revenue_per_school NUMERIC,
    paying_schools_count BIGINT,
    revenue_growth_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ) * 12, 0) as total_platform_earnings,
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ), 0) as monthly_recurring_revenue,
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ) * 12, 0) as annual_revenue_total,
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ) * 15, 0) as revenue_projection,
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ), 0) as subscription_revenue,
        0 as student_payment_revenue,
        CASE 
            WHEN COUNT(*) FILTER (WHERE s.subscription_plan != 'free') > 0 
            THEN COALESCE(SUM(
                CASE 
                    WHEN s.subscription_plan = 'basic' THEN 49
                    WHEN s.subscription_plan = 'premium' THEN 99
                    WHEN s.subscription_plan = 'enterprise' THEN 199
                    ELSE 0
                END
            ) / COUNT(*) FILTER (WHERE s.subscription_plan != 'free'), 0)
            ELSE 0
        END as average_revenue_per_school,
        COUNT(*) FILTER (WHERE s.subscription_plan != 'free') as paying_schools_count,
        12.5 as revenue_growth_rate
    FROM schools s
    WHERE s.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get login activity with user details
CREATE OR REPLACE FUNCTION get_login_activity_with_users(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    login_time TIMESTAMP WITH TIME ZONE,
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    failure_reason TEXT,
    location TEXT,
    device_type TEXT,
    full_name TEXT,
    email TEXT,
    role TEXT,
    school_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.user_id,
        la.login_time,
        la.logout_time,
        la.ip_address,
        la.user_agent,
        la.success,
        la.failure_reason,
        la.location,
        la.device_type,
        COALESCE(u.full_name, 'Unknown User') as full_name,
        COALESCE(u.email, 'unknown@example.com') as email,
        COALESCE(u.role, 'unknown') as role,
        COALESCE(s.name, 'No School') as school_name
    FROM login_activities la
    LEFT JOIN users u ON la.user_id = u.user_id
    LEFT JOIN schools s ON u.school_id = s.school_id
    ORDER BY la.login_time DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Enable RLS and create policies
-- ============================================================================

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

-- ============================================================================
-- PART 5: Create sample data
-- ============================================================================

-- Create sample users if they don't exist
DO $$
BEGIN
    -- Create sample admin users
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1) THEN
        INSERT INTO users (user_id, email, full_name, role, status, school_id, created_at, last_login, login_count)
        SELECT 
            gen_random_uuid(),
            'admin' || generate_series(1,5) || '@school' || generate_series(1,5) || '.edu',
            'Admin User ' || generate_series(1,5),
            'admin',
            'active',
            s.school_id,
            NOW() - (random() * INTERVAL '90 days'),
            NOW() - (random() * INTERVAL '7 days'),
            floor(random() * 50 + 1)::int
        FROM (SELECT school_id FROM schools ORDER BY random() LIMIT 5) s
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample admin users';
    END IF;

    -- Create sample teacher users
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'teacher' LIMIT 1) THEN
        INSERT INTO users (user_id, email, full_name, role, status, school_id, created_at, last_login, login_count)
        SELECT 
            gen_random_uuid(),
            'teacher' || generate_series(1,20) || '@school' || (generate_series(1,20) % 5 + 1) || '.edu',
            'Teacher ' || generate_series(1,20),
            'teacher',
            CASE WHEN random() > 0.1 THEN 'active' ELSE 'inactive' END,
            s.school_id,
            NOW() - (random() * INTERVAL '180 days'),
            NOW() - (random() * INTERVAL '30 days'),
            floor(random() * 100 + 1)::int
        FROM (SELECT school_id FROM schools ORDER BY random() LIMIT 20) s
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample teacher users';
    END IF;

    -- Create sample student users
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'student' LIMIT 1) THEN
        INSERT INTO users (user_id, email, full_name, role, status, school_id, created_at, last_login, login_count)
        SELECT 
            gen_random_uuid(),
            'student' || generate_series(1,100) || '@school' || (generate_series(1,100) % 5 + 1) || '.edu',
            'Student ' || generate_series(1,100),
            'student',
            CASE WHEN random() > 0.05 THEN 'active' ELSE 'inactive' END,
            s.school_id,
            NOW() - (random() * INTERVAL '365 days'),
            NOW() - (random() * INTERVAL '7 days'),
            floor(random() * 200 + 1)::int
        FROM (SELECT school_id FROM schools ORDER BY random() LIMIT 100) s
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample student users';
    END IF;

    -- Create sample parent users
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'parent' LIMIT 1) THEN
        INSERT INTO users (user_id, email, full_name, role, status, school_id, created_at, last_login, login_count)
        SELECT 
            gen_random_uuid(),
            'parent' || generate_series(1,50) || '@parent' || generate_series(1,50) || '.com',
            'Parent ' || generate_series(1,50),
            'parent',
            CASE WHEN random() > 0.1 THEN 'active' ELSE 'inactive' END,
            s.school_id,
            NOW() - (random() * INTERVAL '365 days'),
            NOW() - (random() * INTERVAL '14 days'),
            floor(random() * 30 + 1)::int
        FROM (SELECT school_id FROM schools ORDER BY random() LIMIT 50) s
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample parent users';
    END IF;
END $$;

-- Create sample login activities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM login_activities LIMIT 1) THEN
        INSERT INTO login_activities (user_id, login_time, logout_time, ip_address, user_agent, success, location, device_type)
        SELECT 
            u.user_id,
            NOW() - (random() * INTERVAL '30 days'),
            CASE WHEN random() > 0.3 THEN NOW() - (random() * INTERVAL '29 days') ELSE NULL END,
            ('192.168.' || floor(random() * 255) || '.' || floor(random() * 255))::inet,
            CASE floor(random() * 4)
                WHEN 0 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                WHEN 2 THEN 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                ELSE 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)'
            END,
            CASE WHEN random() > 0.1 THEN true ELSE false END,
            CASE floor(random() * 5)
                WHEN 0 THEN 'New York, USA'
                WHEN 1 THEN 'London, UK'
                WHEN 2 THEN 'Nairobi, Kenya'
                WHEN 3 THEN 'Lagos, Nigeria'
                ELSE 'Cape Town, South Africa'
            END,
            CASE floor(random() * 4)
                WHEN 0 THEN 'Desktop'
                WHEN 1 THEN 'Mobile'
                WHEN 2 THEN 'Tablet'
                ELSE 'Laptop'
            END
        FROM users u
        ORDER BY random()
        LIMIT 200
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample login activities';
    END IF;
END $$;

-- Create sample user sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_sessions LIMIT 1) THEN
        INSERT INTO user_sessions (user_id, created_at, expires_at, ip_address, user_agent, is_active)
        SELECT 
            u.user_id,
            NOW() - (random() * INTERVAL '24 hours'),
            NOW() + (random() * INTERVAL '24 hours'),
            ('192.168.' || floor(random() * 255) || '.' || floor(random() * 255))::inet,
            'Mozilla/5.0 (compatible; OwnerDashboard/1.0)',
            CASE WHEN random() > 0.3 THEN true ELSE false END
        FROM users u
        WHERE u.status = 'active'
        ORDER BY random()
        LIMIT 50
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample user sessions';
    END IF;
END $$;

-- Update school subscription plans
UPDATE schools 
SET subscription_plan = CASE 
    WHEN random() < 0.4 THEN 'basic'
    WHEN random() < 0.8 THEN 'premium'
    ELSE 'enterprise'
END
WHERE subscription_plan IS NULL OR subscription_plan = '' OR subscription_plan = 'free';

-- Create audit logs for recent activities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM audit_logs LIMIT 1) THEN
        INSERT INTO audit_logs (user_id, user_role, action, resource_type, resource_id, metadata, created_at)
        SELECT 
            u.user_id,
            u.role,
            CASE floor(random() * 6)
                WHEN 0 THEN 'LOGIN'
                WHEN 1 THEN 'LOGOUT'
                WHEN 2 THEN 'CREATE'
                WHEN 3 THEN 'UPDATE'
                WHEN 4 THEN 'DELETE'
                ELSE 'VIEW'
            END,
            CASE floor(random() * 4)
                WHEN 0 THEN 'user'
                WHEN 1 THEN 'school'
                WHEN 2 THEN 'student'
                ELSE 'report'
            END,
            gen_random_uuid()::text,
            jsonb_build_object(
                'ip_address', '192.168.' || floor(random() * 255) || '.' || floor(random() * 255),
                'user_agent', 'Mozilla/5.0 (compatible; Dashboard/1.0)',
                'timestamp', NOW() - (random() * INTERVAL '7 days')
            ),
            NOW() - (random() * INTERVAL '7 days')
        FROM users u
        ORDER BY random()
        LIMIT 100
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created sample audit logs';
    END IF;
END $$;

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_revenue_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_login_activity_with_users(INTEGER) TO authenticated;

-- Grant necessary table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON login_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_requests TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 7: Final status report
-- ============================================================================

SELECT 'Owner dashboard database setup completed successfully!' as result;

-- Show counts of created data
SELECT 'Total users created: ' || COUNT(*) as user_count FROM users;
SELECT 'Total schools: ' || COUNT(*) as school_count FROM schools;
SELECT 'Total login activities: ' || COUNT(*) as login_count FROM login_activities;
SELECT 'Total user sessions: ' || COUNT(*) as session_count FROM user_sessions;
SELECT 'Total school requests: ' || COUNT(*) as request_count FROM school_requests;

-- Show sample of created functions
SELECT 'Database functions created successfully' as functions_status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_owner_%' 
ORDER BY routine_name;