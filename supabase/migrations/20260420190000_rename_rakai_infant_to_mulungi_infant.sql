-- Rename Rakai Infant Primary School → Mulungi Infant Primary School
-- (Stored value is title case, not ALL CAPS — case-insensitive match.)

UPDATE public.schools
SET name = 'Mulungi Infant Primary School'
WHERE lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower('Rakai Infant Primary School');
