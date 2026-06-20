import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { ReactQueryProvider } from './lib/queryClient';
import { ThemeProvider } from './lib/theme-provider';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './router/ProtectedRoute';
import { isDesktopApp } from './lib/isDesktopApp';
import SchoolChatPresenceHeartbeat from './components/SchoolChatPresenceHeartbeat';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import WebPinGate from './components/WebPinGate';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import AdminLayout from './components/layout/AdminLayout';
import HeadTeacherLayout from './components/layout/HeadTeacherLayout';
import DosLayout from './components/layout/DosLayout';
import SecretaryLayout from './components/layout/SecretaryLayout';
import TeacherLayout from './pages/teacher/TeacherLayout';
import StudentLayout from './components/layout/StudentLayout';
import AccountantLayout from './pages/accountant/AccountantLayout';
import ThemedLoadingView from './components/ui/ThemedLoadingView';
import {
  AccountantAdjustmentsPage,
  AccountantBankPage,
  AccountantBillingPage,
  AccountantDashboard,
  AccountantExpenseReceiptPage,
  AccountantExpensesPage,
  AccountantFeeStructurePage,
  AccountantNotificationsPage,
  AccountantOutstandingPage,
  AccountantPaymentsPage,
  AccountantReceiptsPage,
  AccountantReportsPage,
  AccountsPage,
  AddStudentPage,
  AdminDashboard,
  AdminJobsPage,
  AffiliatePage,
  AffiliateTermsPage,
  AffiliatePortalPage,
  AppDesktopProviders,
  AdminTeacherAttendancePage,
  AttendanceRecordsPage,
  AdminLessonMonitorPage,
  AttendanceCodePage,
  BiometricEnrollmentPage,
  BiometricDevicesPage,
  AuthCallbackPage,
  BulkGenerator,
  ChatRouteRedirect,
  ClassDetailPage,
  ClinicianDashboard,
  CompleteFirstPasswordPage,
  ContactPage,
  HelpCenterPage,
  CreateParentLoginPage,
  CreateStaffPage,
  CreateTeacherLoginPage,
  DashboardEntry,
  DesignFinanceDashboard,
  DesignOutstandingPage,
  DesignParentProfile,
  DesignParentsPage,
  DesignStudentsPage,
  StudentFeeSyncPage,
  StreamAllocationPage,
  DesignTeacherProfile,
  DesignTeachersPage,
  DesktopSplash,
  ExamSetsPage,
  ExamSetResultsPage,
  FinanceLayout,
  FinanceSubPagePlaceholder,
  FinancialAnalyticsPage,
  ForgotPasswordPage,
  HeadedPaperPage,
  HeadTeacherDashboard,
  HeadTeacherProfilePage,
  DosDashboard,
  SecretaryDashboard,
  SecretaryVisitorLogPage,
  SecretaryAdmissionFormPage,
  SecretaryStaffDirectoryPage,
  HeritagePdfPrintPage,
  HomePage,
  IdentityPage,
  InviteFromRosterPage,
  JobApplyPage,
  JobsPage,
  LeavePage,
  LabTechnicianDashboard,
  LibrarianDashboard,
  LibraryPage,
  LocationSettingsPage,
  LoginPage,
  NotificationsPage,
  OnboardingPage,
  OtherStaffProfilePage,
  OwnerDashboard,
  ParentAttendancePage,
  ParentDashboard,
  ParentExamsPage,
  ParentFeesPage,
  ParentLayout,
  ParentNoticesPage,
  ParentPerformancePage,
  ParentProfilePage,
  ParentReceiptsPage,
  ParentReportsPage,
  ParentSettingsPage,
  ParentTimetablePage,
  PayrollPage,
  PerformancePage,
  PermissionsPage,
  PrintClassRedirect,
  PrintStudentRedirect,
  PrivacyPolicyPage,
  RecoveryCodePage,
  RegisterPage,
  RecruitmentPage,
  ReportGeneratorEntryPage,
  ReportRecordsPage,
  ReportViewer,
  ReportsHub,
  SchoolChatPage,
  SecondaryGenerateReportsPage,
  SecurityLetterPage,
  SettingsClassesPage,
  SettingsPage,
  StaffPage,
  StudentDashboard,
  StudentFeesPage,
  StudentTakeAssignmentPage,
  StudentIDCardPage,
  StudentProfilePage,
  TeacherAiPlannerPage,
  TeacherAssignmentsPage,
  TeacherAssignmentSubmissionsPage,
  TeacherCreateAssignmentPage,
  TeacherAttendancePage,
  TeacherClassesPage,
  TeacherCurriculumPage,
  TeacherDashboard,
  TeacherEditPage,
  TeacherExamResultsClassPage,
  TeacherExamResultsPage,
  TeacherExamResultsSubjectPage,
  TeacherGradingSystemPage,
  TeacherLessonLogPage,
  TeacherLessonNotesPage,
  TeacherLessonPlanPage,
  TeacherNotificationsPage,
  TeacherResourcesPage,
  TeacherSchemeOfWorkPage,
  TeacherSettingsPage,
  TeacherStudentsPage,
  TeacherTemplatesPage,
  TeacherTimetablePage,
  UpdatePasswordPage,
  WorkforceHomePage,
  AdminTemplateListPage,
  AdminTemplateDesignerPage,
  DownloadAppsPage,
  RolePickerPage,
  SchoolPickerPage,
} from './app/appRouteComponents';

