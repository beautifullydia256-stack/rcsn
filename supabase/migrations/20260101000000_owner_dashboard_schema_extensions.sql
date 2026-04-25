-- ============================================================================
-- OWNER DASHBOARD SCHEMA EXTENSIONS
-- Task 1: Database schema extensions and optimizations for owner dashboard
-- Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 9.4, 9.9
-- ============================================================================

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. SCHOOL SUBSCRIPTIONS TABLE
-- Track platform-level subscription plans and revenue
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('Free (0-20)', 'Basic', 'Standard', 'Premium')),
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active subscription per school
  CONSTRAINT unique_active_subscription_per_school 
    EXCLUDE (school_id WITH =) WHERE (status = 'active')
);

-- Enable RLS for school subscriptions
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school subscriptions
CREATE POLICY "school_subscriptions_admin_manage" ON public.school_subscriptions
FOR ALL TO authenticated 
USING (
  school_id IN (SELECT school_id FROM public.schools WHERE admin_id = auth.uid())
) 
WITH CHECK (
  school_id IN (SELECT school_id FROM public.schools WHERE admin_id = auth.uid())
);

CREATE POLICY "owner_all_on_school_subscriptions" ON public.school_subscriptions
FOR ALL TO authenticated 
USING ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner');

-- ============================================================================
-- 2. SYSTEM HEALTH METRICS TABLE
-- Track database performance and system health metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('database_size', 'table_size', 'slow_query', 'api_calls', 'storage_usage', 'error_count')),
  school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  additional_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for efficient querying
  INDEX idx_system_health_metrics_type_date (metric_type, recorded_at),
  INDEX idx_system_health_metrics_school_date (school_id, recorded_at)
);

-- Enable RLS for system health metrics
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy - only owner can access system health metrics
CREATE POLICY "owner_only_system_health_metrics" ON public.system_health_metrics
FOR ALL TO authenticated 
USING ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner');

-- ============================================================================
-- 3. MATERIALIZED VIEWS FOR DASHBOARD METRICS AGGREGATION
-- ============================================================================

-- 3.1 Owner Dashboard Main Metrics View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.owner_dashboard_metrics AS
SELECT 
  -- School metrics (Requirements 1.2, 1.3)
  COUNT(DISTINCT s.school_id) as total_schools,
  COUNT(DISTINCT CASE 
    WHEN s.updated_at > NOW() - INTERVAL '30 days' 
    OR EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.school_id = s.school_id 
      AND u.created_at > NOW() - INTERVAL '30 days'
    )
    OR EXISTS (
      SELECT 1 FROM public.student_payments sp 
      WHERE sp.school_id = s.school_id 
      AND sp.payment_date > NOW() - INTERVAL '30 days'
    )
    THEN s.school_id 
  END) as active_schools,
  
  -- User metrics (Requirement 1.4)
  COUNT(DISTINCT u.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.user_id END) as total_admins,
  COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.user_id END) as total_teachers,
  COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.user_id END) as total_students,
  COUNT(DISTINCT CASE WHEN u.role = 'parent' THEN u.user_id END) as total_parents,
  
  -- Revenue metrics (Requirement 1.5)
  COALESCE(SUM(CASE 
    WHEN ss.status = 'active' THEN ss.monthly_amount 
    ELSE 0 
  END), 0) as monthly_revenue,
  
  -- Student payments revenue (current month)
  COALESCE(SUM(CASE 
    WHEN sp.payment_date >= DATE_TRUNC('month', CURRENT_DATE) 
    AND sp.reversed_at IS NULL
    THEN sp.amount_paid 
    ELSE 0 
  END), 0) as current_month_student_payments,
  
  -- Database size metrics (Requirement 1.6)
  pg_database_size(current_database()) as database_size_bytes,
  
  -- Storage usage (Requirement 1.7)
  COUNT(DISTINCT st.student_id) as total_student_records,
  
  -- Active sessions (Requirement 1.9) - approximated by recent logins
  COUNT(DISTINCT CASE 
    WHEN u.updated_at > NOW() - INTERVAL '1 hour' 
    THEN u.user_id 
  END) as estimated_active_sessions,
  
  -- Last updated timestamp
  NOW() as last_updated

