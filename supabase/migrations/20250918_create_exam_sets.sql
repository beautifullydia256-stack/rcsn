-- Create exam_sets table
CREATE TABLE IF NOT EXISTS public.exam_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Beginning of Term", "Mid Term", "End of Term"
    description TEXT,
    term INTEGER NOT NULL, -- 1, 2, or 3
    year INTEGER NOT NULL,
    target_classes TEXT[] DEFAULT '{}', -- Empty array means all classes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_sets_school_id ON public.exam_sets(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_sets_term_year ON public.exam_sets(term, year);
CREATE INDEX IF NOT EXISTS idx_exam_sets_active ON public.exam_sets(is_active);

-- Enable RLS
ALTER TABLE public.exam_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users for now
-- Note: School-specific filtering will be handled at the application level
DROP POLICY IF EXISTS "exam_sets_authenticated_access" ON public.exam_sets;
CREATE POLICY "exam_sets_authenticated_access" ON public.exam_sets
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_exam_sets_updated_at ON public.exam_sets;
CREATE TRIGGER update_exam_sets_updated_at
    BEFORE UPDATE ON public.exam_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
