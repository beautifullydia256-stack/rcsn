import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { studentAttendanceRowIsPresent } from '../../../lib/studentAttendanceRow';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchAttendance(userId: string, date: string) {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [] as any[];
  const { data: att } = await supabase
    .from('student_attendance')
    .select('student_id, class_name, attendance_date, present, status')
    .eq('school_id', data.school_id)
    .eq('attendance_date', date)
    .order('class_name')
    .order('attendance_date', { ascending: false });
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
    <AdminPageWrapper
      eyebrow="Attendance"
      title="Attendance Records"
      subtitle="View and manage student attendance by date"
    >
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium ac-text-primary">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ac-input rounded-xl px-3 py-2"
          />
        </div>
        <div className="ac-table-wrap overflow-hidden rounded-xl border border-[var(--ac-border)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                <th className="px-4 py-3 font-medium ac-text-muted">Student ID</th>
                <th className="px-4 py-3 font-medium ac-text-muted">Class</th>
                <th className="px-4 py-3 font-medium ac-text-muted">Date</th>
                <th className="px-4 py-3 font-medium ac-text-muted">Present</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/60" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ac-text-muted px-4 py-8 text-center">
                    No attendance records for this date.
                  </td>
                </tr>
              ) : (
                rows.map((r: Record<string, unknown>, i) => {
                  const day = (r.attendance_date ?? r.date) as string;
                  const isPresent = studentAttendanceRowIsPresent(
                    r as { present?: boolean | null; status?: string | null }
                  );
                  return (
                    <tr
                      key={`${r.student_id}-${String(day)}-${i}`}
                      className="border-b border-[var(--ac-border)] transition-colors hover:bg-[var(--ac-sidebar-active-bg)]/60"
                    >
                      <td className="ac-text-primary px-4 py-2.5 font-mono text-xs">{String(r.student_id)}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{String(r.class_name ?? '')}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{day}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-lg border px-2 py-1 text-xs font-medium ${
                            isPresent
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : 'border-red-500/35 bg-red-500/10 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
