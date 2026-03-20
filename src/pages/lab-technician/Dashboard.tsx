import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

/** Matches New Designs: pwezacore-lab-technician-dashboard — expand with labs & equipment. */
export default function LabTechnicianDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Lab technician</h1>
      <p className="text-muted-foreground">Science labs, equipment, and practical sessions for your school.</p>
      <GlassPanel className="p-6">
        <GlassCard title="Laboratory" subtitle="Equipment & schedules">
          <p className="text-muted-foreground">Your lab tools and school-specific workflows will appear here.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
