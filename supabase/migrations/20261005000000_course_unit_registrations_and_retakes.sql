-- ==============================================================================
-- Migration: 20261005000000_course_unit_registrations_and_retakes.sql
-- Description: Tertiary Course-Unit Registration, Retakes, and Lesson Attendance
-- Institution: Rakai Community School of Nursing (RCSN)
-- ==============================================================================

-- 1. Table: course_unit_registrations
CREATE TABLE IF NOT EXISTS public.course_unit_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001'::uuid,
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_unit_code TEXT NOT NULL,
    course_unit_title TEXT NOT NULL,
    credit_units NUMERIC DEFAULT 3.0,
    cohort_class TEXT NOT NULL,
    offering_semester TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    registration_type TEXT NOT NULL DEFAULT 'regular' CHECK (registration_type IN ('regular', 'retake', 'deferred')),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')),
    previous_score NUMERIC,
    previous_grade TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_unit_academic_run UNIQUE (school_id, student_id, course_unit_code, academic_year, offering_semester)
);

CREATE INDEX IF NOT EXISTS idx_cur_school_unit_status 
    ON public.course_unit_registrations(school_id, course_unit_code, status);

CREATE INDEX IF NOT EXISTS idx_cur_student 
    ON public.course_unit_registrations(student_id);

CREATE INDEX IF NOT EXISTS idx_cur_reg_type 
    ON public.course_unit_registrations(school_id, registration_type, status);

-- 2. Add retake tracking to exam_results
ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS is_retake BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sitting_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS original_cohort TEXT;

-- 3. Table: course_unit_lesson_attendance
CREATE TABLE IF NOT EXISTS public.course_unit_lesson_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001'::uuid,
    course_unit_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    teacher_id UUID,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lesson_topic TEXT,
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cula_school_unit_date 
    ON public.course_unit_lesson_attendance(school_id, course_unit_code, attendance_date);

-- 4. Enable RLS
ALTER TABLE public.course_unit_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_unit_lesson_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_unit_registrations_access" ON public.course_unit_registrations;
CREATE POLICY "course_unit_registrations_access" ON public.course_unit_registrations
    FOR ALL TO authenticated
    USING (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid)
    WITH CHECK (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

DROP POLICY IF EXISTS "course_unit_lesson_attendance_access" ON public.course_unit_lesson_attendance;
CREATE POLICY "course_unit_lesson_attendance_access" ON public.course_unit_lesson_attendance
    FOR ALL TO authenticated
    USING (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid)
    WITH CHECK (school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid);

-- 5. Seed initial registrations for existing active students based on standard curriculum
DO $$
DECLARE
    r_student RECORD;
BEGIN
    FOR r_student IN 
        SELECT student_id, current_class, school_id 
        FROM public.students 
        WHERE status = 'active'
    LOOP
        -- Year 1 Semester 1 standard courses
        IF r_student.current_class ILIKE '%Year 1 Semester 1%' OR r_student.current_class ILIKE '%Y1S1%' OR r_student.current_class = 'Certificate Nursing Year 1' THEN
            INSERT INTO public.course_unit_registrations (school_id, student_id, course_unit_code, course_unit_title, cohort_class, offering_semester, registration_type, status)
            VALUES 
                (r_student.school_id, r_student.student_id, 'CN 111', 'Anatomy and Physiology I and First Aid', r_student.current_class, 'Y1S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 112', 'Foundations of Nursing and Basic Computer', r_student.current_class, 'Y1S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 113', 'Personal and Communal Health and Microbiology', r_student.current_class, 'Y1S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 114', 'Practical I (Skills Lab & Hospital Placement)', r_student.current_class, 'Y1S1', 'regular', 'approved')
            ON CONFLICT (school_id, student_id, course_unit_code, academic_year, offering_semester) DO NOTHING;
            
        -- Year 1 Semester 2 standard courses
        ELSIF r_student.current_class ILIKE '%Year 1 Semester 2%' OR r_student.current_class ILIKE '%Y1S2%' THEN
            INSERT INTO public.course_unit_registrations (school_id, student_id, course_unit_code, course_unit_title, cohort_class, offering_semester, registration_type, status)
            VALUES 
                (r_student.school_id, r_student.student_id, 'CN 121', 'Anatomy and Physiology II', r_student.current_class, 'Y1S2', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 122', 'Medical Nursing I and Pharmacology I', r_student.current_class, 'Y1S2', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 123', 'Surgical Nursing I', r_student.current_class, 'Y1S2', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 124', 'Practical II (Clinical Rotations)', r_student.current_class, 'Y1S2', 'regular', 'approved')
            ON CONFLICT (school_id, student_id, course_unit_code, academic_year, offering_semester) DO NOTHING;
            
        -- Year 2 Semester 1 standard courses
        ELSIF r_student.current_class ILIKE '%Year 2 Semester 1%' OR r_student.current_class ILIKE '%Y2S1%' THEN
            INSERT INTO public.course_unit_registrations (school_id, student_id, course_unit_code, course_unit_title, cohort_class, offering_semester, registration_type, status)
            VALUES 
                (r_student.school_id, r_student.student_id, 'CN 211', 'Medical Nursing II and Pharmacology II', r_student.current_class, 'Y2S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 212', 'Pediatric Nursing', r_student.current_class, 'Y2S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 213', 'Mental Health and Psychiatric Nursing', r_student.current_class, 'Y2S1', 'regular', 'approved'),
                (r_student.school_id, r_student.student_id, 'CN 214', 'Practical III (Ward Postings & OSCE)', r_student.current_class, 'Y2S1', 'regular', 'approved')
            ON CONFLICT (school_id, student_id, course_unit_code, academic_year, offering_semester) DO NOTHING;
        END IF;
    END LOOP;
END $$;
