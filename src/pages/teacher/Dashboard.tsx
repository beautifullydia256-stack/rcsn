import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/Glass/GlassCard';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Teacher Dashboard</h1>
      <p className="text-muted-foreground">Manage your classes and students</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button type="button" className="text-left" onClick={() => navigate('/dashboard/teacher/classes')}>
          <GlassCard title="My Classes" subtitle="Assigned classes">
            <p className="text-2xl font-bold">—</p>
          </GlassCard>
        </button>
        <button type="button" className="text-left" onClick={() => navigate('/dashboard/teacher/students')}>
          <GlassCard title="Students" subtitle="Total students">
            <p className="text-2xl font-bold">—</p>
          </GlassCard>
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-medium hover:bg-muted/50" onClick={() => navigate('/dashboard/teacher/exam-results')}>Exam Results</button>
        <button type="button" className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-medium hover:bg-muted/50" onClick={() => navigate('/dashboard/teacher/attendance')}>Attendance</button>
        <button type="button" className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-medium hover:bg-muted/50" onClick={() => navigate('/dashboard/teacher/timetable')}>Timetable</button>
        <button type="button" className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-medium hover:bg-muted/50" onClick={() => navigate('/dashboard/teacher/settings')}>Settings</button>
      </div>
    </div>
  );
}




