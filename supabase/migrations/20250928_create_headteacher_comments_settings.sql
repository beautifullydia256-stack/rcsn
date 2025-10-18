-- Create headteacher comments settings table
CREATE TABLE IF NOT EXISTS public.headteacher_comments_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  min_percent NUMERIC NOT NULL CHECK (min_percent >= 0 AND min_percent <= 100),
  max_percent NUMERIC NOT NULL CHECK (max_percent >= 0 AND max_percent <= 100),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure min_percent <= max_percent
  CONSTRAINT check_percent_range CHECK (min_percent <= max_percent),
  
  -- Ensure no overlapping ranges for the same school
  UNIQUE(school_id, min_percent, max_percent)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_headteacher_comments_settings_school_id ON public.headteacher_comments_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_headteacher_comments_settings_percent_range ON public.headteacher_comments_settings(school_id, min_percent, max_percent);

-- Enable RLS
ALTER TABLE public.headteacher_comments_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "headteacher_comments_settings_select_own_school" ON public.headteacher_comments_settings;
CREATE POLICY "headteacher_comments_settings_select_own_school" ON public.headteacher_comments_settings
    FOR SELECT TO authenticated
    USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "headteacher_comments_settings_all_headteacher" ON public.headteacher_comments_settings;
CREATE POLICY "headteacher_comments_settings_all_headteacher" ON public.headteacher_comments_settings
    FOR ALL TO authenticated
    USING (
        school_id = public.current_school_id() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid() 
            AND role = 'head_teacher' 
            AND school_id = public.headteacher_comments_settings.school_id
        )
    )
    WITH CHECK (
        school_id = public.current_school_id() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid() 
            AND role = 'head_teacher' 
            AND school_id = public.headteacher_comments_settings.school_id
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.headteacher_comments_settings IS 'Settings for headteacher comments based on student performance ranges';
COMMENT ON COLUMN public.headteacher_comments_settings.min_percent IS 'Minimum percentage for this comment range (inclusive)';
COMMENT ON COLUMN public.headteacher_comments_settings.max_percent IS 'Maximum percentage for this comment range (inclusive)';
COMMENT ON COLUMN public.headteacher_comments_settings.comment_text IS 'The comment text to display for this percentage range';

-- Insert default headteacher comment ranges for existing schools
INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT 
    s.school_id,
    0,
    40,
    'The student needs to put in more effort. With proper guidance and hard work, better results can be achieved next term.'
FROM public.schools s
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT 
    s.school_id,
    41,
    60,
    'A fair performance. With greater consistency and focus, the student can improve significantly.'
FROM public.schools s
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT 
    s.school_id,
    61,
    80,
    'A good performance reflecting steady progress. Keep encouraging consistent effort to reach higher levels.'
FROM public.schools s
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT 
    s.school_id,
    81,
    100,
    'An excellent performance that shows hard work, focus, and discipline. Maintain this level of commitment for continued success.'
FROM public.schools s
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;
