-- Create missing database functions for owner dashboard

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
) AS $
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
        ) * 15, 0) as revenue_projection, -- 25% growth projection
        COALESCE(SUM(
            CASE 
                WHEN s.subscription_plan = 'basic' THEN 49
                WHEN s.subscription_plan = 'premium' THEN 99
                WHEN s.subscription_plan = 'enterprise' THEN 199
                ELSE 0
            END
        ), 0) as subscription_revenue,
        0 as student_payment_revenue, -- Placeholder for future implementation
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
        12.5 as revenue_growth_rate -- Mock growth rate
    FROM schools s
    WHERE s.status = 'active';
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_owner_revenue_metrics() TO authenticated;

-- Create function to get user statistics by role
CREATE OR REPLACE FUNCTION get_users_by_role()
RETURNS TABLE(
    role TEXT,
    count BIGINT,
    active_count BIGINT,
    recent_logins BIGINT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(u.role, 'unknown') as role,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE u.status = 'active') as active_count,
        COUNT(*) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days') as recent_logins
    FROM users u
    GROUP BY u.role
    ORDER BY COUNT(*) DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_by_role() TO authenticated;

-- Create function to get login activity with user details
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
) AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_login_activity_with_users(INTEGER) TO authenticated;

SELECT 'Missing database functions created successfully!' as result;