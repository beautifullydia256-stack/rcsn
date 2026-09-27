import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import TeacherLayout from '../components/layout/TeacherLayout';
import StudentLayout from '../components/layout/StudentLayout';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('../pages/auth/Login'));
const RegisterPage = lazy(() => import('../pages/auth/Register'));
const DashboardEntry = lazy(() => import('../pages/dashboard/DashboardEntry'));

// Admin routes
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const BulkGenerator = lazy(() => import('../pages/admin/reports/BulkGenerator'));
const ReportViewer = lazy(() => import('../pages/admin/reports/ReportViewer'));
const StudentsPage = lazy(() => import('../pages/admin/students/StudentsPage'));
const DesignTeachersPage = lazy(() => import('../pages/admin/teachers/DesignTeachersPage'));
const FinanceLayout = lazy(() => import('../pages/admin/finance/FinanceLayout'));
const DesignFinanceDashboard = lazy(() => import('../pages/admin/finance/DesignFinanceDashboard'));
const DesignOutstandingPage = lazy(() => import('../pages/admin/finance/DesignOutstandingPage'));
const FinanceSubPagePlaceholder = lazy(() => import('../pages/admin/finance/FinanceSubPagePlaceholder'));
const FinancialAnalyticsPage = lazy(() => import('../pages/finance/FinancialAnalyticsPage'));
const DesignParentsPage = lazy(() => import('../pages/admin/parents/DesignParentsPage'));
const DesignParentProfile = lazy(() => import('../pages/admin/parents/DesignParentProfile'));
const AccountsPage = lazy(() => import('../pages/admin/accounts/AccountsPage'));
const ExamSetsPage = lazy(() => import('../pages/admin/exam-sets/ExamSetsPage'));
const AttendanceRecordsPage = lazy(() => import('../pages/admin/attendance/AttendanceRecordsPage'));
const AttendanceCodePage = lazy(() => import('../pages/admin/attendance-code/AttendanceCodePage'));
const BiometricEnrollmentPage = lazy(() => import('../pages/admin/biometric/BiometricEnrollmentPage'));
const BiometricDevicesPage = lazy(() => import('../pages/admin/biometric/BiometricDevicesPage'));
const SettingsPage = lazy(() => import('../pages/admin/settings/SettingsPage'));
const IdentityPage = lazy(() => import('../pages/admin/identity/IdentityPage'));
const StudentIDCardPage = lazy(() => import('../pages/admin/identity/StudentIDCardPage'));
const HeadedPaperPage = lazy(() => import('../pages/admin/headed-paper/HeadedPaperPage'));
const DepartmentsPage = lazy(() => import('../pages/admin/departments/DepartmentsPage'));
const DailyIndentPage = lazy(() => import('../pages/store/DailyIndentPage'));
const BudgetRequisitionsPage = lazy(() => import('../pages/finance/BudgetRequisitionsPage'));
const ConsolidatedBudgetApprovalPage = lazy(() => import('../pages/admin/budget/ConsolidatedBudgetApprovalPage'));
const TestPage = lazy(() => import('../pages/admin/TestPage'));

// Teacher routes
const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboardHome'));
const TeacherStudentsPage = lazy(() => import('../pages/teacher/students/StudentsPage'));
const TeacherClassesPage = lazy(() => import('../pages/teacher/classes/ClassesPage'));
const TeacherExamResultsPage = lazy(() => import('../pages/teacher/exam-results/ExamResultsPage'));
const TeacherAttendancePage = lazy(() => import('../pages/teacher/attendance/AttendancePage'));
const TeacherTimetablePage = lazy(() => import('../pages/teacher/timetable/TimetablePage'));
const TeacherSettingsPage = lazy(() => import('../pages/teacher/settings/SettingsPage'));

// Student routes
const StudentDashboard = lazy(() => import('../pages/student/Dashboard'));
const StudentFeesPage = lazy(() => import('../pages/student/fees/FeesPage'));

// Secretary routes
const SecretaryDashboard = lazy(() => import('../pages/secretary/SecretaryDashboard'));
const SecretaryVisitorLog = lazy(() => import('../pages/secretary/VisitorLogPage'));
const SecretaryAdmissionForm = lazy(() => import('../pages/secretary/AdmissionFormPage'));
const SecretaryStaffDirectory = lazy(() => import('../pages/secretary/StaffDirectoryPage'));
const SecretaryAddStudentPage = lazy(() => import('../pages/secretary/SecretaryAddStudentPage'));

// Other role dashboards
const ParentDashboard = lazy(() => import('../pages/parent/Dashboard'));
const AccountantDashboard = lazy(() => import('../pages/accountant/Dashboard'));
const LibrarianDashboard = lazy(() => import('../pages/librarian/Dashboard'));
const HeadTeacherDashboard = lazy(() => import('../pages/head-teacher/Dashboard'));
const OwnerDashboard = lazy(() => import('../pages/owner/Dashboard'));

// Public routes
const HomePage = lazy(() => import('../pages/Home'));
const VerifyPage = lazy(() => import('../pages/VerifyPage'));
const ContactPage = lazy(() => import('../pages/Contact'));
const HelpCenterPage = lazy(() => import('../pages/HelpCenter'));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicy'));
const SecurityLetterPage = lazy(() => import('../pages/SecurityLetter'));

