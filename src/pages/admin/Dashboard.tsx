import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';
import { Users, BookOpen, FileText, Settings, ClipboardList, UserPlus, CreditCard, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const links = [
    { to: '/dashboard/admin/students', label: 'Students', subtitle: 'Manage students', icon: Users },
    { to: '/dashboard/admin/teachers', label: 'Teachers', subtitle: 'Manage staff', icon: UserPlus },
    { to: '/dashboard/admin/parents', label: 'Parents', subtitle: 'Parent accounts', icon: Users },
    { to: '/dashboard/admin/accounts', label: 'Accounts', subtitle: 'User accounts', icon: CreditCard },
    { to: '/dashboard/admin/exam-sets', label: 'Exam Sets', subtitle: 'Exams & terms', icon: BookOpen },
    { to: '/dashboard/admin/attendance', label: 'Attendance', subtitle: 'Records', icon: ClipboardList },
    { to: '/dashboard/admin/reports/snapshots', label: 'Report Snapshots', subtitle: 'Create & lock', icon: FileText },
    { to: '/dashboard/admin/reports/bulk', label: 'Bulk Generate', subtitle: 'Generate reports', icon: FileText },
    { to: '/dashboard/admin/reports/viewer', label: 'Report Viewer', subtitle: 'View cached reports', icon: FileText },
    { to: '/dashboard/admin/settings', label: 'Settings', subtitle: 'School settings', icon: Settings },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground">Manage your school operations</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard title="Students" subtitle="Total enrolled">
          <button type="button" className="text-4xl font-bold text-foreground hover:underline" onClick={() => navigate('/dashboard/admin/students')}>—</button>
        </GlassCard>
        <GlassCard title="Teachers" subtitle="Active staff">
          <button type="button" className="text-4xl font-bold text-foreground hover:underline" onClick={() => navigate('/dashboard/admin/teachers')}>—</button>
        </GlassCard>
        <GlassCard title="Classes" subtitle="Active classes">
          <p className="text-4xl font-bold text-foreground">—</p>
        </GlassCard>
        <GlassCard title="Exams" subtitle="This term">
          <button type="button" className="text-4xl font-bold text-foreground hover:underline" onClick={() => navigate('/dashboard/admin/exam-sets')}>—</button>
        </GlassCard>
      </div>

      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map(({ to, label, subtitle, icon: Icon }) => (
            <button
              key={to}
              type="button"
              className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => navigate(to)}
            >
              <Icon className="h-8 w-8 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-sm text-muted-foreground">{subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}




