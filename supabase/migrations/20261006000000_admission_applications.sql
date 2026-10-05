-- ==============================================================================
-- Migration: 20261006000000_admission_applications.sql
-- Description: Comprehensive Admissions, Interview & 1-Click Enrollment Engine
-- Institution: Rakai Community School of Nursing (RCSN)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admission_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001'::uuid,
    application_number TEXT UNIQUE NOT NULL, -- e.g. RCSN-2026-481920
    
    -- Biodata
    full_name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    gender TEXT NOT NULL DEFAULT 'Female' CHECK (gender IN ('Female', 'Male')),
    date_of_birth DATE NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    nin_or_id TEXT,
    nationality TEXT DEFAULT 'Ugandan',
    district TEXT,
    city TEXT,
    
    -- Academic Details
    programs JSONB NOT NULL DEFAULT '[]'::jsonb,
    admitted_program TEXT,
    intake TEXT NOT NULL DEFAULT 'August/September 2026 Intake',
    previous_school TEXT,
    index_number TEXT,
    qualifications_summary TEXT,
    subject_grades JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Documents & Attachments
    attached_document_url TEXT,
    attached_document_name TEXT,
    attached_document_size TEXT,
    passport_photo_url TEXT,
    
    -- Guardian / Next of Kin
    guardian_name TEXT,
    guardian_phone TEXT,
    guardian_relationship TEXT DEFAULT 'Parent / Guardian',
    
    -- Mobile Money Application Fee (UGX 50,000)
    application_fee NUMERIC DEFAULT 50000,
    payment_method TEXT DEFAULT 'MTN Mobile Money',
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'Verified' CHECK (payment_status IN ('Pending', 'Verified', 'Waived')),
    
    -- Lifecycle Status
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (
        status IN (
            'submitted',
            'under_review',
            'shortlisted',
            'interview_scheduled',
            'interview_passed',
            'interview_failed',
            'waitlisted',
            'admitted',
            'offer_accepted',
            'enrolled',
            'rejected'
        )
    ),
    rejection_reason TEXT,
    
    -- Interview Details
    interview_date DATE,
    interview_time TEXT,
    interview_venue TEXT DEFAULT 'RCSN Main Campus, Rakai Town',
    interview_panel TEXT,
    interview_score NUMERIC,
    interview_notes TEXT,
    
    -- Admission Offer Details
    admission_letter_number TEXT,
    admission_issued_at TIMESTAMPTZ,
    offer_accepted_at TIMESTAMPTZ,
    
    -- Residential Preference & Matriculation Link
    residential_preference TEXT DEFAULT 'Resident' CHECK (residential_preference IN ('Resident', 'Non-Resident')),
    enrolled_student_id UUID REFERENCES public.students(student_id) ON DELETE SET NULL,
    enrolled_at TIMESTAMPTZ,
    enrolled_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_adm_app_number ON public.admission_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_adm_app_phone ON public.admission_applications(phone);
