-- Add next_term_begins_date field to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS next_term_begins_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.schools.next_term_begins_date IS 'Date when the next term begins for this school';

-- Set default value for existing schools (can be updated by admins)
UPDATE public.schools 
SET next_term_begins_date = CURRENT_DATE + INTERVAL '30 days'
WHERE next_term_begins_date IS NULL;
