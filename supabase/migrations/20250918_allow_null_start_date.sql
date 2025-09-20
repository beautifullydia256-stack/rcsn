-- Allow null start_date in school_terms table
ALTER TABLE public.school_terms 
ALTER COLUMN start_date DROP NOT NULL;

-- Add comment to explain the change
COMMENT ON COLUMN public.school_terms.start_date IS 'Start date of the term. Can be null for current term when only end date is known.';
