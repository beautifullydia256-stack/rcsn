import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, type ComponentType } from 'react';
import { ReactQueryProvider } from './lib/queryClient';
import { ThemeProvider } from './lib/theme-provider';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './router/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import TeacherLayout from './pages/teacher/TeacherLayout';
import StudentLayout from './components/layout/StudentLayout';
import AccountantLayout from './pages/accountant/AccountantLayout';
import ThemedLoadingView from './components/ui/ThemedLoadingView';

// Retry once on chunk load failure (e.g. after deploy or network blip)
function lazyWithRetry<T extends { default: ComponentType<unknown> }>(
  importFn: () => Promise<T>,
  retries = 1
): React.LazyExoticComponent<ComponentType<unknown>> {
  return lazy(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await importFn();
      } catch (e) {
        if (i === retries) throw e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw new Error('Unreachable');
  });
}

// Lazy load pages (with retry to avoid chunk-load errors after deploy)
const HomePage = lazyWithRetry(() => import('./pages/Home'));
const LoginPage = lazyWithRetry(() => import('./pages/auth/Login'));
const RegisterPage = lazyWithRetry(() => import('./pages/auth/Register'));
const DashboardEntry = lazyWithRetry(() => import('./pages/dashboard/DashboardEntry'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'));
const ReportsHub = lazyWithRetry(() => import('./pages/admin/reports/ReportsHub'));
const GenerateReportsPage = lazyWithRetry(() => import('./pages/admin/reports/GenerateReportsPage'));
const ReportRecordsPage = lazyWithRetry(() => import('./pages/admin/reports/ReportRecordsPage'));
const BulkGenerator = lazyWithRetry(() => import('./pages/admin/reports/BulkGenerator'));
const ReportViewer = lazyWithRetry(() => import('./pages/admin/reports/ReportViewer'));
const StudentsPage = lazyWithRetry(() => import('./pages/admin/students/StudentsPage'));
const AddStudentPage = lazyWithRetry(() => import('./pages/admin/students/AddStudentPage'));
const TeachersPage = lazyWithRetry(() => import('./pages/admin/teachers/TeachersPage'));
const ParentsPage = lazyWithRetry(() => import('./pages/admin/parents/ParentsPage'));
const AccountsPage = lazyWithRetry(() => import('./pages/admin/accounts/AccountsPage'));
const CreateStaffPage = lazyWithRetry(() => import('./pages/admin/accounts/CreateStaffPage'));
const StaffPage = lazyWithRetry(() => import('./pages/admin/staff/StaffPage'));
const ExamSetsPage = lazyWithRetry(() => import('./pages/admin/exam-sets/ExamSetsPage'));
const AttendanceRecordsPage = lazyWithRetry(() => import('./pages/admin/attendance/AttendanceRecordsPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/admin/settings/SettingsPage'));
const SettingsClassesPage = lazyWithRetry(() => import('./pages/admin/settings/ClassesPage'));
const ClassDetailPage = lazyWithRetry(() => import('./pages/admin/settings/ClassDetailPage'));
const LocationSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/LocationSettingsPage'));
const OutstandingPage = lazyWithRetry(() => import('./pages/admin/outstanding/OutstandingPage'));
const AdminJobsPage = lazyWithRetry(() => import('./pages/admin/jobs/AdminJobsPage'));
const NotificationsPage = lazyWithRetry(() => import('./pages/admin/notifications/NotificationsPage'));
const IdentityPage = lazyWithRetry(() => import('./pages/admin/identity/IdentityPage'));
const StudentIDCardPage = lazyWithRetry(() => import('./pages/admin/identity/StudentIDCardPage'));
const TeacherDashboard = lazyWithRetry(() => import('./pages/teacher/Dashboard'));
const TeacherStudentsPage = lazyWithRetry(() => import('./pages/teacher/students/StudentsPage'));
const TeacherClassesPage = lazyWithRetry(() => import('./pages/teacher/classes/ClassesPage'));
const TeacherExamResultsPage = lazyWithRetry(() => import('./pages/teacher/exam-results/ExamResultsPage'));
const TeacherExamResultsClassPage = lazyWithRetry(() => import('./pages/teacher/exam-results/ExamResultsClassPage'));
const TeacherExamResultsSubjectPage = lazyWithRetry(() => import('./pages/teacher/exam-results/ExamResultsSubjectPage'));
const TeacherAttendancePage = lazyWithRetry(() => import('./pages/teacher/attendance/AttendancePage'));
const TeacherTimetablePage = lazyWithRetry(() => import('./pages/teacher/timetable/TimetablePage'));
const TeacherAiPlannerPage = lazyWithRetry(() => import('./pages/teacher/ai-planner/AiPlannerPage'));
const TeacherAssignmentsPage = lazyWithRetry(() => import('./pages/teacher/assignments/AssignmentsPage'));
const TeacherResourcesPage = lazyWithRetry(() => import('./pages/teacher/resources/ResourcesPage'));
const TeacherMessagesPage = lazyWithRetry(() => import('./pages/teacher/messages/MessagesPage'));
const TeacherNotificationsPage = lazyWithRetry(() => import('./pages/teacher/notifications/NotificationsPage'));
const TeacherSettingsPage = lazyWithRetry(() => import('./pages/teacher/settings/SettingsPage'));
const StudentDashboard = lazyWithRetry(() => import('./pages/student/Dashboard'));
const StudentFeesPage = lazyWithRetry(() => import('./pages/student/fees/FeesPage'));
const ParentDashboard = lazyWithRetry(() => import('./pages/parent/Dashboard'));
const AccountantDashboard = lazyWithRetry(() => import('./pages/accountant/Dashboard'));
const AccountantBillingPage = lazyWithRetry(() => import('./pages/accountant/BillingPage'));
const AccountantOutstandingPage = lazyWithRetry(() => import('./pages/accountant/OutstandingPage'));
const AccountantReceiptsPage = lazyWithRetry(() => import('./pages/accountant/ReceiptsPage'));
const AccountantExpensesPage = lazyWithRetry(() => import('./pages/accountant/ExpensesPage'));
const AccountantReportsPage = lazyWithRetry(() => import('./pages/accountant/ReportsPage'));
const AccountantBankPage = lazyWithRetry(() => import('./pages/accountant/BankPage'));
const AccountantFeeStructurePage = lazyWithRetry(() => import('./pages/accountant/FeeStructurePage'));
const AccountantPaymentsPage = lazyWithRetry(() => import('./pages/accountant/PaymentsPage'));
const AccountantAdjustmentsPage = lazyWithRetry(() => import('./pages/accountant/AdjustmentsPage'));
const LibrarianDashboard = lazyWithRetry(() => import('./pages/librarian/Dashboard'));
const HeadTeacherDashboard = lazyWithRetry(() => import('./pages/head-teacher/Dashboard'));
const OwnerDashboard = lazyWithRetry(() => import('./pages/owner/Dashboard'));
const LibraryPage = lazyWithRetry(() => import('./pages/Library'));
const JobsPage = lazyWithRetry(() => import('./pages/Jobs'));
const AffiliatePage = lazyWithRetry(() => import('./pages/Affiliate'));
const ContactPage = lazyWithRetry(() => import('./pages/Contact'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPassword'));
const AuthCallbackPage = lazyWithRetry(() => import('./pages/auth/Callback'));
const PrivacyPolicyPage = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const SecurityLetterPage = lazyWithRetry(() => import('./pages/SecurityLetter'));
const AffiliateTermsPage = lazyWithRetry(() => import('./pages/AffiliateTerms'));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pwezacore-theme">
      <ReactQueryProvider>
        <ToastProvider>
          <Suspense fallback={<ThemedLoadingView />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/affiliate" element={<AffiliatePage />} />
              <Route path="/affiliate-terms" element={<AffiliateTermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/security-letter" element={<SecurityLetterPage />} />
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route index element={<DashboardEntry />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/add" element={<AddStudentPage />} />
                  <Route path="teachers" element={<TeachersPage />} />
                  <Route path="parents" element={<ParentsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="accounts/add" element={<CreateStaffPage />} />
                  <Route path="staff" element={<StaffPage />} />
                  <Route path="exam-sets" element={<ExamSetsPage />} />
                  <Route path="attendance" element={<AttendanceRecordsPage />} />
                  <Route path="identity" element={<IdentityPage />} />
                  <Route path="identity/:id" element={<StudentIDCardPage />} />
                  <Route path="outstanding" element={<OutstandingPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/classes" element={<SettingsClassesPage />} />
                  <Route path="settings/classes/:className" element={<ClassDetailPage />} />
                  <Route path="settings/location" element={<LocationSettingsPage />} />
                  <Route path="jobs" element={<AdminJobsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="report-records" element={<ReportRecordsPage />} />
                  <Route path="reports/generate" element={<GenerateReportsPage />} />
                  <Route path="reports/snapshots" element={<Navigate to="/dashboard/admin/reports" replace />} />
                  <Route path="reports/bulk" element={<BulkGenerator />} />
                  <Route path="reports/viewer" element={<ReportViewer />} />
                  <Route path="reports" element={<ReportsHub />} />
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
                  <Route path="ai-planner" element={<TeacherAiPlannerPage />} />
                  <Route path="assignments" element={<TeacherAssignmentsPage />} />
                  <Route path="resources" element={<TeacherResourcesPage />} />
                  <Route path="messages" element={<TeacherMessagesPage />} />
                  <Route path="notifications" element={<TeacherNotificationsPage />} />
                  <Route path="settings" element={<TeacherSettingsPage />} />
                </Route>
                <Route path="student" element={<StudentLayout />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="fees" element={<StudentFeesPage />} />
                </Route>
                <Route path="parent" element={<ParentDashboard />} />
                <Route path="accountant" element={<AccountantLayout />}>
                  <Route index element={<AccountantDashboard />} />
                  <Route path="fee-structure" element={<AccountantFeeStructurePage />} />
                  <Route path="billing" element={<AccountantBillingPage />} />
                  <Route path="payments" element={<AccountantPaymentsPage />} />
                  <Route path="receipts" element={<AccountantReceiptsPage />} />
                  <Route path="outstanding" element={<AccountantOutstandingPage />} />
                  <Route path="expenses" element={<AccountantExpensesPage />} />
                  <Route path="bank" element={<AccountantBankPage />} />
                  <Route path="reports" element={<AccountantReportsPage />} />
                  <Route path="adjustments" element={<AccountantAdjustmentsPage />} />
                </Route>
                <Route path="librarian" element={<LibrarianDashboard />} />
                <Route path="head-teacher" element={<HeadTeacherDashboard />} />
                <Route path="owner" element={<OwnerDashboard />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}

export default App;

