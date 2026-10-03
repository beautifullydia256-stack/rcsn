-- ============================================================================
-- Migration: 20261003000003_admin_user_and_school_defaults.sql
-- Description:
--   1. Switch admin_add_discipline_action, cast_guild_ballot, and certify_election_and_handover
--      from SECURITY DEFINER to SECURITY INVOKER (lint: 0029_authenticated_security_definer_function_executable)
--   2. Add RLS write policies on discipline_records for authenticated staff
--   3. Populate complete default institutional settings, classes, and subjects for Rakai Community School of Nursing
--   4. Set official institutional email domain to @rcsn.ac.ug
-- ============================================================================

-- 1. Ensure discipline_records has proper write policies for authenticated staff
DROP POLICY IF EXISTS "discipline_records_insert" ON public.discipline_records;
CREATE POLICY "discipline_records_insert"
ON public.discipline_records
FOR INSERT
TO authenticated
WITH CHECK (
  school_id = (SELECT public.current_user_school_id())
  OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
);

DROP POLICY IF EXISTS "discipline_records_modify" ON public.discipline_records;
CREATE POLICY "discipline_records_modify"
ON public.discipline_records
FOR UPDATE
TO authenticated
USING (
  school_id = (SELECT public.current_user_school_id())
  OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
)
WITH CHECK (
  school_id = (SELECT public.current_user_school_id())
  OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
);

-- 2. Switch the 3 functions to SECURITY INVOKER
ALTER FUNCTION public.admin_add_discipline_action(uuid, text, text, date, date) SECURITY INVOKER;
ALTER FUNCTION public.cast_guild_ballot(uuid, uuid, uuid, uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.certify_election_and_handover(uuid, uuid) SECURITY INVOKER;

-- 3. Comprehensive default school information with @rcsn.ac.ug
UPDATE public.schools
SET
  name = 'Rakai Community School of Nursing',
  subtitle = 'Dedicated to Excellence in Health Care Training - UNMEB Center U028',
  school_code = 'RCSN',
  type = 'Nursing & Midwifery Institution',
  motto = 'Training for Quality Health and Compassion',
  location = 'Rakai Town Council, Byakabanda Rd, Rakai District, Uganda',
  location_name = 'Rakai Main Campus',
  location_latitude = -0.7167,
  location_longitude = 31.4000,
  location_radius = 250,
  address = 'P.O. Box 118, Kalisizo / Rakai, Uganda',
  pobox = 'P.O. Box 118, Kalisizo',
  website = 'https://rcsn.ac.ug',
  email = 'info@rcsn.ac.ug',
  contact_email = 'info@rcsn.ac.ug',
  phone = '+256 701 444 870',
  contact_phone = '+256 701 444 870',
  logo = '/images/rcsn/logo.png',
  logo_url = '/images/rcsn/logo.png',
  header_school_name_color = '#065f46',
  header_subtitle_color = '#047857',
  header_address_color = '#065f46',
  header_contact_color = '#065f46',
  header_motto_color = '#059669',
  header_divider_color = '#10b981',
  header_chip_text_color = '#065f46',
  header_chip_background_color = '#ecfdf5',
  header_chip_border_color = '#a7f3d0',
  header_meta_line_color = '#64748b',
  header_contact_separator_color = '#cbd5e1',
  student_count = 350,
  subscription_plan = 'Unlimited Institution',
  next_term_begins_date = '2027-01-18'::date,
  wifi_ssid = 'RCSN-Staff-Campus',
  admin_id = '6993f427-dbfd-4c5f-b47e-36ded21ecf78'::uuid
WHERE school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid;

-- 4. Default Nursing & Midwifery Academic Cohorts
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

-- 5. Default UNMEB Nursing & Midwifery Course Modules
INSERT INTO public.subjects (school_id, name, description)
VALUES
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Anatomy and Physiology', 'Foundational human anatomy, organ systems, and bodily functions for nurses'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Fundamentals of Nursing & First Aid', 'Core nursing principles, hygiene, vital signs, aseptic technique, and emergency triage'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Medical-Surgical Nursing', 'Care of adult patients with medical conditions and perioperative surgical management'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Pharmacology & Therapeutics', 'Drug calculations, pharmacokinetics, adverse effects, and safe drug administration'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Microbiology & Infection Prevention', 'Disease-causing pathogens, sterilization, isolation techniques, and hospital IPC protocols'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Community Health Nursing & Primary Care', 'Public health epidemiology, immunizations, sanitation, and community home visits'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Midwifery & Obstetric Care', 'Antenatal care, labor management, normal delivery, postpartum care, and neonatology'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Paediatric & Child Health Nursing', 'Child development, neonatal resuscitation, childhood illnesses, and pediatric care'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Mental Health & Psychiatric Nursing', 'Psychosocial support, psychiatric disorders, counseling, and crisis de-escalation'),
  ('e1b10000-0000-4000-a000-000000000001'::uuid, 'Professional Ethics, Leadership & Management', 'UNMEB/UNMC regulatory legal framework, patient advocacy, leadership, and ward management')
ON CONFLICT DO NOTHING;
