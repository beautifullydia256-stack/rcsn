import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

/** Matches New Designs: pwezacore-clinician-dashboard — expand with health room / visits. */
export default function ClinicianDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">School clinician</h1>
      <p className="text-muted-foreground">Student health, first aid, and medical notes for your school.</p>
      <GlassPanel className="p-6">
        <GlassCard title="Health desk" subtitle="Records & follow-up">
          <p className="text-muted-foreground">Clinic workflows for your school will appear here.</p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
}
