import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Owner Dashboard</h1>
      <p className="text-muted-foreground">School ownership and settings</p>
      <GlassPanel className="p-6">
        <GlassCard title="School" subtitle="Ownership and billing">
          <p className="text-muted-foreground">Under migration. Use the legacy app for now.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
