import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { resolveCurrentSchoolTerm, type SchoolTermBrief } from './adminFinanceTerm';

/** Shared query key — all pages that call this hook share the same cached result. */
export const CURRENT_TERM_QUERY_KEY = (schoolId: string) =>
  ['currentTerm', schoolId] as const;

/**
 * React Query wrapper around resolveCurrentSchoolTerm.
 * Returns the cached result immediately on subsequent calls — no "Loading current term…"
 * flash on every page visit. Refetches in the background every 5 minutes.
 */
export function useCurrentTerm(schoolId: string | null | undefined): {
  currentTerm: SchoolTermBrief | null | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: CURRENT_TERM_QUERY_KEY(schoolId ?? ''),
    queryFn: () => resolveCurrentSchoolTerm(supabase, schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,   // terms don't change mid-session
    gcTime: 30 * 60 * 1000,     // keep in memory 30 min after unmount
    placeholderData: (prev) => prev,
  });

  return { currentTerm: data, isLoading: isLoading && !data };
}