CREATE INDEX IF NOT EXISTS idx_adm_app_status ON public.admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_adm_app_school ON public.admission_applications(school_id);
CREATE INDEX IF NOT EXISTS idx_adm_app_created ON public.admission_applications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated school staff have full management access
DROP POLICY IF EXISTS "admission_applications_staff_all" ON public.admission_applications;
CREATE POLICY "admission_applications_staff_all" ON public.admission_applications
    FOR ALL TO authenticated
    USING (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid)
    WITH CHECK (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

-- Policy 2: Public Anonymous users can submit online applications
DROP POLICY IF EXISTS "admission_applications_anon_insert" ON public.admission_applications;
CREATE POLICY "admission_applications_anon_insert" ON public.admission_applications
    FOR INSERT TO anon
    WITH CHECK (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

-- Policy 3: Public Anonymous users can track their application by Application Number or Phone
DROP POLICY IF EXISTS "admission_applications_anon_select" ON public.admission_applications;
CREATE POLICY "admission_applications_anon_select" ON public.admission_applications
    FOR SELECT TO anon
    USING (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

-- Policy 4: Public Anonymous users can accept admission offer (update status to offer_accepted)
DROP POLICY IF EXISTS "admission_applications_anon_update" ON public.admission_applications;
CREATE POLICY "admission_applications_anon_update" ON public.admission_applications
    FOR UPDATE TO anon
    USING (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid)
    WITH CHECK (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

-- Seed realistic sample applications for immediate testing & demonstration
INSERT INTO public.admission_applications (
    school_id,
    application_number,
    full_name,
    first_name,
    middle_name,
    last_name,
    gender,
    date_of_birth,
    phone,
    email,
    nin_or_id,
    nationality,
    district,
    city,
    programs,
    admitted_program,
    intake,
    previous_school,
    index_number,
    qualifications_summary,
    subject_grades,
    guardian_name,
    guardian_phone,
    guardian_relationship,
    payment_reference,
    payment_status,
    status,
    interview_date,
    interview_time,
    interview_venue,
    interview_score,
    admission_letter_number,
    admission_issued_at,
    residential_preference
) VALUES 
(
    'e1b10000-0000-4000-a000-000000000001'::uuid,
    'RCSN-2026-104921',
    'Nalubega Proscovia Sarah',
    'Proscovia',
    'Sarah',
    'Nalubega',
    'Female',
    '2004-05-14',
    '+256 701 884 192',
    'proscovia.nalubega@gmail.com',
    'CF040514929A10',
    'Ugandan',
    'Rakai',
    'Kyotera',
    '["Diploma in Nursing (Direct Entry)"]'::jsonb,
    'Diploma in Nursing (Direct Entry)',
    'August/September 2026 Intake',
    'St. Maria Goretti SS',
    'U0482/019',
    'UCE Science passes: Bio A, Chem B, Phys B, Math C, Eng A. UACE: Bio (B), Chem (C), Sub-Math (1).',
    '[{"subject":"Biology","grade":"A"},{"subject":"Chemistry","grade":"B"},{"subject":"Physics","grade":"B"},{"subject":"Mathematics","grade":"C"},{"subject":"English","grade":"A"}]'::jsonb,
    'Muwonge Francis',
    '+256 772 391 002',
    'Father',
    'RCSN-MM-8492019-2810',
    'Verified',
    'admitted',
    '2026-07-15',
    '09:00 AM',
    'RCSN Main Campus, Rakai Town',
    86,
    'RCSN/ADM/2026/042',
    now() - interval '2 days',
    'Resident'
),
(
    'e1b10000-0000-4000-a000-000000000001'::uuid,
    'RCSN-2026-281903',
    'Kato Isaac Mukasa',
    'Isaac',
    'Mukasa',
    'Kato',
    'Male',
    '2003-11-20',
    '+256 782 559 120',
    'isaac.kato@yahoo.com',
    'CM03112048291B',
    'Ugandan',
    'Masaka',
    'Masaka City',
    '["Certificate in Nursing"]'::jsonb,
    'Certificate in Nursing',
    'August/September 2026 Intake',
    'Masaka Secondary School',
    'U0017/088',
    'UCE: Bio B, Chem B, Phys C, Math C, Eng B.',
    '[{"subject":"Biology","grade":"B"},{"subject":"Chemistry","grade":"B"},{"subject":"Physics","grade":"C"},{"subject":"Mathematics","grade":"C"},{"subject":"English","grade":"B"}]'::jsonb,
    'Namukasa Rose',
    '+256 754 118 903',
    'Mother',
    'RCSN-MM-7193021-9921',
    'Verified',
    'interview_scheduled',
    '2026-07-20',
    '10:30 AM',
    'Skills Laboratory Conference Hall',
    NULL,
    NULL,
    NULL,
    'Resident'
),
(
    'e1b10000-0000-4000-a000-000000000001'::uuid,
    'RCSN-2026-394812',
    'Akello Brenda Faith',
    'Brenda',
    'Faith',
    'Akello',
    'Female',
    '2005-02-10',
    '+256 779 123 456',
    'faith.akello@gmail.com',
    'CF05021077218C',
    'Ugandan',
    'Lira',
    'Lira City',
    '["Certificate in Midwifery"]'::jsonb,
    NULL,
    'August/September 2026 Intake',
    'Lira Comprehensive SS',
    'U0124/055',
    'UCE: Bio A, Chem A, Phys B, Math B, Eng A.',
    '[{"subject":"Biology","grade":"A"},{"subject":"Chemistry","grade":"A"},{"subject":"Physics","grade":"B"},{"subject":"Mathematics","grade":"B"},{"subject":"English","grade":"A"}]'::jsonb,
    'Okello Patrick',
    '+256 788 334 112',
    'Guardian',
    'RCSN-MM-9102847-1102',
    'Verified',
    'under_review',
    NULL,
    NULL,
    'RCSN Main Campus, Rakai Town',
    NULL,
    NULL,
    NULL,
    'Non-Resident'
)
ON CONFLICT (application_number) DO NOTHING;
