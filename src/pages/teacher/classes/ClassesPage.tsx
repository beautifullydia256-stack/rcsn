import { useNavigate } from 'react-router-dom';

export default function TeacherClassesPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">My Classes</h1>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher')}
        >
          Back
        </button>
      </div>
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <p className="ac-text-muted text-center">Classes are under migration. Use the legacy teacher dashboard for now.</p>
      </div>
    </div>
  );
}
