-- Create Owner Dashboard Metric Tables
-- These tables are needed for the owner dashboard charts

-- =============================================================================
-- Create owner_school_growth_metrics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.owner_school_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_schools integer DEFAULT 0,
    new_schools integer DEFAULT 0,
    active_schools integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Owners can access school growth metrics" ON public.owner_school_growth_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- =============================================================================
-- Create owner_user_growth_metrics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.owner_user_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    active_users integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Owners can access user growth metrics" ON public.owner_user_growth_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- =============================================================================
-- Create owner_revenue_trend_metrics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.owner_revenue_trend_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0,
    new_revenue numeric(12,2) DEFAULT 0,
    recurring_revenue numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Owners can access revenue metrics" ON public.owner_revenue_trend_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- =============================================================================
-- Insert sample data for the last 12 months
-- =============================================================================

-- Insert sample school growth data
INSERT INTO public.owner_school_growth_metrics (month_year, total_schools, new_schools, active_schools)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 3 + 10)::integer as total_schools,
    (random() * 5 + 1)::integer as new_schools,
    (row_number() OVER () * 3 + 8)::integer as active_schools
ON CONFLICT (month_year) DO NOTHING;

-- Insert sample user growth data
INSERT INTO public.owner_user_growth_metrics (month_year, total_users, new_users, active_users)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 50 + 100)::integer as total_users,
    (random() * 100 + 20)::integer as new_users,
    (row_number() OVER () * 40 + 80)::integer as active_users
ON CONFLICT (month_year) DO NOTHING;

-- Insert sample revenue data
INSERT INTO public.owner_revenue_trend_metrics (month_year, total_revenue, new_revenue, recurring_revenue)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 1000 + 5000)::numeric(12,2) as total_revenue,
    (random() * 2000 + 500)::numeric(12,2) as new_revenue,
    (row_number() OVER () * 800 + 4000)::numeric(12,2) as recurring_revenue
ON CONFLICT (month_year) DO NOTHING;

-- =============================================================================
-- Create indexes for better performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_owner_school_growth_month_year ON public.owner_school_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_user_growth_month_year ON public.owner_user_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_revenue_trend_month_year ON public.owner_revenue_trend_metrics(month_year);

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Owner Dashboard Tables Created Successfully!' as status;

-- Show created tables
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename LIKE 'owner_%_metrics'
ORDER BY tablename;

-- Show data counts
SELECT 
    (SELECT COUNT(*) FROM public.owner_school_growth_metrics) as school_metrics,
    (SELECT COUNT(*) FROM public.owner_user_growth_metrics) as user_metrics,
    (SELECT COUNT(*) FROM public.owner_revenue_trend_metrics) as revenue_metrics;