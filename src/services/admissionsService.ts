import { supabase } from '@/lib/supabase';
import {
  sendApplicationSubmittedEmail,
  sendInterviewScheduledEmail,
  sendAdmissionOfferEmail,
  sendApplicationStatusEmail,
  sendApplicationRejectedEmail,
} from './admissionsEmailService';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_passed'
  | 'interview_failed'
  | 'waitlisted'
  | 'admitted'
  | 'offer_accepted'
  | 'enrolled'
  | 'rejected';

export interface SubjectGrade {
  subject: string;
  grade: string;
}

export interface AdmissionApplicationRecord {
  id: string;
  school_id: string;
  application_number: string;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  gender: 'Female' | 'Male' | 'Other';
  date_of_birth: string;
  phone: string;
  email?: string | null;
  nin_or_id?: string | null;
  nationality?: string | null;
  district?: string | null;
  city?: string | null;
  programs: string[];
  admitted_program?: string | null;
  intake: string;
  previous_school?: string | null;
  index_number?: string | null;
  qualifications_summary?: string | null;
  subject_grades: SubjectGrade[];
  attached_document_url?: string | null;
  attached_document_name?: string | null;
  attached_document_size?: string | null;
  attached_document_data?: string | null; // local preview base64
  passport_photo_url?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relationship?: string | null;
  application_fee: number;
  payment_method: string;
  payment_reference: string;
  payment_status: 'Pending' | 'Verified' | 'Waived';
  status: ApplicationStatus;
  rejection_reason?: string | null;
  interview_date?: string | null;
  interview_time?: string | null;
  interview_venue?: string | null;
  interview_panel?: string | null;
  interview_score?: number | null;
  interview_notes?: string | null;
  admission_letter_number?: string | null;
  admission_issued_at?: string | null;
  offer_accepted_at?: string | null;
  residential_preference: 'Resident' | 'Non-Resident';
  enrolled_student_id?: string | null;
  enrolled_at?: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'rcsn_admissions_db_v2';
const DEFAULT_SCHOOL_ID = 'e1b10000-0000-4000-a000-000000000001';

/** Helper to read offline fallback cache */
function getLocalApplications(): AdmissionApplicationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Helper to write offline fallback cache */
function saveLocalApplications(apps: AdmissionApplicationRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.warn('[AdmissionsService] LocalStorage save warning:', err);
  }
}

/**
 * Fetch applications with optional filtering by status, program, or search term
 */
let remoteAdmissionsTableAvailable: boolean | null = null;

export async function fetchApplications(options?: {
  status?: string;
  program?: string;
  searchQuery?: string;
}): Promise<AdmissionApplicationRecord[]> {
  try {
    if (remoteAdmissionsTableAvailable === false) {
      let local = getLocalApplications();
      if (options?.status && options.status !== 'all') {
        local = local.filter((a) => a.status === options.status);
      }
      if (options?.program && options.program !== 'all') {
        local = local.filter((a) => a.programs?.includes(options.program as string));
      }
      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        local = local.filter(
          (a) =>
            a.full_name?.toLowerCase().includes(q) ||
            a.application_number?.toLowerCase().includes(q) ||
            a.phone?.includes(q)
        );
      }
      return local;
    }

    let query = supabase
      .from('admission_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.program && options.program !== 'all') {
      query = query.contains('programs', [options.program]);
    }

    const { data, error } = await query;
    if (error) {
      const isMissing =
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        (error as { status?: number }).status === 404;
      if (isMissing) {
        remoteAdmissionsTableAvailable = false;
      }
    } else {
      remoteAdmissionsTableAvailable = true;
      // Merge with any local cache that may not have synced
      const localApps = getLocalApplications();
      const combined = [...(data || [])];
      for (const localApp of localApps) {
        if (!combined.some((a) => a.application_number === localApp.application_number)) {
          combined.push(localApp);
        }
      }
      return combined;
    }
  } catch {
    // Silent fallback to local cache
  }

  // Fallback to local cache
  let local = getLocalApplications();
  if (options?.status && options.status !== 'all') {
    local = local.filter((a) => a.status === options.status);
  }
  if (options?.program && options.program !== 'all') {
    local = local.filter((a) => a.programs?.includes(options.program as string));
  }
  if (options?.searchQuery) {
    const q = options.searchQuery.toLowerCase();
    local = local.filter(
      (a) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.application_number?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
    );
  }
  return local;
}

/**
 * Fetch a single application by Application Number or Phone (for Public Tracking)
 */
