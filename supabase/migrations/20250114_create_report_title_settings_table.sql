-- Create report_title_settings table for storing customizable report titles
CREATE TABLE IF NOT EXISTS public.report_title_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  title_template TEXT NOT NULL DEFAULT 'STUDENT''S PROGRESSIVE REPORT OF TERM {term}',
  use_dynamic_term BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Enable RLS
ALTER TABLE public.report_title_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for report_title_settings
CREATE POLICY "Allow all for authenticated users" ON public.report_title_settings
FOR ALL USING (auth.role() = 'authenticated');

-- Insert default settings for existing schools
INSERT INTO public.report_title_settings (school_id, title_template, use_dynamic_term)
SELECT school_id, 'STUDENT''S PROGRESSIVE REPORT OF TERM {term}', true
FROM public.schools
WHERE school_id NOT IN (SELECT school_id FROM public.report_title_settings);

-- Add comment for documentation
COMMENT ON TABLE public.report_title_settings IS 'Stores customizable report title templates for each school';
COMMENT ON COLUMN public.report_title_settings.title_template IS 'Template for report title. Use {term} placeholder for dynamic term insertion';
COMMENT ON COLUMN public.report_title_settings.use_dynamic_term IS 'Whether to automatically insert current term number into title';
