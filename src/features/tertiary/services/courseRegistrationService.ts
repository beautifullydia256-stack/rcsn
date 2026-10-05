import { supabase } from '@/lib/supabase';
import { UHPAB_CERTIFICATE_NURSING_UNITS } from '../data/unmebCurriculumDefaults';

export interface CourseUnitRegistration {
  id: string;
  school_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  current_class?: string;
  course_unit_code: string;
  course_unit_title: string;
  credit_units: number;
  cohort_class: string;
  offering_semester: string;
  academic_year: string;
  registration_type: 'regular' | 'retake' | 'deferred';
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  previous_score?: number | null;
  previous_grade?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OutstandingRetake {
  course_unit_code: string;
  course_unit_title: string;
  failed_semester: string;
  failed_score: number;
  failed_grade: string;
  exam_date?: string;
  is_currently_registered: boolean;
}

export interface RegisteredTraineeForUnit {
  student_id: string;
  name: string;
  admission_number: string;
  home_cohort: string;
  is_retake: boolean;
  registration_id: string;
  registration_status: string;
  previous_score?: number | null;
  previous_grade?: string | null;
}

const DEFAULT_SCHOOL_ID = 'e1b10000-0000-4000-a000-000000000001';

/**
 * Fetch all course registrations for a specific student
 */
export async function fetchStudentCourseRegistrations(
  studentId: string
): Promise<CourseUnitRegistration[]> {
  try {
    const { data, error } = await supabase
      .from('course_unit_registrations')
      .select('*')
      .eq('student_id', studentId)
      .order('offering_semester', { ascending: false })
      .order('course_unit_code', { ascending: true });

    if (error) {
      console.warn('[courseRegistrationService] Error loading student registrations:', error);
      return [];
    }

    return (data as CourseUnitRegistration[]) || [];
  } catch (err) {
    console.error('[courseRegistrationService] Exception loading student registrations:', err);
    return [];
  }
}

/**
 * Detect failed course units in past semesters that require a retake
 */
export async function fetchStudentOutstandingRetakes(
  studentId: string
): Promise<OutstandingRetake[]> {
  try {
    // 1. Fetch past exam results for this student
    const { data: results, error: rErr } = await supabase
      .from('exam_results')
      .select('subject, marks_obtained, final_score, exam_score, grade, class_name, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (rErr || !results || results.length === 0) return [];

    // 2. Fetch current registrations to see which retakes are already enrolled
    const { data: activeRegs } = await supabase
      .from('course_unit_registrations')
      .select('course_unit_code, course_unit_title, status, registration_type')
      .eq('student_id', studentId);

    const activeRetakeCodes = new Set(
      (activeRegs || [])
        .filter((r) => r.registration_type === 'retake' && r.status !== 'rejected')
        .map((r) => r.course_unit_code.toUpperCase().trim())
    );

    // Track latest performance per subject/course unit
    const historyMap = new Map<string, { latestScore: number; latestGrade: string; latestClass: string; latestDate: string }>();

    results.forEach((r) => {
      const code = String(r.subject || '').trim().toUpperCase();
      const score = Number(r.marks_obtained ?? r.final_score ?? r.exam_score ?? 0);
      const grade = String(r.grade || 'F').trim().toUpperCase();
      historyMap.set(code, {
        latestScore: score,
        latestGrade: grade,
        latestClass: r.class_name || 'Year 1 Semester 1',
        latestDate: r.created_at || '',
      });
    });

    const retakes: OutstandingRetake[] = [];
    historyMap.forEach((perf, code) => {
      // UNMEB / RCSN pass mark is 50.0% / Grade D
      if (perf.latestScore < 50 || perf.latestGrade === 'F') {
        const curriculumMatch = UHPAB_CERTIFICATE_NURSING_UNITS.find(
          (u) => u.code.toUpperCase() === code || u.title.toLowerCase() === code.toLowerCase()
        );
        retakes.push({
          course_unit_code: curriculumMatch?.code || code,
          course_unit_title: curriculumMatch?.title || code,
          failed_semester: perf.latestClass,
          failed_score: perf.latestScore,
          failed_grade: perf.latestGrade,
          exam_date: perf.latestDate,
          is_currently_registered: activeRetakeCodes.has(code) || (curriculumMatch ? activeRetakeCodes.has(curriculumMatch.code.toUpperCase()) : false),
        });
      }
    });

    return retakes;
  } catch (err) {
    console.error('[courseRegistrationService] Exception calculating retakes:', err);
    return [];
  }
}

/**
 * Fetch registered and approved students for a course unit
 * Includes both regular students and retake students from other cohorts
 */
export async function fetchRegisteredStudentsForCourseUnit(
  courseUnitCode: string,
  className?: string
): Promise<RegisteredTraineeForUnit[]> {
  const normCode = courseUnitCode.trim().toUpperCase();

  try {
    // 1. Fetch from course_unit_registrations table
    let regQuery = supabase
      .from('course_unit_registrations')
      .select(`
        id,
        student_id,
        course_unit_code,
        cohort_class,
        registration_type,
        status,
        previous_score,
        previous_grade,
        students!inner (
          student_id,
          name,
          admission_number,
          current_class,
          status
        )
      `)
      .eq('status', 'approved')
      .or(`course_unit_code.ilike.%${normCode}%,course_unit_title.ilike.%${normCode}%`);

    const { data: regData, error: regErr } = await regQuery;

    if (!regErr && regData && regData.length > 0) {
      return regData
        .filter((r: any) => r.students?.status === 'active')
        .map((r: any) => {
          const isRetake = r.registration_type === 'retake' || (className && r.cohort_class !== className);
          return {
            student_id: r.student_id,
            name: r.students?.name || 'Trainee',
            admission_number: r.students?.admission_number || 'N/A',
            home_cohort: r.cohort_class || r.students?.current_class || 'General',
            is_retake: !!isRetake,
            registration_id: r.id,
            registration_status: r.status,
            previous_score: r.previous_score,
            previous_grade: r.previous_grade,
          };
        })
        .sort((a, b) => {
          // Keep regular first, retakes clearly identifiable
          if (a.is_retake === b.is_retake) return a.name.localeCompare(b.name);
          return a.is_retake ? 1 : -1;
        });
    }

    // 2. Resilient fallback: If no explicit registrations exist yet, fetch cohort trainees
    if (className) {
      const { data: fallbackStudents } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .eq('school_id', DEFAULT_SCHOOL_ID)
        .eq('current_class', className)
        .eq('status', 'active')
        .order('name');

      return (fallbackStudents || []).map((s) => ({
        student_id: s.student_id,
        name: s.name,
        admission_number: s.admission_number || 'N/A',
        home_cohort: s.current_class,
        is_retake: false,
        registration_id: `fallback-${s.student_id}`,
        registration_status: 'approved',
      }));
    }

    return [];
  } catch (err) {
    console.error('[courseRegistrationService] fetchRegisteredStudentsForCourseUnit error:', err);
    return [];
  }
}

/**
 * Academic Registrar: Fetch all course registrations for administration & approval
 */
export async function fetchCourseRegistrationsBySchool(filters?: {
  offering_semester?: string;
  status?: string;
  registration_type?: string;
  search?: string;
}): Promise<CourseUnitRegistration[]> {
  try {
    let query = supabase
      .from('course_unit_registrations')
      .select(`
        *,
        students (
          name,
          admission_number,
          current_class
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.offering_semester && filters.offering_semester !== 'all') {
      query = query.eq('offering_semester', filters.offering_semester);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.registration_type && filters.registration_type !== 'all') {
      query = query.eq('registration_type', filters.registration_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      student_name: r.students?.name || 'Trainee',
      admission_number: r.students?.admission_number || 'N/A',
      current_class: r.students?.current_class || r.cohort_class,
    }));
  } catch (err) {
    console.error('[courseRegistrationService] fetchCourseRegistrationsBySchool error:', err);
    return [];
  }
}

/**
 * Approve a registration (regular or retake)
 */
export async function approveRegistration(
  registrationId: string,
  approvedBy?: string
): Promise<void> {
  const { error } = await supabase
    .from('course_unit_registrations')
    .update({
      status: 'approved',
      approved_by: approvedBy || null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (error) throw error;
}

/**
 * Reject or defer a registration
 */
export async function rejectRegistration(
  registrationId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('course_unit_registrations')
    .update({
      status: 'rejected',
      notes: notes || 'Rejected by Academic Registrar',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (error) throw error;
}

/**
 * Academic Registrar manual assignment or activation of a course unit / retake
 */
export async function assignManualCourseRegistration(params: {
  student_id: string;
  course_unit_code: string;
  course_unit_title: string;
  offering_semester: string;
  cohort_class: string;
  registration_type: 'regular' | 'retake' | 'deferred';
  previous_score?: number | null;
  previous_grade?: string | null;
  notes?: string;
  approved_by?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('course_unit_registrations')
    .upsert(
      {
        school_id: DEFAULT_SCHOOL_ID,
        student_id: params.student_id,
        course_unit_code: params.course_unit_code.trim(),
        course_unit_title: params.course_unit_title.trim(),
        cohort_class: params.cohort_class.trim(),
        offering_semester: params.offering_semester.trim(),
        academic_year: '2026/2027',
        registration_type: params.registration_type,
        status: 'approved',
        previous_score: params.previous_score ?? null,
        previous_grade: params.previous_grade ?? null,
        approved_by: params.approved_by || null,
        approved_at: new Date().toISOString(),
        notes: params.notes || 'Manually assigned by Academic Registrar',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id,student_id,course_unit_code,academic_year,offering_semester' }
    );

  if (error) throw error;
}

/**
 * Student portal: Submit course unit registration and retake enrollments
 */
export async function submitStudentCourseRegistration(
  studentId: string,
  selections: Array<{
    course_unit_code: string;
    course_unit_title: string;
    offering_semester: string;
    cohort_class: string;
    registration_type: 'regular' | 'retake' | 'deferred';
    previous_score?: number | null;
    previous_grade?: string | null;
  }>
): Promise<void> {
  if (!selections || selections.length === 0) return;

  const records = selections.map((s) => ({
    school_id: DEFAULT_SCHOOL_ID,
    student_id: studentId,
    course_unit_code: s.course_unit_code.trim(),
    course_unit_title: s.course_unit_title.trim(),
    cohort_class: s.cohort_class.trim(),
    offering_semester: s.offering_semester.trim(),
    academic_year: '2026/2027',
    registration_type: s.registration_type,
    // Y1S1 is automatically approved; continuing retakes and deferrals go to pending for Academic Registrar review
    status: s.offering_semester === 'Y1S1' ? 'approved' : 'pending',
    previous_score: s.previous_score ?? null,
    previous_grade: s.previous_grade ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('course_unit_registrations')
    .upsert(records, { onConflict: 'school_id,student_id,course_unit_code,academic_year,offering_semester' });

  if (error) throw error;
}