export async function trackApplication(
  identifier: string
): Promise<AdmissionApplicationRecord | null> {
  const cleanId = identifier.trim();
  if (!cleanId) return null;

  if (remoteAdmissionsTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .or(`application_number.ilike.%${cleanId}%,phone.ilike.%${cleanId}%,email.ilike.%${cleanId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        const isMissing =
          error.code === '42P01' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          (error as { status?: number }).status === 404;
        if (isMissing) {
          remoteAdmissionsTableAvailable = false;
        }
      } else if (data) {
        return data as AdmissionApplicationRecord;
      }
    } catch {
      // ignore
    }
  }

  // Fallback to local storage lookup
  const local = getLocalApplications();
  const found = local.find(
    (a) =>
      a.application_number.toLowerCase().includes(cleanId.toLowerCase()) ||
      a.phone.replace(/[^0-9]/g, '').includes(cleanId.replace(/[^0-9]/g, '')) ||
      (a.email && a.email.toLowerCase().includes(cleanId.toLowerCase()))
  );

  return found || null;
}

/**
 * Insert a brand new application into Supabase with local fallback
 */
export async function createApplication(
  data: Omit<AdmissionApplicationRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; application: AdmissionApplicationRecord; message: string }> {
  const now = new Date().toISOString();
  const id = `adm-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newRecord: AdmissionApplicationRecord = {
    ...data,
    id,
    school_id: data.school_id || DEFAULT_SCHOOL_ID,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data: inserted, error } = await supabase
      .from('admission_applications')
      .insert([
        {
          school_id: newRecord.school_id,
          application_number: newRecord.application_number,
          full_name: newRecord.full_name,
          first_name: newRecord.first_name,
          middle_name: newRecord.middle_name,
          last_name: newRecord.last_name,
          gender: newRecord.gender,
          date_of_birth: newRecord.date_of_birth,
          phone: newRecord.phone,
          email: newRecord.email,
          nin_or_id: newRecord.nin_or_id,
          nationality: newRecord.nationality || 'Ugandan',
          district: newRecord.district,
          city: newRecord.city,
          programs: newRecord.programs,
          admitted_program: newRecord.admitted_program,
          intake: newRecord.intake,
          previous_school: newRecord.previous_school,
          index_number: newRecord.index_number,
          qualifications_summary: newRecord.qualifications_summary,
          subject_grades: newRecord.subject_grades,
          attached_document_url: newRecord.attached_document_url,
          attached_document_name: newRecord.attached_document_name,
          attached_document_size: newRecord.attached_document_size,
          passport_photo_url: newRecord.passport_photo_url || null,
          guardian_name: newRecord.guardian_name,
          guardian_phone: newRecord.guardian_phone,
          guardian_relationship: newRecord.guardian_relationship,
          application_fee: newRecord.application_fee,
          payment_method: newRecord.payment_method,
          payment_reference: newRecord.payment_reference,
          payment_status: newRecord.payment_status,
          status: newRecord.status,
          residential_preference: newRecord.residential_preference,
        },
      ])
      .select('*')
      .maybeSingle();

    if (!error && inserted) {
      // Also cache locally
      const local = getLocalApplications();
      local.unshift(inserted);
      saveLocalApplications(local);

      // Trigger instant confirmation email
      if (inserted.email) {
        sendApplicationSubmittedEmail(inserted).catch((err) =>
          console.warn('[AdmissionsService] Email dispatch note:', err)
        );
      }

      return { success: true, application: inserted, message: 'Application submitted successfully.' };
    }
  } catch (err) {
    console.warn('[AdmissionsService] Supabase insert error, saving locally:', err);
  }

  // Local fallback save
  const local = getLocalApplications();
  local.unshift(newRecord);
  saveLocalApplications(local);

  // Trigger instant confirmation email on local fallback
  if (newRecord.email) {
    sendApplicationSubmittedEmail(newRecord).catch((err) =>
      console.warn('[AdmissionsService] Email dispatch note (fallback):', err)
    );
  }

  return { success: true, application: newRecord, message: 'Application submitted successfully.' };
}

/**
 * Update application lifecycle details (status, interview, notes, etc.)
 */
export async function updateApplication(
  id: string,
  updates: Partial<AdmissionApplicationRecord>
): Promise<{ success: boolean; updated?: AdmissionApplicationRecord }> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('admission_applications')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const local = getLocalApplications();
      const idx = local.findIndex((a) => a.id === id);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...data };
        saveLocalApplications(local);
      }
      return { success: true, updated: data };
    }
  } catch (err) {
    console.warn('[AdmissionsService] Update error, updating local:', err);
  }

  // Update local storage
  const local = getLocalApplications();
  const idx = local.findIndex((a) => a.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...payload };
    saveLocalApplications(local);
    return { success: true, updated: local[idx] };
  }

  return { success: false };
}

/**
 * Schedule Oral & Practical Interview
 */
