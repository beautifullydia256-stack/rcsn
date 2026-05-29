/**
 * Route component loaders: web keeps code-splitting; desktop (VITE_DESKTOP_MODE) eagerly loads
 * the core admin shell so navigation avoids chunk fetch + full-screen Suspense flashes.
 * Unused eager imports are dropped in web builds when VITE_DESKTOP_MODE is false.
 */
import { lazy, type ComponentType } from 'react';

const isDesktop = import.meta.env.VITE_DESKTOP_MODE === 'true';

/** Retry once on chunk load failure (e.g. after deploy or network blip). */
export function lazyWithRetry<T extends { default: ComponentType<unknown> }>(
  importFn: () => Promise<T>,
  retries = 1
) {
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

// --- Desktop eager (tree-shaken from web bundle when unused) ---
import LoginPageEager from '@/pages/auth/Login';
import CompleteFirstPasswordPageEager from '@/pages/auth/CompleteFirstPassword';
import DesktopSplashEager from '@/pages/DesktopSplash';
import DashboardEntryEager from '@/pages/dashboard/DashboardEntry';
import AdminDashboardEager from '@/pages/admin/Dashboard';
import DesignStudentsPageEager from '@/pages/admin/students/DesignStudentsPage';
import FinanceLayoutEager from '@/pages/admin/finance/FinanceLayout';
import DesignFinanceDashboardEager from '@/pages/admin/finance/DesignFinanceDashboard';
import ReportsHubEager from '@/pages/admin/reports/ReportsHub';
import NotificationsPageEager from '@/pages/admin/notifications/NotificationsPage';
import AppDesktopProvidersEager from '@/desktop/AppDesktopProviders';

export const LoginPage = isDesktop ? LoginPageEager : lazyWithRetry(() => import('@/pages/auth/Login'));
export const CompleteFirstPasswordPage = isDesktop
  ? CompleteFirstPasswordPageEager
  : lazyWithRetry(() => import('@/pages/auth/CompleteFirstPassword'));
export const DesktopSplash = isDesktop ? DesktopSplashEager : lazyWithRetry(() => import('@/pages/DesktopSplash'));
export const DashboardEntry = isDesktop ? DashboardEntryEager : lazyWithRetry(() => import('@/pages/dashboard/DashboardEntry'));
export const AdminDashboard = isDesktop ? AdminDashboardEager : lazyWithRetry(() => import('@/pages/admin/Dashboard'));
export const DesignStudentsPage = isDesktop
  ? DesignStudentsPageEager
  : lazyWithRetry(() => import('@/pages/admin/students/DesignStudentsPage'));
export const StudentFeeSyncPage = lazyWithRetry(() => import('@/pages/admin/students/StudentFeeSyncPage'));
export const StreamAllocationPage = lazyWithRetry(() => import('@/pages/admin/students/StreamAllocationPage'));
export const FinanceLayout = isDesktop ? FinanceLayoutEager : lazyWithRetry(() => import('@/pages/admin/finance/FinanceLayout'));
export const DesignFinanceDashboard = isDesktop
  ? DesignFinanceDashboardEager
  : lazyWithRetry(() => import('@/pages/admin/finance/DesignFinanceDashboard'));
export const ReportsHub = isDesktop ? ReportsHubEager : lazyWithRetry(() => import('@/pages/admin/reports/ReportsHub'));
export const NotificationsPage = isDesktop
  ? NotificationsPageEager
  : lazyWithRetry(() => import('@/pages/admin/notifications/NotificationsPage'));

/** Electron-only; null on web so Vercel bundle stays free of desktop-only code paths at runtime. */
export const AppDesktopProviders = isDesktop ? AppDesktopProvidersEager : null;

// --- Lazy everywhere (large / rare) ---
export const HomePage = lazyWithRetry(() => import('@/pages/Home'));
export const RegisterPage = lazyWithRetry(() => import('@/pages/auth/Register'));
export const SecondaryGenerateReportsPage = lazyWithRetry(
  () => import('@/pages/admin/reports/SecondaryGenerateReportsPage')
);
export const ReportRecordsPage = lazyWithRetry(() => import('@/pages/admin/reports/ReportRecordsPage'));
export const BulkGenerator = lazyWithRetry(() => import('@/pages/admin/reports/BulkGenerator'));
export const ReportViewer = lazyWithRetry(() => import('@/pages/admin/reports/ReportViewer'));
export const AddStudentPage = lazyWithRetry(() => import('@/pages/admin/students/AddStudentPage'));
export const StudentProfilePage = lazyWithRetry(() => import('@/pages/admin/students/DesignStudentProfile'));
export const DesignTeachersPage = lazyWithRetry(() => import('@/pages/admin/teachers/DesignTeachersPage'));
export const DesignTeacherProfile = lazyWithRetry(() => import('@/pages/admin/teachers/DesignTeacherProfile'));
export const TeacherEditPage = lazyWithRetry(() => import('@/pages/admin/teachers/TeacherEditPage'));
export const CreateTeacherLoginPage = lazyWithRetry(() => import('@/pages/admin/teachers/CreateTeacherLoginPage'));
export const DesignParentsPage = lazyWithRetry(() => import('@/pages/admin/parents/DesignParentsPage'));
export const DesignParentProfile = lazyWithRetry(() => import('@/pages/admin/parents/DesignParentProfile'));
export const CreateParentLoginPage = lazyWithRetry(() => import('@/pages/admin/parents/CreateParentLoginPage'));
export const AccountsPage = lazyWithRetry(() => import('@/pages/admin/accounts/AccountsPage'));
export const CreateStaffPage = lazyWithRetry(() => import('@/pages/admin/accounts/CreateStaffPage'));
export const InviteFromRosterPage = lazyWithRetry(() => import('@/pages/admin/accounts/InviteFromRosterPage'));
export const PermissionsPage = lazyWithRetry(() => import('@/pages/admin/permissions/PermissionsPage'));
export const StaffPage = lazyWithRetry(() => import('@/pages/admin/staff/StaffPage'));
export const OtherStaffProfilePage = lazyWithRetry(() => import('@/pages/admin/staff/OtherStaffProfilePage'));
export const ExamSetsPage = lazyWithRetry(() => import('@/pages/admin/exam-sets/ExamSetsPage'));
export const AttendanceRecordsPage = lazyWithRetry(() => import('@/pages/admin/attendance/AttendanceRecordsPage'));
export const AdminTeacherAttendancePage = lazyWithRetry(() => import('@/pages/admin/attendance/TeacherAttendancePage'));
export const AttendanceCodePage = lazyWithRetry(() => import('@/pages/admin/attendance-code/AttendanceCodePage'));
export const BiometricEnrollmentPage = lazyWithRetry(() => import('@/pages/admin/biometric/BiometricEnrollmentPage'));
export const BiometricDevicesPage = lazyWithRetry(() => import('@/pages/admin/biometric/BiometricDevicesPage'));
export const SettingsPage = lazyWithRetry(() => import('@/pages/admin/settings/SettingsPage'));
export const SettingsClassesPage = lazyWithRetry(() => import('@/pages/admin/settings/ClassesPage'));
export const ClassDetailPage = lazyWithRetry(() => import('@/pages/admin/settings/ClassDetailPage'));
export const LocationSettingsPage = lazyWithRetry(() => import('@/pages/admin/settings/LocationSettingsPage'));
export const FinanceSubPagePlaceholder = lazyWithRetry(() => import('@/pages/admin/finance/FinanceSubPagePlaceholder'));
export const FinancialAnalyticsPage = lazyWithRetry(() => import('@/pages/finance/FinancialAnalyticsPage'));
export const DesignOutstandingPage = lazyWithRetry(() => import('@/pages/admin/finance/DesignOutstandingPage'));
export const AdminJobsPage = lazyWithRetry(() => import('@/pages/admin/jobs/AdminJobsPage'));
export const WorkforceHomePage = lazyWithRetry(() => import('@/pages/admin/workforce/WorkforceHomePage'));
export const LeavePage = lazyWithRetry(() => import('@/pages/admin/workforce/LeavePage'));
export const PayrollPage = lazyWithRetry(() => import('@/pages/admin/workforce/PayrollPage'));
export const RecruitmentPage = lazyWithRetry(() => import('@/pages/admin/workforce/RecruitmentPage'));
export const OnboardingPage = lazyWithRetry(() => import('@/pages/admin/workforce/OnboardingPage'));
export const PerformancePage = lazyWithRetry(() => import('@/pages/admin/workforce/PerformancePage'));
export const JobApplyPage = lazyWithRetry(() => import('@/pages/JobApplyPage'));
export const IdentityPage = lazyWithRetry(() => import('@/pages/admin/identity/IdentityPage'));
export const StudentIDCardPage = lazyWithRetry(() => import('@/pages/admin/identity/StudentIDCardPage'));
export const HeadedPaperPage = lazyWithRetry(() => import('@/pages/admin/headed-paper/HeadedPaperPage'));
export const TeacherDashboard = lazyWithRetry(() => import('@/pages/teacher/TeacherDashboardHome'));
export const TeacherStudentsPage = lazyWithRetry(() => import('@/pages/teacher/students/StudentsPage'));
export const TeacherClassesPage = lazyWithRetry(() => import('@/pages/teacher/classes/ClassesPage'));
export const TeacherTemplatesPage = lazyWithRetry(() => import('@/pages/teacher/templates/TemplatesPage'));
export const TeacherExamResultsPage = lazyWithRetry(() => import('@/pages/teacher/exam-results/ExamResultsPage'));
export const TeacherExamResultsClassPage = lazyWithRetry(() => import('@/pages/teacher/exam-results/ExamResultsClassPage'));
export const TeacherExamResultsSubjectPage = lazyWithRetry(
  () => import('@/pages/teacher/exam-results/ExamResultsSubjectPage')
);
export const TeacherAttendancePage = lazyWithRetry(() => import('@/pages/teacher/attendance/AttendancePage'));
export const TeacherTimetablePage = lazyWithRetry(() => import('@/pages/teacher/timetable/TimetablePage'));
export const TeacherGradingSystemPage = lazyWithRetry(() => import('@/pages/teacher/grading-system/GradingSystemPage'));
export const TeacherAiPlannerPage = lazyWithRetry(() => import('@/pages/teacher/ai-planner/AiPlannerPage'));
export const TeacherAssignmentsPage = lazyWithRetry(() => import('@/pages/teacher/assignments/AssignmentsPage'));
export const TeacherCreateAssignmentPage = lazyWithRetry(() => import('@/pages/teacher/assignments/CreateAssignmentPage'));
export const TeacherAssignmentSubmissionsPage = lazyWithRetry(() => import('@/pages/teacher/assignments/AssignmentSubmissionsPage'));
export const TeacherResourcesPage = lazyWithRetry(() => import('@/pages/teacher/resources/ResourcesPage'));
export const StudentTakeAssignmentPage = lazyWithRetry(() => import('@/pages/student/TakeAssignmentPage'));
export const TeacherCurriculumPage = lazyWithRetry(() => import('@/pages/teacher/curriculum/CurriculumPage'));
export const TeacherSchemeOfWorkPage = lazyWithRetry(() => import('@/pages/teacher/scheme-of-work/SchemeOfWorkPage'));
export const TeacherLessonPlanPage = lazyWithRetry(() => import('@/pages/teacher/lesson-plan/LessonPlanPage'));
export const TeacherLessonNotesPage = lazyWithRetry(() => import('@/pages/teacher/lesson-notes/LessonNotesPage'));
export const SchoolChatPage = lazyWithRetry(() => import('@/pages/chat/SchoolChatPage'));
export const ChatRouteRedirect = lazyWithRetry(() => import('@/pages/chat/ChatRouteRedirect'));
export const ParentLayout = lazyWithRetry(() => import('@/components/layout/ParentLayout'));
export const TeacherNotificationsPage = lazyWithRetry(() => import('@/pages/teacher/notifications/NotificationsPage'));
export const TeacherSettingsPage = lazyWithRetry(() => import('@/pages/teacher/settings/SettingsPage'));
export const StudentDashboard = lazyWithRetry(() => import('@/pages/student/DesignStudentDashboard'));
export const StudentFeesPage = lazyWithRetry(() => import('@/pages/student/fees/FeesPage'));
export const ParentDashboard = lazyWithRetry(() => import('@/pages/parent/DesignParentDashboard'));
export const ParentNoticesPage = lazyWithRetry(() => import('@/pages/parent/ParentNoticesPage'));
export const ParentPerformancePage = lazyWithRetry(() => import('@/pages/parent/ParentPerformancePage'));
export const ParentAttendancePage = lazyWithRetry(() => import('@/pages/parent/ParentAttendancePage'));
export const ParentTimetablePage = lazyWithRetry(() => import('@/pages/parent/ParentTimetablePage'));
export const ParentExamsPage = lazyWithRetry(() => import('@/pages/parent/ParentExamsPage'));
export const ParentReportsPage = lazyWithRetry(() => import('@/pages/parent/ParentReportsPage'));
export const ParentFeesPage = lazyWithRetry(() => import('@/pages/parent/ParentFeesPage'));
export const ParentReceiptsPage = lazyWithRetry(() => import('@/pages/parent/ParentReceiptsPage'));

// Visual Template Designer
export const AdminTemplateListPage = lazyWithRetry(
  () => import('@/features/visual-template-designer/presentation/pages/TemplateListPage'),
);
export const AdminTemplateDesignerPage = lazyWithRetry(
  () => import('@/features/visual-template-designer/presentation/pages/TemplateDesignerPage'),
);
export const ParentProfilePage = lazyWithRetry(() => import('@/pages/parent/ParentProfilePage'));
export const ParentSettingsPage = lazyWithRetry(() => import('@/pages/parent/ParentSettingsPage'));
export const AccountantDashboard = lazyWithRetry(() => import('@/pages/accountant/Dashboard'));
export const AccountantBillingPage = lazyWithRetry(() => import('@/pages/accountant/BillingPage'));
export const AccountantOutstandingPage = lazyWithRetry(() => import('@/pages/accountant/OutstandingPage'));
export const AccountantReceiptsPage = lazyWithRetry(() => import('@/pages/accountant/ReceiptsPage'));
export const AccountantExpensesPage = lazyWithRetry(() => import('@/pages/accountant/ExpensesPage'));
export const AccountantExpenseReceiptPage = lazyWithRetry(() => import('@/pages/accountant/ExpenseReceiptPage'));
export const AccountantReportsPage = lazyWithRetry(() => import('@/pages/accountant/ReportsPage'));
export const AccountantBankPage = lazyWithRetry(() => import('@/pages/accountant/BankPage'));
export const AccountantFeeStructurePage = lazyWithRetry(() => import('@/pages/accountant/FeeStructurePage'));
export const AccountantNotificationsPage = lazyWithRetry(() => import('@/pages/accountant/NotificationsPage'));
export const AccountantPaymentsPage = lazyWithRetry(() => import('@/pages/accountant/PaymentsPage'));
export const AccountantAdjustmentsPage = lazyWithRetry(() => import('@/pages/accountant/AdjustmentsPage'));
export const LibrarianDashboard = lazyWithRetry(() => import('@/pages/librarian/DesignLibrarianDashboard'));
export const LabTechnicianDashboard = lazyWithRetry(() => import('@/pages/lab-technician/DesignLabDashboard'));
export const ClinicianDashboard = lazyWithRetry(() => import('@/pages/clinician/DesignClinicDashboard'));
export const HeadTeacherDashboard = lazyWithRetry(() => import('@/pages/head-teacher/Dashboard'));
export const HeadTeacherProfilePage = lazyWithRetry(() => import('@/pages/head-teacher/ProfilePage'));
export const DosDashboard = lazyWithRetry(() => import('@/pages/dos/DosDashboard'));
export const SecretaryDashboard = lazyWithRetry(() => import('@/pages/secretary/SecretaryDashboard'));
export const SecretaryVisitorLogPage = lazyWithRetry(() => import('@/pages/secretary/VisitorLogPage'));
export const SecretaryAdmissionFormPage = lazyWithRetry(() => import('@/pages/secretary/AdmissionFormPage'));
export const SecretaryStaffDirectoryPage = lazyWithRetry(() => import('@/pages/secretary/StaffDirectoryPage'));
export const OwnerDashboard = lazyWithRetry(() => import('@/pages/owner/Dashboard'));
export const LibraryPage = lazyWithRetry(() => import('@/pages/Library'));
export const JobsPage = lazyWithRetry(() => import('@/pages/Jobs'));
export const AffiliatePage = lazyWithRetry(() => import('@/pages/Affiliate'));
export const AffiliatePortalPage = lazyWithRetry(() => import('@/pages/AffiliatePortal'));
export const ContactPage = lazyWithRetry(() => import('@/pages/Contact'));
export const HelpCenterPage = lazyWithRetry(() => import('@/pages/HelpCenter'));
export const ForgotPasswordPage = lazyWithRetry(() => import('@/pages/auth/ForgotPassword'));
export const AuthCallbackPage = lazyWithRetry(() => import('@/pages/auth/Callback'));
export const UpdatePasswordPage = lazyWithRetry(() => import('@/pages/auth/UpdatePassword'));
export const RecoveryCodePage = lazyWithRetry(() => import('@/pages/auth/RecoveryCode'));
export const PrivacyPolicyPage = lazyWithRetry(() => import('@/pages/PrivacyPolicy'));
export const SecurityLetterPage = lazyWithRetry(() => import('@/pages/SecurityLetter'));
export const AffiliateTermsPage = lazyWithRetry(() => import('@/pages/AffiliateTerms'));
export const HeritagePdfPrintPage = lazyWithRetry(() => import('@/pages/print/HeritagePdfPrintPage'));
export const PrintStudentRedirect = lazyWithRetry(() => import('@/pages/print/PrintStudentRedirect'));
export const PrintClassRedirect = lazyWithRetry(() => import('@/pages/print/PrintClassRedirect'));
export const DownloadAppsPage = lazyWithRetry(() => import('@/pages/DownloadApps'));

/** Report generator entry uses internal lazy; keep one import path for the route module. */
export const ReportGeneratorEntryPage = lazyWithRetry(() => import('@/pages/admin/reports/ReportGeneratorEntryPage'));
export const RolePickerPage = lazyWithRetry(() => import('@/pages/auth/RolePickerPage'));
