import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type SchoolTypeValue =
  | 'Nursery/Primary'
  | 'Secondary'
  | 'Tertiary / Nursing & Midwifery'
  | 'Tertiary'
  | 'Health Training / Nursing'
  | string;

export function isTertiarySchool(type?: string | null): boolean {
  if (!type) return false;
  const s = type.toLowerCase();
  return (
    s.includes('tertiary') ||
    s.includes('nursing') ||
    s.includes('midwifery') ||
    s.includes('health training') ||
    s.includes('college') ||
    s.includes('institute') ||
    s.includes('polytechnic')
  );
}

export function isSecondarySchool(type?: string | null): boolean {
  if (!type) return false;
  if (isTertiarySchool(type)) return false;
  const s = type.toLowerCase();
  return s.includes('secondary') || s.includes('high') || s.includes('o-level') || s.includes('a-level');
}

export function isPrimarySchool(type?: string | null): boolean {
  if (!type) return false;
  if (isTertiarySchool(type) || isSecondarySchool(type)) return false;
  const s = type.toLowerCase();
  return s.includes('primary') || s.includes('nursery') || s.includes('kindergarten') || s.includes('pre-primary');
}

export function useSchoolType() {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const schoolId =
    schoolIdFromStore ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const query = useQuery({
    queryKey: ['school', 'type', schoolId ?? ''],
    queryFn: async (): Promise<string | null> => {
      if (!schoolId) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('type')
        .eq('school_id', schoolId)
        .maybeSingle();
      if (error) throw error;
      const t = (data as { type?: string } | null)?.type;
      return t ?? null;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  const rawType = query.data ?? 'Nursing & Midwifery Institution';
  const isTertiary = true;
  const isSecondary = false;
  const isPrimary = false;

  return {
    ...query,
    schoolType: rawType,
    isTertiary,
    isSecondary,
    isPrimary,
  };
}
