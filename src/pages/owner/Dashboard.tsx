import { Routes, Route } from 'react-router-dom';
import OwnerDashboardLayout from '../../components/layout/OwnerDashboardLayout';
import DashboardHome from './DashboardHome';
import SchoolsManagement from './SchoolsManagement';
import UsersManagement from './UsersManagement';
import FinanceManagement from './FinanceManagement';
import SystemHealth from './SystemHealth';
import ContentManagement from './ContentManagement';
import PlatformSettings from './PlatformSettings';
import NotificationsPage from './NotificationsPage';
import ReferralCodesPage from './ReferralCodesPage';
import AffiliatesPage from './AffiliatesPage';
import AcademicsPage from './AcademicsPage';
import EducationalLibraryPage from './EducationalLibraryPage';
import WindowsAppPage from './WindowsAppPage';

export default function OwnerDashboard() {
  return (
    <OwnerDashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />

        {/* Schools Routes */}
        <Route path="schools/*" element={<SchoolsManagement />} />

        {/* Users Routes */}
        <Route path="users/*" element={<UsersManagement />} />

        {/* Finance Routes */}
        <Route path="finance/*" element={<FinanceManagement />} />

        {/* System Routes */}
        <Route path="system/*" element={<SystemHealth />} />

        {/* Content Routes */}
        <Route path="content/*" element={<ContentManagement />} />

        {/* Settings Routes */}
        <Route path="settings/*" element={<PlatformSettings />} />

        {/* Notifications */}
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Affiliates */}
        <Route path="affiliates" element={<AffiliatesPage />} />

        {/* Referral Codes */}
        <Route path="referral-codes" element={<ReferralCodesPage />} />

        {/* Academics */}
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="educational-library" element={<EducationalLibraryPage />} />

        {/* Apps */}
        <Route path="windows-app" element={<WindowsAppPage />} />
      </Routes>
    </OwnerDashboardLayout>
  );
}
