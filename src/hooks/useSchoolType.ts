import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type SchoolTypeValue = 'Nursery/Primary' | 'Secondary';

export function useSchoolType() {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const schoolId =
    schoolIdFromStore ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  return useQuery({
    queryKey: ['school', 'type', schoolId ?? ''],
    queryFn: async (): Promise<SchoolTypeValue | null> => {
      if (!schoolId) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('type')
        .eq('school_id', schoolId)
        .maybeSingle();
      if (error) throw error;
      const t = (data as { type?: string } | null)?.type;
      if (t === 'Nursery/Primary' || t === 'Secondary') return t;
      return null;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
