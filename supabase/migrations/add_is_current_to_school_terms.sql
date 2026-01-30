-- Add is_current column to school_terms table to track current term
-- Logic: Only one term per school should be current at a time
-- When moving to next term, the new term becomes current

ALTER TABLE public.school_terms 
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_terms_is_current ON public.school_terms(school_id, is_current) WHERE is_current = true;

-- Add comment
COMMENT ON COLUMN public.school_terms.is_current IS 'Indicates if this is the current active term for the school. Only one term per school should be current at a time.';




