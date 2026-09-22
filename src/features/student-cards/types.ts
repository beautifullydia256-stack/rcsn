export type CardType = 'entrance' | 'examination' | 'meal' | 'library' | 'general';

export type CardStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export interface StudentServiceCard {
  id: string;
  card_number: string;
  school_id: string;
  student_id: string;
  card_type: CardType;
  title: string;
  academic_year: number;
  academic_term: number;
  exam_set_id?: string | null;
  min_fee_percent_required: number;
  fee_percentage_at_issuance: number;
  issue_date: string;
  expiry_date: string;
  status: CardStatus;
  qr_payload: string;
  issued_by?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  // Joined student data
  student?: {
    name: string;
    admission_number?: string | null;
    current_class?: string | null;
    stream?: string | null;
    photo_url?: string | null;
    payment_status?: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
  };
}

export interface StudentEligibilityItem {
  student_id: string;
  name: string;
  admission_number?: string | null;
  current_class?: string | null;
  stream?: string | null;
  photo_url?: string | null;
  expected_fee: number;
  total_paid: number;
  fee_percentage: number;
  is_eligible: boolean;
  disqualification_reason?: string;
}

export interface BatchCardIssueParams {
  school_id: string;
  card_type: CardType;
  title: string;
  academic_term: number;
  academic_year: number;
  exam_set_id?: string | null;
  min_fee_percent_required: number;
  expiry_date: string; // ISO string
  notes?: string;
  class_filter?: string; // empty means all classes
}

export interface CardVerificationResult {
  found: boolean;
  valid: boolean;
  status: CardStatus | 'invalid';
  message: string;
  card?: {
    id: string;
    card_number: string;
    card_type: CardType;
    title: string;
    academic_year: number;
    academic_term: number;
    min_fee_percent_required: number;
    fee_percentage_at_issuance: number;
    issue_date: string;
    expiry_date: string;
    notes?: string | null;
  };
  student?: {
    student_id: string;
    name: string;
    admission_number?: string | null;
    current_class?: string | null;
    stream?: string | null;
    status?: string | null;
    payment_status?: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    photo_url?: string | null;
  };
  school?: {
    school_id: string;
    name: string;
    type?: string | null;
    badge_url?: string | null;
  };
  verified_at?: string;
}

export interface CardScanLog {
  id: string;
  card_id: string;
  school_id: string;
  scanned_by?: string | null;
  scanner_name?: string | null;
  scanner_role?: string | null;
  location?: string | null;
  scan_result: 'valid' | 'expired' | 'revoked' | 'denied' | 'invalid';
  notes?: string | null;
  scanned_at: string;
}
