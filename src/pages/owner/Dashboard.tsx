import { Routes, Route } from 'react-router-dom';
import OwnerDashboardLayout from '../../components/layout/OwnerDashboardLayout';
import DashboardHome from './DashboardHome';
import SchoolsManagement from './SchoolsManagement';
import UsersManagement from './UsersManagement';
import FinanceManagement from './FinanceManagement';
import SystemHealth from './SystemHealth';
import ContentManagement from './ContentManagement';
import PlatformSettings from './PlatformSettings';

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
        
        {/* Notifications placeholder */}
        <Route path="notifications" element={
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-4">Notifications</h1>
            <div className="bg-slate-800/50 rounded-lg p-6 text-center text-slate-400">
              🔔 Notifications interface will be implemented in Phase 5
            </div>
          </div>
        } />
      </Routes>
    </OwnerDashboardLayout>
  );
}
