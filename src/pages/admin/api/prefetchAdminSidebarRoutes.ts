/**
 * Warms React Query cache for admin sidebar routes (same keys as each page's useQuery)
 * so navigation feels instant after login prefetch.
 */
import { queryClient } from '@/lib/queryClient';

export async function prefetchAdminSidebarRoutes(userId: string, schoolId: string): Promise<void> {
  if (!userId || !schoolId) return;

  const jobs: Promise<unknown>[] = [
    import('@/pages/admin/accounts/AccountsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'accounts', userId], await m.fetchAccounts(userId));
    }),
    import('@/pages/admin/permissions/PermissionsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'permissions-users', userId], await m.fetchSchoolUsers(userId));
    }),
    import('@/pages/admin/notifications/NotificationsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'notifications', userId], await m.fetchNotificationsPage(userId));
      queryClient.setQueryData(['admin', 'notifications', 'inbox', userId], await m.fetchInAppNotificationsInbox(userId));
    }),
    import('@/pages/admin/exam-sets/ExamSetsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'exam-sets', userId], await m.fetchExamSets(userId));
    }),
    import('@/pages/admin/settings/ClassesPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'settings', 'classes', userId], await m.fetchClassesPage(userId));
    }),
    import('@/pages/admin/Dashboard').then(async (m) => {
      queryClient.setQueryData(['dashboard', 'admin', 'auth', userId], await m.fetchDashboardAuth(userId));
    }),
    import('@/pages/admin/components/RecentPaymentsNotifications').then(async (m) => {
      queryClient.setQueryData(['dashboard', 'admin', 'paymentsNotifications', userId, schoolId], await m.fetchPaymentsNotifications(userId, schoolId));
    }),
  ];

  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('[prefetchAdminSidebarRoutes] slice failed', r.reason);
    }
  }
}
