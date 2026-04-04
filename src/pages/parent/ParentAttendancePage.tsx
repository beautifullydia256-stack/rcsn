import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

export default function ParentAttendancePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const [pct, setPct] = useState<number | null>(null);
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
        .select('date, present')
        .eq('school_id', schoolId)
        .eq('student_id', child.student_id)
        .order('date', { ascending: false })
        .limit(120);
      if (cancelled) return;
      const list = (all || []) as { date: string; present: boolean | null }[];
      const days = list.filter((a) => a.present === true || a.present === false);
      const pr = days.filter((a) => a.present === true).length;
      setPct(days.length ? Math.round((pr / days.length) * 100) : null);
      setRecent(
        list.slice(0, 20).map((a) => ({ date: a.date, present: a.present === true }))
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
              <p className="text-xs text-[#7c89b0] mt-1">From recent recorded days</p>
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
