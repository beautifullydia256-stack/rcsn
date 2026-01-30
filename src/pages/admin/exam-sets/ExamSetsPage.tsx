import { useNavigate } from 'react-router-dom';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function ExamSetsPage() {
  const navigate = useNavigate();
  return (
    <AdminPageWrapper title="Exam Sets">
      <div className="flex items-center justify-end">
        <button type="button" className="rounded-lg border border-gray-600 bg-[#1e293b] px-3 py-2 text-sm text-gray-200 hover:bg-white/5" onClick={() => navigate('/dashboard/admin')}>Back to Dashboard</button>
      </div>
      <div className={`${adminCardClass} text-center text-gray-400`}>
        <p>Exam sets management is under migration. Use the legacy admin for now.</p>
      </div>
    </AdminPageWrapper>
  );
}
