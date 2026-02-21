import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function HeadTeacherDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Head Teacher Dashboard</h1>
      <p className="text-muted-foreground">School overview and approvals</p>
      <GlassPanel className="p-6">
        <GlassCard title="Overview" subtitle="School summary">
          <p className="text-muted-foreground">Head teacher dashboard and oversight tools.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
