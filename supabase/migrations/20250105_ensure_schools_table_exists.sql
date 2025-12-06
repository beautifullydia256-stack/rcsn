-- Ensure schools table exists
-- This migration creates the schools table if it doesn't exist
-- This is a critical table that must exist for the application to work

CREATE TABLE IF NOT EXISTS public.schools (
  school_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('Nursery/Primary','Secondary')) NOT NULL,
  admin_id UUID REFERENCES public.users(user_id),
  subscription_plan TEXT DEFAULT 'Free (0-20)',
  student_count INTEGER DEFAULT 0,
  wifi_ssid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools(admin_id);
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools(name);

-- RLS Policies for schools table
-- Admin can manage their school
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'schools' 
    AND policyname = 'schools admin manage'
  ) THEN
    CREATE POLICY "schools admin manage" ON public.schools
    FOR ALL TO authenticated 
    USING (admin_id = auth.uid()) 
    WITH CHECK (admin_id = auth.uid());
  END IF;
END $$;

-- Owner can manage all schools
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'schools' 
    AND policyname = 'owner all on schools'
  ) THEN
    CREATE POLICY "owner all on schools" ON public.schools
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner')
    WITH CHECK ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner');
  END IF;
END $$;

