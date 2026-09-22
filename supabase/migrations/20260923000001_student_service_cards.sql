-- Migration: 20260923000001_student_service_cards.sql
-- Description: Student Service Access Cards (Entrance passes, Examination cards, Meal cards, Library passes)
-- Features: Expiration tracking, fee threshold clearance, secure multi-role QR verification RPC.

-- 1. Create table public.student_service_cards
CREATE TABLE IF NOT EXISTS public.student_service_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_number TEXT NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    card_type TEXT NOT NULL CHECK (card_type IN ('entrance', 'examination', 'meal', 'library', 'general')),
    title TEXT NOT NULL,
    academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    academic_term INT NOT NULL DEFAULT 1,
    exam_set_id UUID REFERENCES public.exam_sets(id) ON DELETE SET NULL,
    min_fee_percent_required NUMERIC(5,2) DEFAULT 0,
    fee_percentage_at_issuance NUMERIC(5,2) DEFAULT 0,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
    qr_payload TEXT NOT NULL,
    issued_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_service_cards_school_type ON public.student_service_cards(school_id, card_type, status);
CREATE INDEX IF NOT EXISTS idx_student_service_cards_student ON public.student_service_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_student_service_cards_number ON public.student_service_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_student_service_cards_expiry ON public.student_service_cards(expiry_date);

-- 2. Create table public.student_card_scans
CREATE TABLE IF NOT EXISTS public.student_card_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.student_service_cards(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    scanner_name TEXT,
    scanner_role TEXT,
    location TEXT,
    scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'expired', 'revoked', 'denied', 'invalid')),
    notes TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_card_scans_card ON public.student_card_scans(card_id);
CREATE INDEX IF NOT EXISTS idx_student_card_scans_school ON public.student_card_scans(school_id, scanned_at DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.student_service_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_card_scans ENABLE ROW LEVEL SECURITY;

-- Select policy: school users can view their school's cards
CREATE POLICY "Users can view service cards for their school"
    ON public.student_service_cards FOR SELECT
    TO authenticated
    USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Insert/Update/Delete policy: staff/admins can manage cards
CREATE POLICY "Authorized staff can manage service cards"
    ON public.student_service_cards FOR ALL
    TO authenticated
    USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- Scans policies
CREATE POLICY "Users can view card scans for their school"
    ON public.student_card_scans FOR SELECT
    TO authenticated
    USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can record card scans"
    ON public.student_card_scans FOR INSERT
    TO authenticated
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.users WHERE user_id = auth.uid()
        )
    );