export async function scheduleInterview(
  id: string,
  params: {
    interviewDate: string;
    interviewTime: string;
    interviewVenue: string;
    interviewPanel?: string;
  }
) {
  const res = await updateApplication(id, {
    status: 'interview_scheduled',
    interview_date: params.interviewDate,
    interview_time: params.interviewTime,
    interview_venue: params.interviewVenue,
    interview_panel: params.interviewPanel,
  });

  if (res.success && res.updated && res.updated.email) {
    sendInterviewScheduledEmail(res.updated).catch((err) =>
      console.warn('[AdmissionsService] Interview email dispatch note:', err)
    );
  }

  return res;
}

/**
 * Record Interview Results & Outcome
 */
export async function recordInterviewResults(
  id: string,
  params: {
    score: number;
    decision: 'passed' | 'waitlisted' | 'failed';
    notes?: string;
  }
) {
  const status: ApplicationStatus =
    params.decision === 'passed'
      ? 'interview_passed'
      : params.decision === 'waitlisted'
      ? 'waitlisted'
      : 'interview_failed';

  const res = await updateApplication(id, {
    interview_score: params.score,
    status,
    interview_notes: params.notes,
  });

  if (res.success && res.updated && res.updated.email) {
    if (params.decision === 'waitlisted') {
      sendApplicationStatusEmail(
        res.updated,
        'Your admission interview assessment has been concluded, and you have been placed on the admissions merit waitlist. Our admissions board will communicate as places become available.'
      ).catch((err) => console.warn('[AdmissionsService] Waitlist email dispatch note:', err));
    }
  }

  return res;
}

/**
 * Batch schedule interviews for multiple candidates and dispatch invitation emails
 */
export async function batchScheduleInterviews(
  applicationIds: string[],
  params: {
    interviewDate: string;
    interviewTime: string;
    interviewVenue: string;
    interviewPanel?: string;
  }
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const id of applicationIds) {
    try {
      const res = await scheduleInterview(id, params);
      if (res.success) successCount++;
      else failureCount++;
    } catch {
      failureCount++;
    }
  }

  return { successCount, failureCount };
}

/**
 * Evaluate and score a candidate with configurable pass threshold & automatic admission
 */
export async function evaluateInterviewCandidate(
  app: AdmissionApplicationRecord,
  params: {
    score: number;
    passThreshold: number;
    notes?: string;
    autoAdmitOnPass?: boolean;
  }
): Promise<{ success: boolean; verdict: 'passed' | 'failed'; updated?: AdmissionApplicationRecord }> {
  const isPass = params.score >= params.passThreshold;

  if (isPass) {
    if (params.autoAdmitOnPass !== false) {
      const program = app.admitted_program || app.programs[0] || 'Certificate in Nursing';
      const res = await issueAdmissionOffer(app.id, {
        admittedProgram: program,
        residentialPreference: app.residential_preference || 'Resident',
      });
      await updateApplication(app.id, {
        interview_score: params.score,
        interview_notes: params.notes,
      });
      return { success: res.success, verdict: 'passed', updated: res.updated };
    } else {
      const res = await recordInterviewResults(app.id, {
        score: params.score,
        decision: 'passed',
        notes: params.notes,
      });
      return { success: res.success, verdict: 'passed', updated: res.updated };
    }
  } else {
    const reason =
      params.notes ||
      `Interview assessment score of ${params.score}% was below the required institutional passing threshold (${params.passThreshold}%).`;
    const res = await rejectApplication(app.id, reason);
    await updateApplication(app.id, {
      interview_score: params.score,
      interview_notes: params.notes,
    });
    return { success: res.success, verdict: 'failed', updated: res.updated };
  }
}

/**
 * Issue Official Provisional Admission Offer
 */
