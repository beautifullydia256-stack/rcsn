// Type definitions for Identity Module

export interface Student {
  student_id: string;
  name: string;
  admission_number: string;
  current_class: string;
  date_of_birth: string;
  gender: string;
  status: "active" | "inactive";
  profile_picture_url?: string;
  school_id: string;
  created_at: string;
}

export interface School {
  school_id: string;
  name: string;
  type: "Nursery/Primary" | "Secondary";
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IDCardData {
  student: Student;
  school: School;
  cardId: string;
  dateOfBirth: string;
  expiryDate: string;
  verificationUrl: string;
}

export interface VerificationResult {
  isValid: boolean;
  student?: Student & {
    schools?: {
      name: string;
      logo_url?: string;
    };
  };
  error?: string;
  verifiedAt: string;
}
