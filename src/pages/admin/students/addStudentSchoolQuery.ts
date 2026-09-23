import { supabase } from '@/lib/supabase';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';

export type AddStudentFeeStructure = {
  feeByClass: Record<string, number>;
  boardingByClass: Record<string, number>;
  admissionFee: number;
};

export type AddStudentSchoolData = {
  schoolId: string | null;
  schoolType: string | null;
  feeStructure: AddStudentFeeStructure;
};

export function addStudentSchoolQueryKey(userId: string) {
  return ['admin', 'add-student', 'school', userId] as const;
}

export async function fetchAddStudentSchoolContext(userId: string): Promise<AddStudentSchoolData> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) {
    return {
      schoolId: null,
      schoolType: null,
      feeStructure: { feeByClass: {}, boardingByClass: {}, admissionFee: 0 },
    };
  }

  const [schoolRes, feeRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase.from('school_fee_structure').select('class_name, tuition_amount, boarding_tuition_amount').eq('school_id', u.school_id),
  ]);
  const schoolType = schoolRes.data?.type || null;
  const feeByClass: Record<string, number> = {};
  const boardingByClass: Record<string, number> = {};
  let admissionFee = 0;
  (feeRes.data || []).forEach((row: { class_name: string; tuition_amount?: number; boarding_tuition_amount?: number }) => {
    if (row.class_name === 'ADMISSION') {
      admissionFee = Number(row.tuition_amount || 0) || 0;
    } else if (row.class_name) {
      feeByClass[row.class_name] = Number(row.tuition_amount || 0) || 0;
      boardingByClass[row.class_name] = Number(row.boarding_tuition_amount || 0) || 0;
    }
  });
  return {
    schoolId: u.school_id,
    schoolType,
    feeStructure: { feeByClass, boardingByClass, admissionFee },
  };
}

export const addStudentSchoolStaleOptions = {
  staleTime: ADMIN_STALE_TIME_MS,
  gcTime: ADMIN_GC_TIME_MS,
} as const;
