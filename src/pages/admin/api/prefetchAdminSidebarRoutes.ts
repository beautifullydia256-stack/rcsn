/**
 * Warms React Query cache for admin sidebar routes (same keys as each page's useQuery)
 * so navigation feels instant after login prefetch.
 */
import { queryClient } from '@/lib/queryClient';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { fetchAdminDesignDashboardKpis } from '@/pages/admin/api/fetchAdminDesignDashboardKpis';

export async function prefetchAdminSidebarRoutes(userId: string, schoolId: string): Promise<void> {
  if (!userId || !schoolId) return;
  const today = new Date().toISOString().slice(0, 10);

  const jobs: Promise<unknown>[] = [
    import('@/pages/admin/accounts/AccountsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'accounts', userId], await m.fetchAccounts(userId));
    }),
    import('@/pages/admin/staff/StaffPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'school-roster', schoolId], await m.fetchSchoolRoster(schoolId));
      queryClient.setQueryData(['admin', 'other-staff', schoolId], await m.fetchOtherStaff(schoolId));
    }),
    import('@/pages/admin/accounts/InviteFromRosterPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'invite-roster', schoolId], await m.fetchInviteContext(schoolId));
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
    import('@/pages/admin/attendance/AttendanceRecordsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'attendance', userId, today], await m.fetchAttendance(userId, today));
    }),
    import('@/pages/admin/reports/ReportsHub').then(async (m) => {
      queryClient.setQueryData(['admin', 'report-stats', userId], await m.fetchReportStats(userId));
    }),
    import('@/pages/admin/reports/ReportRecordsPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'report-records', userId], await m.fetchReportRecords(userId));
    }),
    import('@/pages/admin/reports/ReportsGeneratePage').then(async (m) => {
      queryClient.setQueryData(['admin', 'reports-generate-examsets', userId], await m.fetchReportsGenerateExamSetsPage(userId));
    }),
    import('@/pages/admin/outstanding/OutstandingPage').then(async (m) => {
      queryClient.setQueryData(['admin', 'outstanding', userId], await m.fetchOutstanding(userId));
    }),
    import('@/pages/admin/Dashboard').then(async (m) => {
      queryClient.setQueryData(['dashboard', 'admin', 'auth', userId], await m.fetchDashboardAuth(userId));
    }),
    import('@/pages/admin/reports/GenerateReportsPage').then(async (m) => {
      const page = await m.fetchPageData(userId);
      queryClient.setQueryData(['admin', 'student-report-generator', userId], page);
    }),
    import('@/pages/admin/components/RecentPaymentsNotifications').then(async (m) => {
      queryClient.setQueryData(['dashboard', 'admin', 'paymentsNotifications', userId], await m.fetchPaymentsNotifications(userId));
    }),
    import('@/pages/admin/components/RecentReportsSystemHealth').then(async (m) => {
      queryClient.setQueryData(['dashboard', 'admin', 'reports', userId], await m.fetchRecentDashboardReports(userId));
    }),
    Promise.resolve().then(async () => {
      queryClient.setQueryData(adminQueryKeys.adminDashboardKpis(schoolId), await fetchAdminDesignDashboardKpis(schoolId));
    }),
  ];

  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('[prefetchAdminSidebarRoutes] slice failed', r.reason);
    }
  }
}