FROM public.schools s
LEFT JOIN public.users u ON u.school_id = s.school_id
LEFT JOIN public.school_subscriptions ss ON ss.school_id = s.school_id AND ss.status = 'active'
LEFT JOIN public.student_payments sp ON sp.school_id = s.school_id
LEFT JOIN public.students st ON st.school_id = s.school_id AND st.status = 'active';

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_dashboard_metrics_unique 
ON public.owner_dashboard_metrics (last_updated);

-- 3.2 School Growth Metrics View (Requirement 1.10)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.owner_school_growth_metrics AS
SELECT 
  DATE_TRUNC('month', s.created_at) as month_year,
  EXTRACT(YEAR FROM s.created_at) as year,
  EXTRACT(MONTH FROM s.created_at) as month,
  COUNT(*) as new_schools_count,
  COUNT(*) FILTER (WHERE s.type = 'Nursery/Primary') as new_primary_schools,
  COUNT(*) FILTER (WHERE s.type = 'Secondary') as new_secondary_schools
FROM public.schools s
WHERE s.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', s.created_at), EXTRACT(YEAR FROM s.created_at), EXTRACT(MONTH FROM s.created_at)
ORDER BY month_year;

-- Create unique index for school growth view
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_school_growth_unique 
ON public.owner_school_growth_metrics (month_year);

-- 3.3 User Growth Metrics View (Requirement 1.11)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.owner_user_growth_metrics AS
SELECT 
  DATE_TRUNC('month', u.created_at) as month_year,
  EXTRACT(YEAR FROM u.created_at) as year,
  EXTRACT(MONTH FROM u.created_at) as month,
  COUNT(*) as new_users_count,
  COUNT(*) FILTER (WHERE u.role = 'admin') as new_admins,
  COUNT(*) FILTER (WHERE u.role = 'teacher') as new_teachers,
  COUNT(*) FILTER (WHERE u.role = 'student') as new_students,
  COUNT(*) FILTER (WHERE u.role = 'parent') as new_parents
FROM public.users u
WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', u.created_at), EXTRACT(YEAR FROM u.created_at), EXTRACT(MONTH FROM u.created_at)
ORDER BY month_year;

-- Create unique index for user growth view
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_user_growth_unique 
ON public.owner_user_growth_metrics (month_year);

-- 3.4 Revenue Trend Metrics View (Requirement 1.12)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.owner_revenue_trend_metrics AS
SELECT 
  DATE_TRUNC('month', sp.payment_date) as month_year,
  EXTRACT(YEAR FROM sp.payment_date) as year,
  EXTRACT(MONTH FROM sp.payment_date) as month,
  COUNT(DISTINCT sp.school_id) as paying_schools,
  COUNT(*) as total_payments,
  SUM(sp.amount_paid) as total_revenue,
  AVG(sp.amount_paid) as average_payment,
  -- Subscription revenue (estimated monthly)
  (SELECT COALESCE(SUM(ss.monthly_amount), 0) 
   FROM public.school_subscriptions ss 
   WHERE ss.status = 'active' 
   AND ss.start_date <= (DATE_TRUNC('month', sp.payment_date) + INTERVAL '1 month - 1 day')
  ) as subscription_revenue
FROM public.student_payments sp
WHERE sp.payment_date >= CURRENT_DATE - INTERVAL '12 months'
  AND sp.reversed_at IS NULL
GROUP BY DATE_TRUNC('month', sp.payment_date), EXTRACT(YEAR FROM sp.payment_date), EXTRACT(MONTH FROM sp.payment_date)
ORDER BY month_year;

-- Create unique index for revenue trend view
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_revenue_trend_unique 
ON public.owner_revenue_trend_metrics (month_year);

-- ============================================================================
-- 4. COMPOSITE INDEXES FOR MULTI-TENANT QUERIES (Requirement 9.4)
-- ============================================================================

-- Schools table indexes
CREATE INDEX IF NOT EXISTS idx_schools_activity_status 
ON public.schools(updated_at, subscription_plan) 
WHERE subscription_plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schools_type_created 
ON public.schools(type, created_at);

