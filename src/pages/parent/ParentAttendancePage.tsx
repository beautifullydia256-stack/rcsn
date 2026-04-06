import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';

export default function ParentAttendancePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const [pct, setPct] = useState<number | null>(null);
  const [dayCounts, setDayCounts] = useState<{ present: number; total: number } | null>(null);
  const [recent, setRecent] = useState<{ date: string; present: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !child) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: all } = await supabase
        .from('student_attendance')
        .select('attendance_date, date, present, status')
        .eq('school_id', schoolId)
        .eq('student_id', child.student_id)
        .order('attendance_date', { ascending: false })
        .limit(120);
      if (cancelled) return;
      const list = (all || []) as {
        attendance_date?: string | null;
        date?: string | null;
        present?: boolean | null;
        status?: string | null;
      }[];
      const rowDayKey = (a: (typeof list)[0]) =>
        String(a.attendance_date || a.date || '').trim();
      const days = list.filter((a) => {
        const k = rowDayKey(a);
        if (!k) return false;
        const s = String(a.status || '').toLowerCase();
        return typeof a.present === 'boolean' || s === 'present' || s === 'absent' || s === 'late' || s === 'excused';
      });
      const pr = days.filter((a) => studentAttendanceRowIsPresent(a)).length;
      setPct(days.length ? Math.round((pr / days.length) * 100) : null);
      setDayCounts(days.length ? { present: pr, total: days.length } : null);
      setRecent(
        list.slice(0, 20).map((a) => ({
          date: rowDayKey(a) || '—',
          present: studentAttendanceRowIsPresent(a),
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, child?.student_id]);

  return (
    <ParentPageScaffold
      title="Attendance"
      description={
        child
          ? `Attendance picture for ${displayStudentName(child)}. Percentages are based on days recorded in the register.`
          : 'Link a student to view attendance.'
      }
    >
      {!child ? null : loading ? (
        <div className={`${parentPortal.cardMuted} text-[#7c89b0] text-sm`}>Loading attendance…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className={parentPortal.card}>
              <div className={parentPortal.label}>Presence rate</div>
              <p className={`${parentPortal.statVal} mt-2`}>{pct != null ? `${pct}%` : '—'}</p>
              <p className="text-xs text-[#7c89b0] mt-1">
                {dayCounts
                  ? `${dayCounts.present} present of ${dayCounts.total} recorded days (${pct}%)`
                  : 'From recent recorded days'}
              </p>
            </div>
          </div>
          <div className={parentPortal.card}>
            <div className={parentPortal.label}>Recent days</div>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-[#7c89b0]">No attendance records yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {recent.map((r) => (
                  <li key={r.date} className="flex justify-between py-2.5 text-sm">
                    <span className="text-[#e8eeff]">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('en-UG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={r.present ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {r.present ? 'Present' : 'Absent'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </ParentPageScaffold>
  );
}
