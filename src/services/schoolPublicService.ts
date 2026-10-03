/**
 * School Public Service Layer for Rakai Community School of Nursing (RCSN)
 *
 * Designed with an isolated placeholder architecture:
 * Currently performs client-side validation and local persistence,
 * with structured hooks ready to immediately wire into live Supabase tables.
 */

export interface SubjectGrade {
  subject: string;
  grade: string;
}

export interface AdmissionApplication {
  id: string;
  fullName: string;
  gender: 'Female' | 'Male' | 'Other';
  dateOfBirth: string;
  phone: string;
  email?: string;
  ninOrId?: string;
  programs: string[];
  program?: string;
  intake: string;
  studyMode?: 'Boarding' | 'Day Scholar';
  previousSchool: string;
  indexNumber: string;
  qualificationsSummary: string;
  subjectGrades?: SubjectGrade[];
  attachedDocumentName?: string;
  attachedDocumentSize?: string;
  attachedDocumentData?: string;
  applicationFee?: number;
  paymentMethod?: string;
  paymentReference?: string;
  guardianName: string;
  guardianPhone: string;
  submittedAt: string;
  status: 'Pending Verification' | 'Reviewed' | 'Accepted';
}

export interface ContactInquiry {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submittedAt: string;
}

const STORAGE_KEYS = {
  APPLICATIONS: 'rcsn_admission_applications',
  INQUIRIES: 'rcsn_contact_inquiries',
};

/**
 * Submit an online admission application.
 * Currently saves to browser storage and logs structured payload.
 * When connecting to Supabase:
 * const { data, error } = await supabase.from('admission_applications').insert([app]);
 */
export async function submitAdmissionApplication(
  data: Omit<AdmissionApplication, 'id' | 'submittedAt' | 'status'>
): Promise<{ success: boolean; application: AdmissionApplication; message: string }> {
  // Simulate network latency (400ms) for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 400));

  const application: AdmissionApplication = {
    ...data,
    id: `RCSN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    submittedAt: new Date().toISOString(),
    status: 'Pending Verification',
  };

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    const existing: AdmissionApplication[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(application);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(existing));
  } catch (err) {
    console.warn('[RCSN Public Service] Could not write to localStorage:', err);
  }

  // Database integration log hook
  console.log('[RCSN Admission Application Received]:', application);

  return {
    success: true,
    application,
    message: 'Your application has been received successfully! Our admissions office will review your details.',
  };
}

/**
 * Submit a contact inquiry.
 */
export async function submitContactInquiry(
  data: Omit<ContactInquiry, 'id' | 'submittedAt'>
): Promise<{ success: boolean; inquiry: ContactInquiry; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const inquiry: ContactInquiry = {
    ...data,
    id: `INQ-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEYS.INQUIRIES);
    const existing: ContactInquiry[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(inquiry);
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(existing));
  } catch (err) {
    console.warn('[RCSN Public Service] Could not write to localStorage:', err);
  }

  console.log('[RCSN Contact Inquiry Received]:', inquiry);

  return {
    success: true,
    inquiry,
    message: 'Thank you for reaching out! An admissions counselor will respond to your inquiry shortly.',
  };
}

export function getStoredApplications(): AdmissionApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
