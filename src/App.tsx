import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { ReactQueryProvider } from './lib/queryClient';
import { ThemeProvider } from './lib/theme-provider';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './router/ProtectedRoute';
import { isDesktopApp } from './lib/isDesktopApp';
import SchoolChatPresenceHeartbeat from './components/SchoolChatPresenceHeartbeat';
import AdminLayout from './components/layout/AdminLayout';
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
  AppDesktopProviders,
  AttendanceRecordsPage,
  AuthCallbackPage,
  BulkGenerator,
  ChatRouteRedirect,
  ClassDetailPage,
  ClinicianDashboard,
  CompleteFirstPasswordPage,
  ContactPage,
  CreateParentLoginPage,
  CreateStaffPage,
  CreateTeacherLoginPage,
  DashboardEntry,
  DesignFinanceDashboard,
  DesignOutstandingPage,
  DesignParentProfile,
  DesignParentsPage,
  DesignStudentsPage,
  DesignTeacherProfile,
  DesignTeachersPage,
  DesktopSplash,
  ExamSetsPage,
  FinanceLayout,
  FinanceSubPagePlaceholder,
  FinancialAnalyticsPage,
  ForgotPasswordPage,
  HeadedPaperPage,
  HeadTeacherDashboard,
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
  StudentIDCardPage,
  StudentProfilePage,
  TeacherAiPlannerPage,
  TeacherAssignmentsPage,
  TeacherAttendancePage,
  TeacherClassesPage,
  TeacherDashboard,
  TeacherEditPage,
  TeacherExamResultsClassPage,
  TeacherExamResultsPage,
  TeacherExamResultsSubjectPage,
  TeacherGradingSystemPage,
  TeacherNotificationsPage,
  TeacherResourcesPage,
  TeacherSettingsPage,
  TeacherStudentsPage,
  TeacherTimetablePage,
  UpdatePasswordPage,
  WorkforceHomePage,
} from './app/appRouteComponents';

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
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobId/apply" element={<JobApplyPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/affiliate-terms" element={<AffiliateTermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/security-letter" element={<SecurityLetterPage />} />
        </>
      )}
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/recovery-code" element={<RecoveryCodePage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {isDesktopApp && <Route path="/update" element={<ThemedLoadingView />} />}
      {!isDesktopApp && <Route path="/print/heritage-pdf" element={<HeritagePdfPrintPage />} />}
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<DashboardEntry />} />
        <Route path="chat" element={<ChatRouteRedirect />} />
        <Route path="expense-receipt/:expenseId" element={<AccountantExpenseReceiptPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students">
            <Route index element={<DesignStudentsPage />} />
            <Route path="add" element={<Navigate to="/dashboard/admin/students?add=1" replace />} />
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
          <Route path="attendance" element={<AttendanceRecordsPage />} />
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
        </Route>
        <Route path="teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudentsPage />} />
          <Route path="classes" element={<TeacherClassesPage />} />
          <Route path="exam-results" element={<TeacherExamResultsPage />} />
          <Route path="exam-results/class/:classEncoded/subject/:subjectEncoded" element={<TeacherExamResultsSubjectPage />} />
          <Route path="exam-results/class/:classEncoded" element={<TeacherExamResultsClassPage />} />
          <Route path="attendance" element={<TeacherAttendancePage />} />
          <Route path="timetable" element={<TeacherTimetablePage />} />
          <Route path="grading-system" element={<TeacherGradingSystemPage />} />
          <Route path="ai-planner" element={<TeacherAiPlannerPage />} />
          <Route path="assignments" element={<TeacherAssignmentsPage />} />
          <Route path="resources" element={<TeacherResourcesPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
          <Route path="notifications" element={<TeacherNotificationsPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
          <Route path="school/add-student" element={<AddStudentPage />} />
        </Route>
        <Route path="student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="messages" element={<SchoolChatPage />} />
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
          <Route path="messages" element={<SchoolChatPage />} />
        </Route>
        <Route path="librarian" element={<LibrarianDashboard />} />
        <Route path="lab-technician" element={<LabTechnicianDashboard />} />
        <Route path="clinician" element={<ClinicianDashboard />} />
        <Route path="head-teacher" element={<HeadTeacherDashboard />} />
        <Route path="owner" element={<OwnerDashboard />} />
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
        <SchoolChatPresenceHeartbeat />
        <ToastProvider>
          <Suspense fallback={outerFallback}>
            {AppDesktopProviders ? (
              <AppDesktopProviders>
                <AppRouteTree />
              </AppDesktopProviders>
            ) : (
              <AppRouteTree />
            )}
          </Suspense>
        </ToastProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}

export default App;
