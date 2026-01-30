import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

export default function AttendanceRecordsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) return;
      setSchoolId(data.school_id);
      const { data: att } = await supabase
        .from('student_attendance')
        .select('student_id, class_name, date, present')
        .eq('school_id', data.school_id)
        .eq('date', date)
        .order('class_name')
        .order('date', { ascending: false });
      setRows(att || []);
      setLoading(false);
    };
    run();
  }, [user, date]);

  return (
    <AdminPageWrapper title="Attendance Records" subtitle="View and manage student attendance by date">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-white/85">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/5 text-left">
                <th className="px-4 py-2 font-medium text-white/85">Student ID</th>
                <th className="px-4 py-2 font-medium text-white/85">Class</th>
                <th className="px-4 py-2 font-medium text-white/85">Date</th>
                <th className="px-4 py-2 font-medium text-white/85">Present</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/70">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/70">No attendance records for this date.</td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.student_id}-${r.date}-${i}`} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-4 py-2 text-white">{r.student_id}</td>
                    <td className="px-4 py-2 text-white/90">{r.class_name}</td>
                    <td className="px-4 py-2 text-white/90">{r.date}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${r.present ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'}`}>
                        {r.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