export const router: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/help',
    element: <HelpCenterPage />,
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/security',
    element: <SecurityLetterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify/:id',
    element: <VerifyPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <DashboardEntry />,
      },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'teachers', element: <DesignTeachersPage /> },
          { path: 'teachers/add', element: <Navigate to="/dashboard/admin/teachers?add=1" replace /> },
          {
            path: 'finance',
            element: <FinanceLayout />,
            children: [
              { index: true, element: <DesignFinanceDashboard /> },
              { path: 'financial-analytics', element: <FinancialAnalyticsPage /> },
              { path: 'outstanding', element: <DesignOutstandingPage /> },
              { path: 'payments', element: <FinanceSubPagePlaceholder /> },
              { path: 'payments/new', element: <FinanceSubPagePlaceholder /> },
              { path: 'expenses', element: <FinanceSubPagePlaceholder /> },
              { path: 'fee-structure', element: <FinanceSubPagePlaceholder /> },
              { path: 'receipts', element: <FinanceSubPagePlaceholder /> },
              { path: 'receipts/:payment_id', element: <FinanceSubPagePlaceholder /> },
              { path: 'reports', element: <FinanceSubPagePlaceholder /> },
              { path: 'student-ledger', element: <FinanceSubPagePlaceholder /> },
            ],
          },
          { path: 'outstanding', element: <Navigate to="/dashboard/admin/finance/outstanding" replace /> },
          { path: 'parents', element: <DesignParentsPage /> },
          { path: 'parents/add', element: <Navigate to="/dashboard/admin/parents?add=1" replace /> },
          { path: 'parents/:parent_id', element: <DesignParentProfile /> },
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'exam-sets', element: <ExamSetsPage /> },
          { path: 'attendance', element: <AttendanceRecordsPage /> },
          { path: 'attendance-code', element: <AttendanceCodePage /> },
          { path: 'biometric', element: <BiometricEnrollmentPage /> },
          { path: 'biometric-devices', element: <BiometricDevicesPage /> },
          { path: 'identity', element: <IdentityPage /> },
          { path: 'identity/:id', element: <StudentIDCardPage /> },
          { path: 'headed-paper', element: <HeadedPaperPage /> },
          { path: 'departments', element: <DepartmentsPage /> },
          { path: 'store/daily-indent', element: <DailyIndentPage /> },
          { path: 'budget/consolidated', element: <ConsolidatedBudgetApprovalPage /> },
          { path: 'budget/requisitions', element: <BudgetRequisitionsPage /> },
          { path: 'test', element: <TestPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'reports/snapshots', element: <Navigate to="/dashboard/admin/reports" replace /> },
          { path: 'reports/bulk', element: <BulkGenerator /> },
          { path: 'reports/viewer', element: <ReportViewer /> },
        ],
      },
      {
        path: 'teacher',
        element: <TeacherLayout />,
        children: [
          { index: true, element: <TeacherDashboard /> },
          { path: 'students', element: <TeacherStudentsPage /> },
          { path: 'classes', element: <TeacherClassesPage /> },
          { path: 'exam-results', element: <TeacherExamResultsPage /> },
          { path: 'attendance', element: <TeacherAttendancePage /> },
          { path: 'timetable', element: <TeacherTimetablePage /> },
          { path: 'store/daily-indent', element: <DailyIndentPage /> },
          { path: 'requisitions', element: <BudgetRequisitionsPage /> },
          { path: 'settings', element: <TeacherSettingsPage /> },
        ],
      },
      {
        path: 'student',
        element: <StudentLayout />,
        children: [
          { index: true, element: <StudentDashboard /> },
          { path: 'fees', element: <StudentFeesPage /> },
        ],
      },
      { path: 'parent', element: <ParentDashboard /> },
      { path: 'accountant', element: <AccountantDashboard /> },
      { path: 'librarian', element: <LibrarianDashboard /> },
      { path: 'head-teacher', element: <HeadTeacherDashboard /> },
      {
        path: 'secretary',
        children: [
          { index: true, element: <SecretaryDashboard /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'students/add', element: <SecretaryAddStudentPage /> },
          { path: 'visitors', element: <SecretaryVisitorLog /> },
          { path: 'admission-form', element: <SecretaryAdmissionForm /> },
          { path: 'staff', element: <SecretaryStaffDirectory /> },
          { path: 'teachers', element: <DesignTeachersPage /> },
          { path: 'attendance', element: <AttendanceRecordsPage /> },
          { path: 'attendance-code', element: <AttendanceCodePage /> },
          {
            path: 'finance',
            element: <FinanceLayout />,
            children: [
              { index: true, element: <DesignFinanceDashboard /> },
              { path: 'outstanding', element: <DesignOutstandingPage /> },
              { path: 'financial-analytics', element: <FinancialAnalyticsPage /> },
              { path: 'payments', element: <FinanceSubPagePlaceholder /> },
              { path: 'expenses', element: <FinanceSubPagePlaceholder /> },
              { path: 'fee-structure', element: <FinanceSubPagePlaceholder /> },
              { path: 'receipts', element: <FinanceSubPagePlaceholder /> },
              { path: 'reports', element: <FinanceSubPagePlaceholder /> },
              { path: 'student-ledger', element: <FinanceSubPagePlaceholder /> },
            ],
          },
          { path: 'exams', element: <ExamSetsPage /> },
          { path: 'reports/bulk', element: <BulkGenerator /> },
          { path: 'reports/viewer', element: <ReportViewer /> },
          { path: 'identity', element: <IdentityPage /> },
          { path: 'identity/:id', element: <StudentIDCardPage /> },
        ],
      },
      {
        path: 'owner',
        element: <AdminLayout />,
        children: [
          { index: true, element: <OwnerDashboard /> },
        ],
      },
    ],
  },
];