-- Users table indexes for cross-school queries
CREATE INDEX IF NOT EXISTS idx_users_role_school_created 
ON public.users(role, school_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_school_updated 
ON public.users(school_id, updated_at);

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_school_status_created 
ON public.students(school_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_students_school_class 
ON public.students(school_id, current_class) 
WHERE status = 'active';

-- Student payments indexes for revenue queries
CREATE INDEX IF NOT EXISTS idx_student_payments_school_date_amount 
ON public.student_payments(school_id, payment_date, amount_paid) 
WHERE reversed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_payments_date_method 
ON public.student_payments(payment_date, payment_method) 
WHERE reversed_at IS NULL;

-- School subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_status_amount 
ON public.school_subscriptions(status, monthly_amount, end_date);

CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school_status 
ON public.school_subscriptions(school_id, status);

-- ============================================================================
-- 5. OWNER-SPECIFIC DATABASE FUNCTIONS FOR REAL-TIME NOTIFICATIONS
-- ============================================================================

-- 5.1 Function to notify owner dashboard updates
CREATE OR REPLACE FUNCTION public.notify_owner_dashboard_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Notify owner dashboard of data changes
  PERFORM pg_notify('owner_dashboard_update', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', NOW(),
    'school_id', COALESCE(NEW.school_id, OLD.school_id),
    'affected_metrics', CASE TG_TABLE_NAME
      WHEN 'schools' THEN '["total_schools", "active_schools"]'
      WHEN 'users' THEN '["total_users", "active_sessions"]'
      WHEN 'student_payments' THEN '["monthly_revenue", "current_month_payments"]'
      WHEN 'school_subscriptions' THEN '["monthly_revenue", "subscription_revenue"]'
      ELSE '["general"]'
    END
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5.2 Function to get real-time dashboard metrics
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics_realtime()
RETURNS TABLE (
  total_schools BIGINT,
  active_schools BIGINT,
  total_users BIGINT,
  monthly_revenue NUMERIC,
  database_size_bytes BIGINT,
  estimated_active_sessions BIGINT,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    odm.total_schools,
    odm.active_schools,
    odm.total_users,
    odm.monthly_revenue,
    odm.database_size_bytes,
    odm.estimated_active_sessions,
    odm.last_updated
  FROM public.owner_dashboard_metrics odm
  ORDER BY odm.last_updated DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions to authenticated users (owner role will be checked in application)
GRANT EXECUTE ON FUNCTION public.get_owner_dashboard_metrics_realtime() TO authenticated;

-- 5.3 Function to get system health alerts
CREATE OR REPLACE FUNCTION public.get_owner_system_alerts()
RETURNS TABLE (
  alert_type TEXT,
  alert_message TEXT,
  severity TEXT,
  school_id UUID,
  school_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Subscription expiration alerts (Requirement 1.13)
  SELECT 
    'subscription_expiring'::TEXT as alert_type,
    'Subscription expires in ' || (ss.end_date - CURRENT_DATE) || ' days'::TEXT as alert_message,
    CASE 
      WHEN ss.end_date - CURRENT_DATE <= 7 THEN 'critical'
      WHEN ss.end_date - CURRENT_DATE <= 30 THEN 'high'
      ELSE 'medium'
    END::TEXT as severity,
    s.school_id,
    s.name as school_name,
    NOW() as created_at
  FROM public.school_subscriptions ss
  JOIN public.schools s ON s.school_id = ss.school_id
  WHERE ss.status = 'active' 
    AND ss.end_date IS NOT NULL 
    AND ss.end_date <= CURRENT_DATE + INTERVAL '30 days'
  
  UNION ALL
  
  -- Inactive schools (churn risk) alerts (Requirement 1.14)
  SELECT 
    'churn_risk'::TEXT as alert_type,
    'School inactive for ' || (CURRENT_DATE - GREATEST(s.updated_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE))) || ' days'::TEXT as alert_message,
    CASE 
      WHEN CURRENT_DATE - GREATEST(s.updated_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 60 THEN 'critical'
      WHEN CURRENT_DATE - GREATEST(s.updated_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 30 THEN 'high'
      ELSE 'medium'
    END::TEXT as severity,
    s.school_id,
    s.name as school_name,
    NOW() as created_at
  FROM public.schools s
  LEFT JOIN (
    SELECT 
      sp.school_id,
      MAX(sp.payment_date) as last_payment_date
    FROM public.student_payments sp
    WHERE sp.reversed_at IS NULL
    GROUP BY sp.school_id
  ) last_payment ON last_payment.school_id = s.school_id
  WHERE CURRENT_DATE - GREATEST(s.updated_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 30
  
  ORDER BY created_at DESC, severity DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_owner_system_alerts() TO authenticated;

-- 5.4 Function to get owner user statistics
CREATE OR REPLACE FUNCTION public.get_owner_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  admins BIGINT,
  teachers BIGINT,
  parents BIGINT,
  students BIGINT,
  suspended_users BIGINT,
  recent_logins BIGINT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE u.status = 'active')::BIGINT as active_users,
    COUNT(*) FILTER (WHERE u.role = 'admin')::BIGINT as admins,
    COUNT(*) FILTER (WHERE u.role = 'teacher')::BIGINT as teachers,
    COUNT(*) FILTER (WHERE u.role = 'parent')::BIGINT as parents,
    COUNT(*) FILTER (WHERE u.role = 'student')::BIGINT as students,
    COUNT(*) FILTER (WHERE u.status = 'suspended')::BIGINT as suspended_users,
    COUNT(*) FILTER (WHERE u.updated_at > NOW() - INTERVAL '7 days')::BIGINT as recent_logins
  FROM public.users u;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_owner_user_stats() TO authenticated;

-- 5.5 Function to get role statistics
CREATE OR REPLACE FUNCTION public.get_role_statistics()
RETURNS TABLE (
  total_roles BIGINT,
  custom_roles BIGINT,
  total_permissions BIGINT,
  active_users_with_roles BIGINT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    7::BIGINT as total_roles, -- System roles: admin, teacher, parent, student, accountant, librarian, head_teacher
    0::BIGINT as custom_roles, -- Custom roles would be stored in a separate table
    18::BIGINT as total_permissions, -- Total available permissions
    COUNT(DISTINCT u.user_id)::BIGINT as active_users_with_roles
  FROM public.users u
  WHERE u.status = 'active' AND u.role IS NOT NULL;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_role_statistics() TO authenticated;

-- 5.6 Function to get login activity statistics
CREATE OR REPLACE FUNCTION public.get_login_activity_stats()
RETURNS TABLE (
  total_logins_today BIGINT,
  active_sessions BIGINT,
  suspicious_activities BIGINT,
  unique_users_today BIGINT,
  failed_attempts_today BIGINT,
  new_devices_today BIGINT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    -- Mock data for now - in real implementation these would come from login_activities table
    156::BIGINT as total_logins_today,
    23::BIGINT as active_sessions,
    3::BIGINT as suspicious_activities,
    89::BIGINT as unique_users_today,
    12::BIGINT as failed_attempts_today,
    7::BIGINT as new_devices_today;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_login_activity_stats() TO authenticated;

-- 5.7 Function to get owner revenue metrics
CREATE OR REPLACE FUNCTION public.get_owner_revenue_metrics()
RETURNS TABLE (
  total_platform_earnings NUMERIC,
  monthly_recurring_revenue NUMERIC,
  annual_revenue_total NUMERIC,
  revenue_projection NUMERIC,
  subscription_revenue NUMERIC,
  student_payment_revenue NUMERIC,
  average_revenue_per_school NUMERIC,
  paying_schools_count BIGINT,
  revenue_growth_rate NUMERIC
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    -- Total platform earnings (all time)
    COALESCE(SUM(ss.monthly_amount), 0) * 12 as total_platform_earnings,
    
    -- Monthly recurring revenue (active subscriptions)
    COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.monthly_amount ELSE 0 END), 0) as monthly_recurring_revenue,
    
    -- Annual revenue total (current year student payments + subscriptions)
    COALESCE(
      (SELECT SUM(sp.amount_paid) 
       FROM public.student_payments sp 
       WHERE EXTRACT(YEAR FROM sp.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND sp.reversed_at IS NULL), 0
    ) + (COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.monthly_amount ELSE 0 END), 0) * 12) as annual_revenue_total,
    
    -- Revenue projection (next 12 months based on current MRR)
    COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.monthly_amount ELSE 0 END), 0) * 12 * 1.2 as revenue_projection,
    
    -- Subscription revenue (monthly)
    COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.monthly_amount ELSE 0 END), 0) as subscription_revenue,
    
    -- Student payment revenue (current month)
    COALESCE(
      (SELECT SUM(sp.amount_paid) 
       FROM public.student_payments sp 
       WHERE sp.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
       AND sp.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
       AND sp.reversed_at IS NULL), 0
    ) as student_payment_revenue,
    
    -- Average revenue per school
    CASE 
      WHEN COUNT(DISTINCT ss.school_id) > 0 
      THEN COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.monthly_amount ELSE 0 END), 0) / COUNT(DISTINCT ss.school_id)
      ELSE 0 
    END as average_revenue_per_school,
    
    -- Paying schools count
    COUNT(DISTINCT CASE WHEN ss.status = 'active' AND ss.monthly_amount > 0 THEN ss.school_id END) as paying_schools_count,
    
    -- Revenue growth rate (mock calculation - in real implementation, compare with previous period)
    12.5::NUMERIC as revenue_growth_rate
    
  FROM public.school_subscriptions ss;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_owner_revenue_metrics() TO authenticated;

