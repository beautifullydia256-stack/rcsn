import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function AccountantDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Accountant Dashboard</h1>
      <p className="text-muted-foreground">Manage fees and payments</p>
      <GlassPanel className="p-6">
        <GlassCard title="Finance" subtitle="Fees and receipts">
          <p className="text-muted-foreground">Under migration. Use the legacy app for now.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
