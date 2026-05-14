/**
 * Visual Template Designer — useDesignerPreviewData
 *
 * Provides realistic preview data for the canvas:
 *   - School info: fetched live from the database (name, logo, motto …)
 *   - Student / academic / payment data: sample values that look real
 *
 * This lets teachers editing a template see the actual school branding and
 * realistic report-card data while they position and style every component.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  fetchAdminSettingsSchoolRow,
  adminSettingsSchoolRowQueryKey,
  ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
} from '@/lib/adminSettingsSchoolContext';

// ─── Shape ────────────────────────────────────────────────────────────────────

export interface DesignerPreviewData {
  school: {
    name: string;
    logo_url: string | null;
    motto: string;
    address: string;
    contact: string;
    email: string;
    pobox: string;
  };
  student: {
    name: string;
    photo_url: string | null;
    class: string;
    stream: string;
    number: string;
    attendance: string;
    gender: string;
    dob: string;
    guardian: string;
    boardingType: string;
  };
  academic: {
    subjects: Array<{ name: string; score: number; max: number; grade: string; remarks: string }>;
    aggregate: number;
    division: string;
    position: string;
    percentage: string;
    nextTermDate: string;
  };
  term: { term: string; year: string };
  teacher: { remarks: string; name: string };
  headTeacher: { comments: string; name: string };
  payment: { totalFees: number; paid: number; balance: number; currency: string };
  requirements: Array<{ name: string; cost: number; status: string }>;
}

// ─── Sample fallback (shown while loading or when no school is found) ─────────

const SAMPLE: DesignerPreviewData = {
  school: {
    name: "St. Mary's College",
    logo_url: null,
    motto: 'Excellence in Education',
    address: 'P.O. Box 1234, Kampala, Uganda',
    contact: '+256 700 123 456',
    email: 'info@school.ac.ug',
    pobox: 'P.O. Box 1234, Kampala',
  },
  student: {
    name: 'Nakamya Grace',
    photo_url: null,
    class: 'Senior 2',
    stream: 'A',
    number: 'S2024/0042',
    attendance: '48 / 52 days',
    gender: 'Female',
    dob: '12 / Mar / 2010',
    guardian: 'Nakamya Agnes (Mother)',
    boardingType: 'Day Scholar',
  },
  academic: {
    subjects: [
      { name: 'Mathematics',      score: 85, max: 100, grade: 'D1', remarks: 'Excellent'  },
      { name: 'English Language', score: 72, max: 100, grade: 'D2', remarks: 'Very Good'  },
      { name: 'Physics',          score: 68, max: 100, grade: 'C3', remarks: 'Good'        },
      { name: 'Chemistry',        score: 74, max: 100, grade: 'C4', remarks: 'Good'        },
      { name: 'Biology',          score: 60, max: 100, grade: 'C5', remarks: 'Credit'      },
      { name: 'History',          score: 55, max: 100, grade: 'C6', remarks: 'Credit'      },
    ],
    aggregate: 12,
    division: 'Division II',
    position: '4th out of 38',
    percentage: '69%',
    nextTermDate: '10th September 2025',
  },
  term: { term: 'Term 2', year: '2025' },
  teacher: {
    remarks:
      'Grace has demonstrated commendable academic progress this term. She should continue to work hard and focus more on her weak subjects.',
    name: 'Mr. Ssekandi Joseph',
  },
  headTeacher: {
    comments:
      'A well-rounded student with good character. Keep up the excellent work and strive for greater heights next term.',
    name: 'Mrs. Nalubega Catherine',
  },
  payment: { totalFees: 450_000, paid: 300_000, balance: 150_000, currency: 'UGX' },
  requirements: [
    { name: 'Exercise Books (10)',  cost: 15_000,  status: 'Pending'  },
    { name: 'School Uniform',       cost: 45_000,  status: 'Paid'     },
    { name: 'PE Kit',               cost: 20_000,  status: 'Pending'  },
  ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDesignerPreviewData(): DesignerPreviewData {
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data: schoolRow } = useQuery({
    queryKey: adminSettingsSchoolRowQueryKey(schoolId ?? ''),
    queryFn: () => fetchAdminSettingsSchoolRow(schoolId!),
    enabled: !!schoolId,
    staleTime: ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
  });

  return {
    ...SAMPLE,
    school: {
      ...SAMPLE.school,
      name: schoolRow?.name ?? SAMPLE.school.name,
      logo_url: schoolRow?.logo_url ?? null,
      motto: schoolRow?.subtitle ?? SAMPLE.school.motto,
    },
  };
}
