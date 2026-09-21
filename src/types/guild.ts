export type GuildTenureStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type GuildTransactionType = 'INFLOW_ALLOCATION' | 'EXPENDITURE';
export type GuildTransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GrievanceCategory = 'Academics' | 'Hostel' | 'Sanitation' | 'Security' | 'Dispute' | 'Welfare' | 'Other';
export type GrievanceStatus = 'SUBMITTED' | 'IN_REVIEW' | 'ESCALATED_TO_ADMIN' | 'RESOLVED' | 'CLOSED';
export type AnnouncementPriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type WelfareSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WelfareStatus = 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED';
export type ElectionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CERTIFIED';

export interface GuildPortfolioPermissions {
  is_executive?: boolean;
  manage_grievances?: boolean;
  manage_finances?: boolean;
  approve_requisitions?: boolean;
  broadcast?: boolean;
  view_welfare?: boolean;
  log_welfare_incident?: boolean;
  manage_events?: boolean;
  [key: string]: boolean | undefined;
}

export interface GuildPortfolio {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  permissions: GuildPortfolioPermissions;
  is_default: boolean;
  created_at: string;
}

export interface GuildTenure {
  id: string;
  school_id: string;
  student_id: string;
  portfolio_id: string;
  academic_year: string;
  term_start: string;
  term_end: string;
  status: GuildTenureStatus;
  created_at: string;
  portfolio?: GuildPortfolio;
  student?: {
    student_id: string;
    name: string;
    admission_number?: string;
    current_class?: string;
  };
}

export interface GuildTransaction {
  id: string;
  school_id: string;
  tenure_id: string;
  amount: number;
  type: GuildTransactionType;
  category: string;
  description: string;
  receipt_url: string | null;
  status: GuildTransactionStatus;
  synced_with_school_finance: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  tenure?: GuildTenure;
}

export interface StudentGrievance {
  id: string;
  school_id: string;
  student_id: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  is_anonymous: boolean;
  assigned_portfolio_id: string | null;
  status: GrievanceStatus;
  resolution_notes: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  assigned_portfolio?: GuildPortfolio;
  student?: {
    student_id: string;
    name: string;
    current_class?: string;
    admission_number?: string;
  };
}

export interface GuildAnnouncement {
  id: string;
  school_id: string;
  tenure_id: string;
  title: string;
  content: string;
  target_scope: 'ALL' | 'FACULTY' | 'CLASS' | 'HOSTEL';
  target_value: string | null;
  priority: AnnouncementPriority;
  created_at: string;
  tenure?: GuildTenure;
}

export interface GuildWelfareReport {
  id: string;
  school_id: string;
  tenure_id: string | null;
  facility_type: string;
  title: string;
  severity: WelfareSeverity;
  status: WelfareStatus;
  description: string;
  action_taken: string | null;
  created_at: string;
}

export interface Election {
  id: string;
  school_id: string;
  academic_year: string;
  title: string;
  description: string | null;
  voting_starts_at: string;
  voting_ends_at: string;
  status: ElectionStatus;
  certified_by: string | null;
  certified_at: string | null;
  created_at: string;
  candidates?: ElectionCandidate[];
}

export interface ElectionCandidate {
  id: string;
  school_id: string;
  election_id: string;
  portfolio_id: string;
  student_id: string;
  manifesto_summary: string | null;
  photo_url: string | null;
  gpa_or_grade_standing: string | null;
  disciplinary_clearance: boolean;
  vote_count: number;
  is_winner: boolean;
  created_at: string;
  portfolio?: GuildPortfolio;
  student?: {
    student_id: string;
    name: string;
    current_class?: string;
    admission_number?: string;
  };
}

export interface ElectionVoterLog {
  id: string;
  school_id: string;
  election_id: string;
  student_id: string;
  has_voted: boolean;
  voted_at: string;
}
