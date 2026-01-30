import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ReactQueryProvider } from './lib/queryClient';
import { ThemeProvider } from './lib/theme-provider';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './router/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import TeacherLayout from './components/layout/TeacherLayout';
import StudentLayout from './components/layout/StudentLayout';

// Lazy load pages
const HomePage = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/auth/Login'));
const RegisterPage = lazy(() => import('./pages/auth/Register'));
const DashboardEntry = lazy(() => import('./pages/dashboard/DashboardEntry'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const SnapshotManager = lazy(() => import('./pages/admin/reports/SnapshotManager'));
const BulkGenerator = lazy(() => import('./pages/admin/reports/BulkGenerator'));
const ReportViewer = lazy(() => import('./pages/admin/reports/ReportViewer'));
const StudentsPage = lazy(() => import('./pages/admin/students/StudentsPage'));
const TeachersPage = lazy(() => import('./pages/admin/teachers/TeachersPage'));
const ParentsPage = lazy(() => import('./pages/admin/parents/ParentsPage'));
const AccountsPage = lazy(() => import('./pages/admin/accounts/AccountsPage'));
const ExamSetsPage = lazy(() => import('./pages/admin/exam-sets/ExamSetsPage'));
const AttendanceRecordsPage = lazy(() => import('./pages/admin/attendance/AttendanceRecordsPage'));
const SettingsPage = lazy(() => import('./pages/admin/settings/SettingsPage'));
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherStudentsPage = lazy(() => import('./pages/teacher/students/StudentsPage'));
const TeacherClassesPage = lazy(() => import('./pages/teacher/classes/ClassesPage'));
const TeacherExamResultsPage = lazy(() => import('./pages/teacher/exam-results/ExamResultsPage'));
const TeacherAttendancePage = lazy(() => import('./pages/teacher/attendance/AttendancePage'));
const TeacherTimetablePage = lazy(() => import('./pages/teacher/timetable/TimetablePage'));
const TeacherSettingsPage = lazy(() => import('./pages/teacher/settings/SettingsPage'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentFeesPage = lazy(() => import('./pages/student/fees/FeesPage'));
const ParentDashboard = lazy(() => import('./pages/parent/Dashboard'));
const AccountantDashboard = lazy(() => import('./pages/accountant/Dashboard'));
const LibrarianDashboard = lazy(() => import('./pages/librarian/Dashboard'));
const HeadTeacherDashboard = lazy(() => import('./pages/head-teacher/Dashboard'));
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const LibraryPage = lazy(() => import('./pages/Library'));
const JobsPage = lazy(() => import('./pages/Jobs'));
const AffiliatePage = lazy(() => import('./pages/Affiliate'));
const ContactPage = lazy(() => import('./pages/Contact'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword'));
const AuthCallbackPage = lazy(() => import('./pages/auth/Callback'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy'));
const SecurityLetterPage = lazy(() => import('./pages/SecurityLetter'));
const AffiliateTermsPage = lazy(() => import('./pages/AffiliateTerms'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pwezacore-theme">
      <ReactQueryProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingSpinner />}>
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
                  <Route path="teachers" element={<TeachersPage />} />
                  <Route path="parents" element={<ParentsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="exam-sets" element={<ExamSetsPage />} />
                  <Route path="attendance" element={<AttendanceRecordsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="reports/snapshots" element={<SnapshotManager />} />
                  <Route path="reports/bulk" element={<BulkGenerator />} />
                  <Route path="reports/viewer" element={<ReportViewer />} />
                </Route>
                <Route path="teacher" element={<TeacherLayout />}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="students" element={<TeacherStudentsPage />} />
                  <Route path="classes" element={<TeacherClassesPage />} />
                  <Route path="exam-results" element={<TeacherExamResultsPage />} />
                  <Route path="attendance" element={<TeacherAttendancePage />} />
                  <Route path="timetable" element={<TeacherTimetablePage />} />
                  <Route path="settings" element={<TeacherSettingsPage />} />
                </Route>
                <Route path="student" element={<StudentLayout />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="fees" element={<StudentFeesPage />} />
                </Route>
                <Route path="parent" element={<ParentDashboard />} />
                <Route path="accountant" element={<AccountantDashboard />} />
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

