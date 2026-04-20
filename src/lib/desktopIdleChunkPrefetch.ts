/**
 * After login, warm remaining lazy route chunks on the desktop build so first navigation
 * to secondary screens does not wait on the network disk cache read as often.
 * Non-blocking: runs in requestIdleCallback (or setTimeout fallback).
 */
export function scheduleDesktopIdleRoutePrefetch(): void {
  if (import.meta.env.VITE_DESKTOP_MODE !== 'true') return;

  const run = () => {
    void import('@/pages/admin/teachers/DesignTeachersPage');
    void import('@/pages/admin/parents/DesignParentsPage');
    void import('@/pages/chat/SchoolChatPage');
    void import('@/pages/admin/settings/SettingsPage');
    void import('@/pages/accountant/Dashboard');
    void import('@/pages/accountant/BillingPage');
    // Reports + finance adjacent (match “preload reports / fees” desktop goal — chunks only; data via pwezaStore + React Query)
    void import('@/pages/admin/reports/ReportGeneratorEntryPage');
    void import('@/pages/admin/reports/SecondaryGenerateReportsPage');
    void import('@/pages/admin/reports/ReportRecordsPage');
    void import('@/pages/admin/finance/DesignOutstandingPage');
    void import('@/pages/finance/FinancialAnalyticsPage');
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
