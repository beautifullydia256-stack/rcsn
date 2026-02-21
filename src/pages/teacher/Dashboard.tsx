import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Teacher Dashboard</h1>
        <p className="ac-text-secondary mt-1">Manage your classes and students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          className="ac-glass-card p-6 text-left border border-[var(--ac-border)] hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard/teacher/classes')}
        >
          <h3 className="ac-text-primary text-lg font-medium mb-1">My Classes</h3>
          <p className="ac-text-muted text-sm mb-3">Assigned classes</p>
          <p className="text-2xl font-bold ac-text-primary">—</p>
        </button>
        <button
          type="button"
          className="ac-glass-card p-6 text-left border border-[var(--ac-border)] hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard/teacher/students')}
        >
          <h3 className="ac-text-primary text-lg font-medium mb-1">Students</h3>
          <p className="ac-text-muted text-sm mb-3">Total students</p>
          <p className="text-2xl font-bold ac-text-primary">—</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/exam-results')}
        >
          Exam Results
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/attendance')}
        >
          Attendance
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/timetable')}
        >
          Timetable
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/settings')}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
