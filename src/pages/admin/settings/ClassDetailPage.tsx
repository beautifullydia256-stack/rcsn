import { useNavigate, useParams } from 'react-router-dom';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

export default function ClassDetailPage() {
  const navigate = useNavigate();
  const { className } = useParams<{ className: string }>();

  return (
    <AdminPageWrapper
      title={className ? `Class: ${decodeURIComponent(className)}` : 'Class'}
      subtitle="Manage class settings"
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings/classes')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Classes
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Settings
        </button>
      </div>
      <div className={`${adminCardClass} text-center py-12`}>
        <p className="text-white/85">Class settings for this class. Configure class teacher and other options here.</p>
      </div>
    </AdminPageWrapper>
  );
}
