import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchAttendance(userId: string, date: string) {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [] as any[];
  const { data: att } = await supabase
    .from('student_attendance')
    .select('student_id, class_name, date, present')
    .eq('school_id', data.school_id)
    .eq('date', date)
    .order('class_name')
    .order('date', { ascending: false });
  return att || [];
}

export default function AttendanceRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'attendance', user?.id ?? '', date],
    queryFn: () => fetchAttendance(user!.id, date),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  return (
    <AdminPageWrapper title="Attendance Records" subtitle="View and manage student attendance by date">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
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
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white backdrop-blur-xl overflow-hidden">
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={4} className="px-4 py-3"><div className="h-5 rounded bg-white/15 animate-pulse" /></td>
                  </tr>
                ))
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
