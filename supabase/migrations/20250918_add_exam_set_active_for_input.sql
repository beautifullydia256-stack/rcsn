-- Add active_for_input column to exam_sets table
ALTER TABLE public.exam_sets 
ADD COLUMN IF NOT EXISTS active_for_input BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.exam_sets.active_for_input IS 'Controls whether teachers can input results for this exam set. Can only be turned off if no results exist yet.';
