import { queryClient } from '@/lib/queryClient';
import { ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { workforceQueryKeys } from './workforceQueryKeys';
import {
  fetchLeavePageData,
  fetchRecruitmentPageData,
  fetchOnboardingPageData,
  fetchPerformancePageData,
  fetchPayrollPageData,
} from './workforceApi';

function workforcePrefetchPromises(userId: string) {
  const opts = { staleTime: ADMIN_STALE_TIME_MS } as const;
  return [
    queryClient.prefetchQuery({
      queryKey: workforceQueryKeys.leave(userId),
      queryFn: () => fetchLeavePageData(userId),
      ...opts,
    }),
    queryClient.prefetchQuery({
      queryKey: workforceQueryKeys.recruitment(userId),
      queryFn: () => fetchRecruitmentPageData(userId),
      ...opts,
    }),
    queryClient.prefetchQuery({
      queryKey: workforceQueryKeys.onboarding(userId),
      queryFn: () => fetchOnboardingPageData(userId),
      ...opts,
    }),
    queryClient.prefetchQuery({
      queryKey: workforceQueryKeys.performance(userId),
      queryFn: () => fetchPerformancePageData(userId),
      ...opts,
    }),
    queryClient.prefetchQuery({
      queryKey: workforceQueryKeys.payroll(userId),
      queryFn: () => fetchPayrollPageData(userId),
      ...opts,
    }),
  ];
}

/** Warm React Query for all Workforce routes (sidebar hover; pairs with post-login `prefetchWorkforceAllAwait`). */
export function prefetchWorkforceAll(userId: string): void {
  if (!userId) return;
  void Promise.allSettled(workforcePrefetchPromises(userId));
}

/** Awaited variant for `prefetchAdminSidebarRoutes` so failures surface in its allSettled log. */
export async function prefetchWorkforceAllAwait(userId: string): Promise<void> {
  if (!userId) return;
  const results = await Promise.allSettled(workforcePrefetchPromises(userId));
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('[prefetchWorkforceAll]', r.reason);
    }
  }
}
