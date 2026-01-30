import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function ParentDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
      <p className="text-muted-foreground">View your children&apos;s progress and fees</p>
      <GlassPanel className="p-6">
        <GlassCard title="My Children" subtitle="Linked students">
          <p className="text-muted-foreground">Under migration. Use the legacy app for now.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