export async function issueAdmissionOffer(
  id: string,
  params: {
    admittedProgram: string;
    letterNumber?: string;
    residentialPreference?: 'Resident' | 'Non-Resident';
  }
) {
  const generatedLetterNo =
    params.letterNumber ||
    `RCSN/ADM/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

  const res = await updateApplication(id, {
    status: 'admitted',
    admitted_program: params.admittedProgram,
    admission_letter_number: generatedLetterNo,
    admission_issued_at: new Date().toISOString(),
    residential_preference: params.residentialPreference || 'Resident',
  });

  if (res.success && res.updated && res.updated.email) {
    sendAdmissionOfferEmail(res.updated).catch((err) =>
      console.warn('[AdmissionsService] Admission offer email dispatch note:', err)
    );
  }

  return res;
}

/**
 * Reject an application with optional reason and dispatch regret email
 */
export async function rejectApplication(
  id: string,
  reason?: string
) {
  const res = await updateApplication(id, {
    status: 'rejected',
    rejection_reason: reason,
  });

  if (res.success && res.updated && res.updated.email) {
    sendApplicationRejectedEmail(res.updated, reason).catch((err) =>
      console.warn('[AdmissionsService] Rejection email dispatch note:', err)
    );
  }

  return res;
}

/**
 * Public candidate accepts their admission offer
 */
export async function acceptAdmissionOffer(id: string) {
  return updateApplication(id, {
    status: 'offer_accepted',
    offer_accepted_at: new Date().toISOString(),
  });
}

/**
 * 1-Click Fast Student Matriculation:
 * Inserts the admitted candidate into public.students table with assigned residency and fees,
 * then marks the application record as enrolled.
 */
export async function matriculateApplicantToStudent(
  application: AdmissionApplicationRecord,
  params: {
    registrationNumber: string;
    boardingType: 'Resident' | 'Non-Resident';
    currentClass: string;
    stream?: string;
    medicalCondition?: string;
    bloodGroup?: string;
    allergies?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    initialTuitionPaid?: number;
    schoolId?: string;
  }
): Promise<{ success: boolean; studentId?: string; error?: string }> {
  try {
    const schoolId = params.schoolId || application.school_id || DEFAULT_SCHOOL_ID;
    const nameParts = (application.full_name || '').trim().split(/\s+/);
    const firstName = application.first_name || nameParts[0] || '';
    const lastName = application.last_name || nameParts[nameParts.length - 1] || '';
    const middleName =
      application.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null);

    const studentPayload: Record<string, unknown> = {
      school_id: schoolId,
      name: application.full_name,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      gender: application.gender,
      date_of_birth: application.date_of_birth,
      student_phone: application.phone,
      student_email: application.email || null,
      admission_number: params.registrationNumber.trim(),
      admission_date: new Date().toISOString().split('T')[0],
      current_class: params.currentClass,
      stream: params.stream || 'Stream A',
      status: 'active',
      boarding_type: params.boardingType,
      previous_school: application.previous_school || null,
      guardian_name: application.guardian_name || null,
      guardian_phone: application.guardian_phone || null,
      guardian_relationship: application.guardian_relationship || 'Parent / Guardian',
      medical_condition: params.medicalCondition || null,
      blood_group: params.bloodGroup || null,
      allergies: params.allergies || null,
      emergency_contact_name: params.emergencyContactName || application.guardian_name || null,
      emergency_contact_phone: params.emergencyContactPhone || application.guardian_phone || null,
      nationality: application.nationality || 'Ugandan',
      district: application.district || null,
      city: application.city || null,
      photo_url: application.passport_photo_url || null,
      profile_photo_url: application.passport_photo_url || null,
      enrollment_status: 'Enrolled',
      payment_status: params.initialTuitionPaid && params.initialTuitionPaid > 0 ? 'Partially Paid' : 'Pending',
    };

    const { data: insertedStudent, error: insertError } = await supabase
      .from('students')
      .insert(studentPayload)
      .select('student_id, admission_number')
      .single();

    if (insertError) {
      console.error('[AdmissionsService] Student insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    const studentId = insertedStudent?.student_id;

    // Link application to newly created active student
    await updateApplication(application.id, {
      status: 'enrolled',
      enrolled_student_id: studentId,
      enrolled_at: new Date().toISOString(),
      residential_preference: params.boardingType,
    });

    // Automatically generate first term student tuition & requirements invoice in student_invoices ledger
    try {
      const isResident = params.boardingType === 'Resident';
      const isDiploma = (application.admitted_program || '').toLowerCase().includes('diploma');
      const baseFee = isDiploma ? (isResident ? 2985000 : 2385000) : (isResident ? 2785000 : 2185000);
      const paid = params.initialTuitionPaid || 0;
      const balance = Math.max(0, baseFee - paid);
      const invNum = `INV-ADM-${new Date().getFullYear()}-${application.application_number.slice(-4)}`;

      await supabase.from('student_invoices').insert({
        school_id: schoolId,
        student_id: studentId,
        invoice_number: invNum,
        invoice_label: `${application.admitted_program || 'Nursing'} – Semester 1 Tuition & Requirements`,
        total_amount: baseFee,
        amount_paid: paid,
        balance: balance,
        status: paid >= baseFee ? 'paid' : paid > 0 ? 'partial' : 'pending',
        is_supplementary: false,
      });
    } catch (invErr) {
      console.warn('[AdmissionsService] Student invoice creation note:', invErr);
    }

    return { success: true, studentId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown matriculation error';
    console.error('[AdmissionsService] Matriculation exception:', err);
    return { success: false, error: msg };
  }
}

/**
 * Update candidate credentials (passport photo or attached UNEB documents)
 */
export async function updateApplicationCredentials(
  id: string,
  credentials: {
    passport_photo_url?: string | null;
    attached_document_url?: string | null;
    attached_document_name?: string | null;
    attached_document_size?: string | null;
    attached_document_data?: string | null;
  }
) {
  return updateApplication(id, credentials);
}

