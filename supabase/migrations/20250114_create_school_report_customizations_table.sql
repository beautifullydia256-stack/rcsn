-- Create school_report_customizations table for storing report header customizations
CREATE TABLE IF NOT EXISTS public.school_report_customizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  custom_school_name TEXT,
  custom_school_motto TEXT,
  custom_school_address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Enable RLS
ALTER TABLE public.school_report_customizations ENABLE ROW LEVEL SECURITY;

-- Create policies for school_report_customizations
CREATE POLICY "Users can view their school's report customizations" ON public.school_report_customizations
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their school's report customizations" ON public.school_report_customizations
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their school's report customizations" ON public.school_report_customizations
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their school's report customizations" ON public.school_report_customizations
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.school_report_customizations IS 'Stores custom header settings for school reports (logo, custom name, motto, etc.)';