-- ============================================================================
-- 6. TRIGGERS FOR REAL-TIME NOTIFICATIONS
-- ============================================================================

-- Create triggers on key tables to notify owner dashboard updates
DROP TRIGGER IF EXISTS trigger_notify_owner_schools ON public.schools;
CREATE TRIGGER trigger_notify_owner_schools
  AFTER INSERT OR UPDATE OR DELETE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS trigger_notify_owner_users ON public.users;
CREATE TRIGGER trigger_notify_owner_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS trigger_notify_owner_payments ON public.student_payments;
CREATE TRIGGER trigger_notify_owner_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS trigger_notify_owner_subscriptions ON public.school_subscriptions;
CREATE TRIGGER trigger_notify_owner_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.school_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_dashboard_update();

-- ============================================================================
-- 7. AUTOMATED REFRESH SCHEDULES USING PG_CRON (Requirement 9.9)
-- ============================================================================

-- Refresh materialized views every 5 minutes for real-time dashboard updates
SELECT cron.schedule(
  'refresh-owner-dashboard-metrics',
  '*/5 * * * *',  -- Every 5 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.owner_dashboard_metrics;$$
);

-- Refresh growth and trend metrics every hour (less frequent updates needed)
SELECT cron.schedule(
  'refresh-owner-growth-metrics',
  '0 * * * *',  -- Every hour at minute 0
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.owner_school_growth_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.owner_user_growth_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.owner_revenue_trend_metrics;
  $$
);

