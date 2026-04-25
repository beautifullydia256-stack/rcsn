import { Routes, Route } from 'react-router-dom';

// Placeholder components for platform settings
const PlatformSettingsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Platform Settings</h1>
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <p className="text-gray-600">Platform settings configuration interface will be implemented here.</p>
    </div>
  </div>
);

const BillingPlansPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Billing Plans</h1>
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <p className="text-gray-600">Billing plans management interface will be implemented here.</p>
    </div>
  </div>
);

const SecurityPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Security Settings</h1>
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <p className="text-gray-600">Security settings configuration interface will be implemented here.</p>
    </div>
  </div>
);

const BackupRecoveryPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Backup & Recovery</h1>
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <p className="text-gray-600">Backup and recovery management interface will be implemented here.</p>
    </div>
  </div>
);

export default function PlatformSettings() {
  return (
    <Routes>
      <Route path="platform" element={<PlatformSettingsPage />} />
      <Route path="billing" element={<BillingPlansPage />} />
      <Route path="security" element={<SecurityPage />} />
      <Route path="backup" element={<BackupRecoveryPage />} />
      <Route index element={<PlatformSettingsPage />} />
    </Routes>
  );
}