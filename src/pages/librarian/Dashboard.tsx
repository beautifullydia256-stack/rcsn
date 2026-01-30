import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function LibrarianDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Librarian Dashboard</h1>
      <p className="text-muted-foreground">Manage library and books</p>
      <GlassPanel className="p-6">
        <GlassCard title="Library" subtitle="Books and loans">
          <p className="text-muted-foreground">Under migration. Use the legacy app for now.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
