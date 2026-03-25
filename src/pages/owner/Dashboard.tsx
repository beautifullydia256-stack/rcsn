import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Owner Dashboard</h1>
      <p className="text-muted-foreground">School ownership and settings</p>
      <Link
        to="/dashboard/admin/messages"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
      >
        <MessageCircle className="h-4 w-4" />
        Open school messages
      </Link>
      <GlassPanel className="p-6">
        <GlassCard title="School" subtitle="Ownership and billing">
          <p className="text-muted-foreground">School owner dashboard and settings.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