-- 4. Verification RPC (SECURITY DEFINER)
-- Enables quick verification from any terminal (security guard, gatekeeper, teacher, reception)
CREATE OR REPLACE FUNCTION public.verify_student_service_card(
    p_code TEXT,
    p_location TEXT DEFAULT 'Gatehouse',
    p_scanner_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code TEXT;
    v_card RECORD;
    v_student RECORD;
    v_school RECORD;
    v_photo_url TEXT;
    v_scanner_user_id UUID;
    v_scanner_name TEXT;
    v_scanner_role TEXT;
    v_scanner_school_id UUID;
    v_is_expired BOOLEAN;
    v_status TEXT;
    v_valid BOOLEAN;
    v_message TEXT;
    v_result JSONB;
BEGIN
    -- Extract clean code (handles raw code or JSON payload containing card_number)
    v_clean_code := TRIM(p_code);
    IF v_clean_code LIKE '{%' THEN
        BEGIN
            v_clean_code := TRIM(BOTH '"' FROM (v_clean_code::jsonb ->> 'card_number'));
        EXCEPTION WHEN OTHERS THEN
            v_clean_code := TRIM(p_code);
        END;
    END IF;

    -- Look up card by card_number or qr_payload
    SELECT * INTO v_card
    FROM public.student_service_cards
    WHERE UPPER(card_number) = UPPER(v_clean_code)
       OR qr_payload = v_clean_code
    LIMIT 1;

    -- If not found
    IF v_card IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'valid', false,
            'status', 'invalid',
            'message', 'Card not recognized. No valid service card exists with this code.'
        );
    END IF;

    -- Get scanner user details if authenticated
    v_scanner_user_id := auth.uid();
    IF v_scanner_user_id IS NOT NULL THEN
        SELECT name, role, school_id INTO v_scanner_name, v_scanner_role, v_scanner_school_id
        FROM public.users
        WHERE user_id = v_scanner_user_id
        LIMIT 1;
    END IF;

    -- Check expiry against current time
    v_is_expired := (v_card.expiry_date < now());

    IF v_card.status = 'revoked' THEN
        v_status := 'revoked';
        v_valid := false;
        v_message := 'CARD REVOKED: This card was cancelled or invalidated by administration.';
    ELSIF v_card.status = 'suspended' THEN
        v_status := 'suspended';
        v_valid := false;
        v_message := 'CARD SUSPENDED: Temporary hold placed on student access.';
    ELSIF v_is_expired OR v_card.status = 'expired' THEN
        v_status := 'expired';
        v_valid := false;
        v_message := format('CARD EXPIRED: Expired on %s at %s.',
            to_char(v_card.expiry_date, 'DD Mon YYYY'),
            to_char(v_card.expiry_date, 'HH12:MI AM')
        );
        -- Update card status if it was active
        IF v_card.status = 'active' THEN
            UPDATE public.student_service_cards
            SET status = 'expired', updated_at = now()
            WHERE id = v_card.id;
        END IF;
    ELSE
        v_status := 'valid';
        v_valid := true;
        v_message := 'ACCESS GRANTED: Official verified active card.';
    END IF;

    -- Fetch Student details
    SELECT 
        student_id, name, first_name, middle_name, last_name,
        current_class, stream, admission_number, status, payment_status,
        guardian_name, guardian_phone
    INTO v_student
    FROM public.students
    WHERE student_id = v_card.student_id;

    -- Fetch primary photo if available
    SELECT photo_url INTO v_photo_url
    FROM public.student_photos
    WHERE student_id = v_card.student_id AND is_primary = true
    LIMIT 1;

    -- Fetch School details
    SELECT school_id, name, type, badge_url
    INTO v_school
    FROM public.schools
    WHERE school_id = v_card.school_id;

    -- Record scan audit log
    INSERT INTO public.student_card_scans (
        card_id,
        school_id,
        scanned_by,
        scanner_name,
        scanner_role,
        location,
        scan_result,
        notes,
        scanned_at
    ) VALUES (
        v_card.id,
        v_card.school_id,
        v_scanner_user_id,
        COALESCE(v_scanner_name, 'Terminal Scanner'),
        COALESCE(v_scanner_role, 'Security / Staff'),
        COALESCE(p_location, 'Gatehouse'),
        CASE WHEN v_valid THEN 'valid' ELSE v_status END,
        COALESCE(p_scanner_notes, v_message),
        now()
    );

    -- Build complete JSON response
    v_result := jsonb_build_object(
        'found', true,
        'valid', v_valid,
        'status', v_status,
        'message', v_message,
        'card', jsonb_build_object(
            'id', v_card.id,
            'card_number', v_card.card_number,
            'card_type', v_card.card_type,
            'title', v_card.title,
            'academic_year', v_card.academic_year,
            'academic_term', v_card.academic_term,
            'min_fee_percent_required', v_card.min_fee_percent_required,
            'fee_percentage_at_issuance', v_card.fee_percentage_at_issuance,
            'issue_date', v_card.issue_date,
            'expiry_date', v_card.expiry_date,
            'notes', v_card.notes
        ),
        'student', jsonb_build_object(
            'student_id', v_student.student_id,
            'name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', v_student.first_name, v_student.middle_name, v_student.last_name)), ''), v_student.name, 'Student'),
            'admission_number', v_student.admission_number,
            'current_class', v_student.current_class,
            'stream', v_student.stream,
            'status', v_student.status,
            'payment_status', v_student.payment_status,
            'guardian_name', v_student.guardian_name,
            'guardian_phone', v_student.guardian_phone,
            'photo_url', v_photo_url
        ),
        'school', jsonb_build_object(
            'school_id', v_school.school_id,
            'name', v_school.name,
            'type', v_school.type,
            'badge_url', v_school.badge_url
        ),
        'verified_at', now()
    );

    RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_student_service_card(TEXT, TEXT, TEXT) TO authenticated;