/**
 * Listens to Supabase's auth state change and keeps authStore.sessionConfirmed in sync.
 * This is the only source of truth for whether background data calls are safe to make.
 * Runs once at the app root so it fires before any child component tries to use the session.
 */
function SessionGuard() {
  const setSessionConfirmed = useAuthStore((s) => s.setSessionConfirmed);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // getSession() immediately resolves with the current session (no network call)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionConfirmed(true);
      } else {
        // No live session — clear stale persisted state so guards work correctly
        logout();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionConfirmed(true);
      } else {
        setSessionConfirmed(false);
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          logout();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Primes IndexedDB cache and auto-syncs on reconnect. Rendered once at app root.
function OfflineSyncEngine() {
  const { sync } = useOfflineStatus();

  // Forward service-worker sync requests to the app-layer flush
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PWEZA_SYNC_REQUESTED') {
        void sync();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [sync]);

  return null;
}

function AppRouteTree() {
  return (
    <Routes>
      {isDesktopApp ? (
        <Route path="/" element={<DesktopSplash />} />
      ) : (
        <Route path="/" element={<HomePage />} />
      )}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/complete-password" element={<CompleteFirstPasswordPage />} />
      {!isDesktopApp && (
        <>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/apps" element={<DownloadAppsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobId/apply" element={<JobApplyPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/affiliate-terms" element={<AffiliateTermsPage />} />
          <Route path="/affiliate-portal" element={<AffiliatePortalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/security" element={<SecurityLetterPage />} />
        </>
      )}
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/recovery-code" element={<RecoveryCodePage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/role-picker" element={<RolePickerPage />} />
      <Route path="/select-school" element={<SchoolPickerPage />} />
      {isDesktopApp && <Route path="/update" element={<ThemedLoadingView />} />}
      {!isDesktopApp && <Route path="/print/heritage-pdf" element={<HeritagePdfPrintPage />} />}
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<DashboardEntry />} />
        <Route path="chat" element={<ChatRouteRedirect />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students">
            <Route index element={<DesignStudentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/admin/students?add=1" replace />} />
            <Route path="fee-sync" element={<StudentFeeSyncPage />} />
            <Route path="stream-allocation" element={<StreamAllocationPage />} />
            <Route path=":student_id" element={<StudentProfilePage />} />
          </Route>
          <Route path="teachers" element={<DesignTeachersPage />} />
          <Route path="teachers/add" element={<Navigate to="/dashboard/admin/teachers?add=1" replace />} />
          <Route path="teachers/:teacher_id" element={<DesignTeacherProfile />} />
          <Route path="teachers/:teacher_id/edit" element={<TeacherEditPage />} />
          <Route path="teachers/:teacher_id/create-login" element={<CreateTeacherLoginPage />} />
          <Route path="parents">
            <Route index element={<DesignParentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/admin/parents?add=1" replace />} />
            <Route path=":parent_id/create-login" element={<CreateParentLoginPage />} />
            <Route path=":parent_id" element={<DesignParentProfile />} />
          </Route>
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/add" element={<CreateStaffPage />} />
          <Route path="accounts/invite" element={<InviteFromRosterPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="staff/member/:member_id" element={<OtherStaffProfilePage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="exam-sets" element={<ExamSetsPage />} />
          <Route path="exam-set-results" element={<ExamSetResultsPage />} />
          <Route path="attendance" element={<AttendanceRecordsPage />} />
          <Route path="attendance/teachers" element={<AdminTeacherAttendancePage />} />
          <Route path="attendance-code" element={<AttendanceCodePage />} />
          <Route path="lesson-monitor" element={<AdminLessonMonitorPage />} />
          <Route path="biometric" element={<BiometricEnrollmentPage />} />
          <Route path="biometric-devices" element={<BiometricDevicesPage />} />
          <Route path="identity" element={<IdentityPage />} />
          <Route path="identity/:id" element={<StudentIDCardPage />} />
          <Route path="headed-paper" element={<HeadedPaperPage />} />
          <Route path="finance" element={<FinanceLayout />}>
            <Route index element={<DesignFinanceDashboard />} />
            <Route path="financial-analytics" element={<FinancialAnalyticsPage />} />
            <Route path="outstanding" element={<DesignOutstandingPage />} />
            <Route path="payments" element={<FinanceSubPagePlaceholder />} />
            <Route path="payments/new" element={<FinanceSubPagePlaceholder />} />
            <Route path="expenses" element={<FinanceSubPagePlaceholder />} />
            <Route path="fee-structure" element={<FinanceSubPagePlaceholder />} />
            <Route path="receipts" element={<FinanceSubPagePlaceholder />} />
            <Route path="receipts/:payment_id" element={<FinanceSubPagePlaceholder />} />
            <Route path="reports" element={<FinanceSubPagePlaceholder />} />
          </Route>
          <Route path="outstanding" element={<Navigate to="/dashboard/admin/finance/outstanding" replace />} />
          <Route path="settings/classes/:className" element={<ClassDetailPage />} />
          <Route path="settings/classes" element={<SettingsClassesPage />} />
          <Route path="settings/location" element={<LocationSettingsPage />} />
          <Route path="settings/:section" element={<SettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="workforce" element={<WorkforceHomePage />} />
          <Route path="workforce/leave" element={<LeavePage />} />
          <Route path="workforce/payroll" element={<PayrollPage />} />
          <Route path="workforce/recruitment" element={<RecruitmentPage />} />
          <Route path="workforce/onboarding" element={<OnboardingPage />} />
          <Route path="workforce/performance" element={<PerformancePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="report-records" element={<ReportRecordsPage />} />
          <Route path="reports/generate-secondary" element={<SecondaryGenerateReportsPage />} />
          <Route path="reports/generate" element={<ReportGeneratorEntryPage />} />
          <Route path="reports/snapshots" element={<Navigate to="/dashboard/admin/reports" replace />} />
          <Route path="reports/bulk" element={<BulkGenerator />} />
          <Route path="reports/viewer" element={<ReportViewer />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="templates" element={<AdminTemplateListPage />} />
          <Route path="templates/designer" element={<AdminTemplateDesignerPage />} />
        </Route>
        <Route path="head-teacher" element={<HeadTeacherLayout />}>
          <Route index element={<HeadTeacherDashboard />} />
          <Route path="profile" element={<HeadTeacherProfilePage />} />
          <Route path="students">
            <Route index element={<DesignStudentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/head-teacher/students?add=1" replace />} />
            <Route path=":student_id" element={<StudentProfilePage />} />
          </Route>
          <Route path="teachers" element={<DesignTeachersPage />} />
          <Route path="teachers/add" element={<Navigate to="/dashboard/head-teacher/teachers?add=1" replace />} />
          <Route path="teachers/:teacher_id" element={<DesignTeacherProfile />} />
          <Route path="teachers/:teacher_id/edit" element={<TeacherEditPage />} />
          <Route path="teachers/:teacher_id/create-login" element={<CreateTeacherLoginPage />} />
          <Route path="parents">
            <Route index element={<DesignParentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/head-teacher/parents?add=1" replace />} />
            <Route path=":parent_id/create-login" element={<CreateParentLoginPage />} />
            <Route path=":parent_id" element={<DesignParentProfile />} />
          </Route>
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/add" element={<CreateStaffPage />} />
          <Route path="accounts/invite" element={<InviteFromRosterPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="staff/member/:member_id" element={<OtherStaffProfilePage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="exam-sets" element={<ExamSetsPage />} />
          <Route path="exam-set-results" element={<ExamSetResultsPage />} />
          <Route path="attendance" element={<AttendanceRecordsPage />} />
          <Route path="identity" element={<IdentityPage />} />
          <Route path="identity/:id" element={<StudentIDCardPage />} />
          <Route path="headed-paper" element={<HeadedPaperPage />} />
          <Route path="headteacher-comments-settings" element={<TeacherGradingSystemPage />} />
          <Route path="finance" element={<FinanceLayout />}>
            <Route index element={<DesignFinanceDashboard />} />
            <Route path="financial-analytics" element={<FinancialAnalyticsPage />} />
            <Route path="outstanding" element={<DesignOutstandingPage />} />
            <Route path="payments" element={<FinanceSubPagePlaceholder />} />
            <Route path="payments/new" element={<FinanceSubPagePlaceholder />} />
            <Route path="expenses" element={<FinanceSubPagePlaceholder />} />
            <Route path="fee-structure" element={<FinanceSubPagePlaceholder />} />
            <Route path="receipts" element={<FinanceSubPagePlaceholder />} />
            <Route path="receipts/:payment_id" element={<FinanceSubPagePlaceholder />} />
            <Route path="reports" element={<FinanceSubPagePlaceholder />} />
          </Route>
          <Route path="outstanding" element={<Navigate to="/dashboard/head-teacher/finance/outstanding" replace />} />
          <Route path="settings/classes/:className" element={<ClassDetailPage />} />
          <Route path="settings/classes" element={<SettingsClassesPage />} />
          <Route path="settings/location" element={<LocationSettingsPage />} />
          <Route path="settings/:section" element={<SettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="workforce" element={<WorkforceHomePage />} />
          <Route path="workforce/leave" element={<LeavePage />} />
          <Route path="workforce/payroll" element={<PayrollPage />} />
          <Route path="workforce/recruitment" element={<RecruitmentPage />} />
          <Route path="workforce/onboarding" element={<OnboardingPage />} />
          <Route path="workforce/performance" element={<PerformancePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="report-records" element={<ReportRecordsPage />} />
          <Route path="reports/generate-secondary" element={<SecondaryGenerateReportsPage />} />
          <Route path="reports/generate" element={<ReportGeneratorEntryPage />} />
          <Route path="reports/snapshots" element={<Navigate to="/dashboard/head-teacher/reports" replace />} />
          <Route path="reports/bulk" element={<BulkGenerator />} />
          <Route path="reports/viewer" element={<ReportViewer />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="messages" element={<SchoolChatPage />} />
        </Route>
        {/* Director of Studies (DOS) and Deputy DOS — academic management */}
        <Route path="dos" element={<DosLayout />}>
          <Route index element={<DosDashboard />} />
          <Route path="profile" element={<HeadTeacherProfilePage />} />
          <Route path="students">
            <Route index element={<DesignStudentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/dos/students?add=1" replace />} />
            <Route path=":student_id" element={<StudentProfilePage />} />
          </Route>
          <Route path="teachers" element={<DesignTeachersPage />} />
          <Route path="teachers/add" element={<Navigate to="/dashboard/dos/teachers?add=1" replace />} />
          <Route path="teachers/:teacher_id" element={<DesignTeacherProfile />} />
          <Route path="teachers/:teacher_id/edit" element={<TeacherEditPage />} />
          <Route path="teachers/:teacher_id/create-login" element={<CreateTeacherLoginPage />} />
          <Route path="exam-sets" element={<ExamSetsPage />} />
          <Route path="exam-set-results" element={<ExamSetResultsPage />} />
          <Route path="attendance" element={<AttendanceRecordsPage />} />
          <Route path="attendance/teachers" element={<AdminTeacherAttendancePage />} />
          <Route path="headteacher-comments-settings" element={<TeacherGradingSystemPage />} />
          <Route path="settings/classes/:className" element={<ClassDetailPage />} />
          <Route path="settings/classes" element={<SettingsClassesPage />} />
          <Route path="settings/location" element={<LocationSettingsPage />} />
          <Route path="settings/:section" element={<SettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="report-records" element={<ReportRecordsPage />} />
          <Route path="reports/generate-secondary" element={<SecondaryGenerateReportsPage />} />
          <Route path="reports/generate" element={<ReportGeneratorEntryPage />} />
          <Route path="reports/bulk" element={<BulkGenerator />} />
          <Route path="reports/viewer" element={<ReportViewer />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="messages" element={<SchoolChatPage />} />
        </Route>
        <Route path="teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudentsPage />} />
          <Route path="classes" element={<TeacherClassesPage />} />
          <Route path="templates" element={<TeacherTemplatesPage />} />
          <Route path="exam-results" element={<TeacherExamResultsPage />} />
          <Route path="exam-results/class/:classEncoded/subject/:subjectEncoded" element={<TeacherExamResultsSubjectPage />} />
          <Route path="exam-results/class/:classEncoded" element={<TeacherExamResultsClassPage />} />
          <Route path="attendance" element={<TeacherAttendancePage />} />
          <Route path="timetable" element={<TeacherTimetablePage />} />
          <Route path="grading-system" element={<TeacherGradingSystemPage />} />
          <Route path="ai-planner" element={<TeacherAiPlannerPage />} />
          <Route path="assignments" element={<TeacherAssignmentsPage />} />
          <Route path="assignments/create" element={<TeacherCreateAssignmentPage />} />
          <Route path="assignments/:assignmentId/submissions" element={<TeacherAssignmentSubmissionsPage />} />
          <Route path="resources" element={<TeacherResourcesPage />} />
          <Route path="curriculum" element={<TeacherCurriculumPage />} />
          <Route path="scheme-of-work" element={<TeacherSchemeOfWorkPage />} />
          <Route path="lesson-log" element={<TeacherLessonLogPage />} />
          <Route path="lesson-plan" element={<TeacherLessonPlanPage />} />
          <Route path="lesson-notes" element={<TeacherLessonNotesPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="notifications" element={<TeacherNotificationsPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
          <Route path="school/add-student" element={<AddStudentPage />} />
        </Route>
        <Route path="secretary" element={<SecretaryLayout />}>
          <Route index element={<SecretaryDashboard />} />
          <Route path="students" element={<DesignStudentsPage />} />
          <Route path="students/add" element={<AddStudentPage />} />
          <Route path="students/:student_id" element={<StudentProfilePage />} />
          <Route path="attendance" element={<AttendanceRecordsPage />} />
          <Route path="attendance-code" element={<AttendanceCodePage />} />
          <Route path="visitors" element={<SecretaryVisitorLogPage />} />
          <Route path="staff" element={<SecretaryStaffDirectoryPage />} />
          <Route path="admission-form" element={<SecretaryAdmissionFormPage />} />
          <Route path="headed-paper" element={<HeadedPaperPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="report-records" element={<ReportRecordsPage />} />
          <Route path="reports/generate-secondary" element={<SecondaryGenerateReportsPage />} />
          <Route path="reports/generate" element={<ReportGeneratorEntryPage />} />
          <Route path="reports/bulk" element={<BulkGenerator />} />
          <Route path="reports/viewer" element={<ReportViewer />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="exam-set-results" element={<ExamSetResultsPage />} />
          <Route path="finance/outstanding" element={<DesignOutstandingPage />} />
          <Route path="finance/fee-records" element={<FinanceSubPagePlaceholder />} />
        </Route>
        <Route path="student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="assignment/:assignmentId" element={<StudentTakeAssignmentPage />} />
        </Route>
        <Route path="parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="notices" element={<ParentNoticesPage />} />
          <Route path="performance" element={<ParentPerformancePage />} />
          <Route path="attendance" element={<ParentAttendancePage />} />
          <Route path="timetable" element={<ParentTimetablePage />} />
          <Route path="exams" element={<ParentExamsPage />} />
          <Route path="reports" element={<ParentReportsPage />} />
          <Route path="fees" element={<ParentFeesPage />} />
          <Route path="receipts" element={<ParentReceiptsPage />} />
          <Route path="profile" element={<ParentProfilePage />} />
          <Route path="settings" element={<ParentSettingsPage />} />
        </Route>
        <Route path="accountant" element={<AccountantLayout />}>
          <Route index element={<AccountantDashboard />} />
          <Route path="financial-analytics" element={<FinancialAnalyticsPage />} />
          <Route path="fee-structure" element={<AccountantFeeStructurePage />} />
          <Route path="billing" element={<AccountantBillingPage />} />
          <Route path="payments" element={<AccountantPaymentsPage />} />
          <Route path="receipts" element={<AccountantReceiptsPage />} />
          <Route path="outstanding" element={<AccountantOutstandingPage />} />
          <Route path="expenses/receipt/:expenseId" element={<AccountantExpenseReceiptPage />} />
          <Route path="expenses" element={<AccountantExpensesPage />} />
          <Route path="bank" element={<AccountantBankPage />} />
          <Route path="reports" element={<AccountantReportsPage />} />
          <Route path="adjustments" element={<AccountantAdjustmentsPage />} />
          <Route path="notifications" element={<AccountantNotificationsPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
        </Route>
        <Route path="librarian" element={<LibrarianDashboard />} />
        <Route path="lab-technician" element={<LabTechnicianDashboard />} />
        <Route path="clinician" element={<ClinicianDashboard />} />
        <Route path="owner/*" element={<OwnerDashboard />} />
      </Route>
      {isDesktopApp && (
        <Route path="/print" element={<ProtectedRoute />}>
          <Route path="heritage-pdf" element={<HeritagePdfPrintPage />} />
          <Route path="student/:studentId" element={<PrintStudentRedirect />} />
          <Route path="class/:classId" element={<PrintClassRedirect />} />
        </Route>
      )}
      <Route path="*" element={<Navigate to={isDesktopApp ? '/login' : '/'} replace />} />
    </Routes>
  );
}

function App() {
  const outerFallback = isDesktopApp ? null : <ThemedLoadingView />;
  return (
    <ThemeProvider defaultTheme="light" storageKey="pwezacore-theme">
      <ReactQueryProvider>
        <SessionGuard />
        <SchoolChatPresenceHeartbeat />
        {!isDesktopApp && <ServiceWorkerRegistration />}
        <PWAInstallPrompt />
        <OfflineSyncEngine />
        {!isDesktopApp && <OfflineBanner />}
        <ToastProvider>
          <Suspense fallback={outerFallback}>
            {AppDesktopProviders ? (
              <AppDesktopProviders>
                <AppRouteTree />
              </AppDesktopProviders>
            ) : (
              <WebPinGate>
                <AppRouteTree />
              </WebPinGate>
            )}
          </Suspense>
        </ToastProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}

export default App;