-- ============================================================================
-- 8. INITIAL DATA POPULATION
-- ============================================================================

-- Populate school subscriptions for existing schools (default to Free plan)
INSERT INTO public.school_subscriptions (school_id, plan_name, monthly_amount, status)
SELECT 
  s.school_id,
  COALESCE(s.subscription_plan, 'Free (0-20)') as plan_name,
  CASE 
    WHEN s.subscription_plan = 'Free (0-20)' OR s.subscription_plan IS NULL THEN 0
    WHEN s.subscription_plan = 'Basic' THEN 50
    WHEN s.subscription_plan = 'Standard' THEN 100
    WHEN s.subscription_plan = 'Premium' THEN 200
    ELSE 0
  END as monthly_amount,
  'active' as status
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_subscriptions ss 
  WHERE ss.school_id = s.school_id
);

-- Initial refresh of materialized views
REFRESH MATERIALIZED VIEW public.owner_dashboard_metrics;
REFRESH MATERIALIZED VIEW public.owner_school_growth_metrics;
REFRESH MATERIALIZED VIEW public.owner_user_growth_metrics;
REFRESH MATERIALIZED VIEW public.owner_revenue_trend_metrics;

-- ============================================================================
-- 9. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.school_subscriptions IS 'Platform-level subscription plans and revenue tracking for owner dashboard';
COMMENT ON TABLE public.system_health_metrics IS 'System performance and health metrics for monitoring';
COMMENT ON MATERIALIZED VIEW public.owner_dashboard_metrics IS 'Aggregated metrics for owner dashboard main view - refreshed every 5 minutes';
COMMENT ON MATERIALIZED VIEW public.owner_school_growth_metrics IS 'School growth trends over 12 months for charts';
COMMENT ON MATERIALIZED VIEW public.owner_user_growth_metrics IS 'User growth trends over 12 months for charts';
COMMENT ON MATERIALIZED VIEW public.owner_revenue_trend_metrics IS 'Revenue trends over 12 months for financial charts';
COMMENT ON FUNCTION public.notify_owner_dashboard_update() IS 'Triggers real-time notifications for owner dashboard updates';
COMMENT ON FUNCTION public.get_owner_dashboard_metrics_realtime() IS 'Returns current dashboard metrics for real-time updates';
COMMENT ON FUNCTION public.get_owner_system_alerts() IS 'Returns system alerts for subscription expiration and churn risk';