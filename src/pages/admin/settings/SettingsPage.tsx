import { useNavigate } from 'react-router-dom';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <AdminPageWrapper title="Settings">
      <div className="flex items-center justify-end">
        <button type="button" className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white/85 hover:bg-white/5" onClick={() => navigate('/dashboard/admin')}>Back to Dashboard</button>
      </div>
      <div className={`${adminCardClass} text-center text-white/70`}>
        <p>School settings are under migration. Use the legacy admin for now.</p>
      </div>
    </AdminPageWrapper>
  );
}
