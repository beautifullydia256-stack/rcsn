import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/Glass/GlassCard';

export default function StudentDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
      <p className="text-muted-foreground">View your results and fees</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard title="My Results" subtitle="Latest exam results">
          <p className="text-muted-foreground">No results available</p>
        </GlassCard>
        <button type="button" className="text-left" onClick={() => navigate('/dashboard/student/fees')}>
          <GlassCard title="My Fees" subtitle="Fees and payments">
            <p className="text-muted-foreground">View fees</p>
          </GlassCard>
        </button>
      </div>
    </div>
  );
}




