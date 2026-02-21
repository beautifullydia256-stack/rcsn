-- Keep only the admission number function used by the app (no-hyphen format).
-- Drop the other overloads so future calls always get RAK202503001-style numbers.

-- 1. No-arg version (returns ADM-YYYY-NNNN)
DROP FUNCTION IF EXISTS public.generate_admission_number();

-- 2. Old signature with different parameter order (returns hyphenated with initials)
DROP FUNCTION IF EXISTS public.generate_admission_number(date, text, text, text, uuid);

-- The only remaining function is:
-- generate_admission_number(p_school_id uuid, p_first_name text, p_middle_name text, p_last_name text, p_admission_date date)
-- which returns format: KAM202503001 (no hyphens).
