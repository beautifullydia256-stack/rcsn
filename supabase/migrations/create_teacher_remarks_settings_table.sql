-- Create teacher_remarks_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.teacher_remarks_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  min_percent INTEGER NOT NULL CHECK (min_percent >= 0 AND min_percent <= 100),
  max_percent INTEGER NOT NULL CHECK (max_percent >= 0 AND max_percent <= 100),
  comment_text TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_remarks_settings_school_subject 
ON public.teacher_remarks_settings(school_id, subject);

CREATE INDEX IF NOT EXISTS idx_teacher_remarks_settings_school_id 
ON public.teacher_remarks_settings(school_id);

-- Enable RLS
ALTER TABLE public.teacher_remarks_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "teacher_remarks_settings_school_access" 
ON public.teacher_remarks_settings
FOR ALL
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM users WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_teacher_remarks_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_remarks_settings_updated_at
  BEFORE UPDATE ON public.teacher_remarks_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_remarks_settings_updated_at();
