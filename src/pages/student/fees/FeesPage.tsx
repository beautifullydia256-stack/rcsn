import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '@/components/Glass/GlassPanel';

export default function StudentFeesPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Fees</h1>
        <button type="button" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm hover:bg-muted/80" onClick={() => navigate('/dashboard/student')}>Back</button>
      </div>
      <GlassPanel className="p-6 text-center text-muted-foreground">
        <p>Fees view is under migration. Use the legacy student dashboard for now.</p>
      </GlassPanel>
    </div>
  );
}
