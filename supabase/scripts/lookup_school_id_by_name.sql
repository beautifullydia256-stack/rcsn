-- Look up school_id by school name. Run in Supabase SQL Editor.
-- Matches "Rakai Infant School" or similar (case-insensitive, partial match).

SELECT school_id, name, location, type
FROM public.schools
WHERE name ILIKE '%rakai infant%'
   OR name ILIKE '%rakai%infant%';

-- If no rows: try exact or other variants, e.g.:
-- WHERE name ILIKE '%rakai%';
