-- ============================================================================
-- Migration: 20261004000000_single_tenant_rcsn_cleanup.sql
-- Description:
--   1. Optimize current_user_school_id() to direct O(1) single-school return
--      for Rakai Community School of Nursing ('e1b10000-0000-4000-a000-000000000001')
--   2. Drop obsolete multi-tenant SaaS tables (memberships, active schools, subscriptions, affiliates)
--   3. Drop obsolete Primary school tables (Nursery, Kindergarten, PLE results)
--   4. Drop obsolete Secondary school tables (O-Level, A-Level, UCE, UACE catalogs & results)
--   5. Lock public.schools and public.users to RCSN single-tenant institutional architecture
--   6. Purge any legacy primary/secondary classes, ensuring clean UNMEB Nursing & Midwifery cohorts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FAST-PATH CURRENT_USER_SCHOOL_ID (ELIMINATE MULTI-TENANT JOINS ON EVERY QUERY)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _private.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Dedicated Single Institution: Rakai Community School of Nursing
  SELECT 'e1b10000-0000-4000-a000-000000000001'::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Dedicated Single Institution: Rakai Community School of Nursing
  SELECT 'e1b10000-0000-4000-a000-000000000001'::uuid;
$$;

-- ----------------------------------------------------------------------------
-- 2. DROP FOREIGN KEYS ON public.schools FROM DEPRECATED SAAS TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_referral_code_id_fkey;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_affiliate_id_fkey;

-- ----------------------------------------------------------------------------
-- 3. DROP MULTI-TENANT SAAS TABLES
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.user_school_memberships CASCADE;
DROP TABLE IF EXISTS public.user_active_schools CASCADE;
DROP TABLE IF EXISTS public.school_subscriptions CASCADE;
DROP TABLE IF EXISTS public.affiliate_clicks CASCADE;
DROP TABLE IF EXISTS public.affiliate_codes CASCADE;
DROP TABLE IF EXISTS public.affiliate_earnings CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;

-- ----------------------------------------------------------------------------
-- 4. DROP PRIMARY SCHOOL SPECIFIC TABLES (NURSERY, KINDERGARTEN, PLE)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.class_teacher_nursery_comment_settings CASCADE;
DROP TABLE IF EXISTS public.headteacher_nursery_comment_settings CASCADE;
DROP TABLE IF EXISTS public.nursery_auto_comments CASCADE;
DROP TABLE IF EXISTS public.nursery_detailed_observation_items CASCADE;
DROP TABLE IF EXISTS public.pre_primary_holistic_rating_levels CASCADE;
DROP TABLE IF EXISTS public.pre_primary_holistic_skills CASCADE;
DROP TABLE IF EXISTS public.pre_primary_holistic_strands CASCADE;
DROP TABLE IF EXISTS public.processed_primary_exam_results CASCADE;

-- ----------------------------------------------------------------------------
-- 5. DROP SECONDARY SCHOOL SPECIFIC TABLES (O-LEVEL, A-LEVEL, UCE, UACE)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.uce_subject_catalog CASCADE;
DROP TABLE IF EXISTS public.uace_subject_catalog CASCADE;
DROP TABLE IF EXISTS public.student_olevel_subjects CASCADE;
DROP TABLE IF EXISTS public.student_alevel_subjects CASCADE;
DROP TABLE IF EXISTS public.school_uace_class_subject_papers CASCADE;
DROP TABLE IF EXISTS public.school_class_uace_grade_bands CASCADE;
DROP TABLE IF EXISTS public.processed_secondary_exam_results CASCADE;

-- ----------------------------------------------------------------------------
-- 6. PURGE NON-RCSN SCHOOLS & LOCK RECORD
-- ----------------------------------------------------------------------------
DELETE FROM public.schools 
WHERE school_id != 'e1b10000-0000-4000-a000-000000000001'::uuid;

UPDATE public.schools
SET
  name = 'Rakai Community School of Nursing',
  school_code = 'RCSN',
  subtitle = 'Dedicated to Excellence in Health Care Training - UNMEB Examination Centre U028',
  type = 'Nursing & Midwifery Institution',
  motto = 'Training for Quality Health and Compassion',
  address = 'P.O. Box 118, Kalisizo / Rakai, Uganda',
  pobox = 'P.O. Box 118, Kalisizo',
  location = 'Rakai Town Council, Byakabanda Rd, Rakai District, Uganda',
  website = 'https://rcsn.ac.ug',
  email = 'info@rcsn.ac.ug',
  contact_email = 'info@rcsn.ac.ug',
  phone = '+256 701 444 870',
  contact_phone = '+256 701 444 870',
  logo = '/images/rcsn/logo.png',
  logo_url = '/images/rcsn/logo.png'
WHERE school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid;

-- Drop obsolete SaaS columns from schools table if they exist
ALTER TABLE public.schools DROP COLUMN IF EXISTS referral_code_id;
ALTER TABLE public.schools DROP COLUMN IF EXISTS affiliate_id;
ALTER TABLE public.schools DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE public.schools DROP COLUMN IF EXISTS subscription_status;

-- ----------------------------------------------------------------------------
-- 7. LOCK USERS TABLE TO RCSN
-- ----------------------------------------------------------------------------
UPDATE public.users
SET school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
WHERE school_id IS NULL OR school_id != 'e1b10000-0000-4000-a000-000000000001'::uuid;

ALTER TABLE public.users 
ALTER COLUMN school_id SET DEFAULT 'e1b10000-0000-4000-a000-000000000001'::uuid;

-- ----------------------------------------------------------------------------
-- 8. PURGE OBSOLETE PRIMARY/SECONDARY CLASSES
-- ----------------------------------------------------------------------------
DELETE FROM public.classes
WHERE school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  AND (
    class_name ~* '^(p\.|s\.|primary|senior|baby|middle|top|nursery|o-level|a-level)'
    OR class_name ILIKE '%primary%'
    OR class_name ILIKE '%senior%'
  );

-- Ensure official UNMEB Nursing & Midwifery Cohorts are seeded
INSERT INTO public.classes (school_id, class_name, description, max_students)
VALUES
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Nursing - Year 1', 'First Year Certificate in Nursing Students', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Nursing - Year 2', 'Second Year Certificate in Nursing Students', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Nursing - Final Year', 'Final Year (Semester 5) Certificate in Nursing Candidates', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Midwifery - Year 1', 'First Year Certificate in Midwifery Students', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Midwifery - Year 2', 'Second Year Certificate in Midwifery Students', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Certificate in Midwifery - Final Year', 'Final Year (Semester 5) Certificate in Midwifery Candidates', 100),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Diploma in Nursing (Extension)', 'Diploma in Nursing Extension Programme Candidates', 60),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Diploma in Midwifery (Extension)', 'Diploma in Midwifery Extension Programme Candidates', 60)
ON CONFLICT DO NOTHING;
