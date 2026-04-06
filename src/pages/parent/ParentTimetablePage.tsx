import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';
import { useParentPortal } from '@/context/ParentPortalContext';
import { displayStudentName } from '@/lib/parentPortalUtils';

type Row = {
  start_time: string | null;
  end_time: string | null;
  subject: string | null;
  day_of_week: string | null;
  teacherName: string;
};

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export default function ParentTimetablePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const className = child?.current_class ? String(child.current_class) : '';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !child || !className) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('timetable_periods')
        .select('start_time, end_time, subject, teacher_id, day_of_week')
        .eq('school_id', schoolId)
        .eq('class_name', className)
        .order('day_of_week')
        .order('start_time');
      if (cancelled) return;
      const list = (data || []) as {
        start_time?: string;
        end_time?: string;
        subject?: string;
        teacher_id?: string | null;
        day_of_week?: string | null;
      }[];
      const tids = [...new Set(list.map((t) => t.teacher_id).filter(Boolean))] as string[];
      let tmap: Record<string, string> = {};
      if (tids.length) {
        const { data: th } = await supabase
          .from('teachers')
          .select('teacher_id, name')
          .eq('school_id', schoolId)
          .in('teacher_id', tids);
        for (const t of th || []) {
          const r = t as { teacher_id: string; name?: string };
          tmap[r.teacher_id] = r.name || '';
        }
      }
      if (cancelled) return;
      setRows(
        list.map((p) => ({
          start_time: p.start_time ?? null,
          end_time: p.end_time ?? null,
          subject: p.subject ?? null,
          day_of_week: p.day_of_week ?? null,
          teacherName: p.teacher_id ? tmap[p.teacher_id] || '—' : '—',
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, child?.student_id, className]);

  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const d = r.day_of_week || 'Other';
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return [...m.entries()].sort((a, b) => (DAY_ORDER[a[0]] || 99) - (DAY_ORDER[b[0]] || 99));
  }, [rows]);

  return (
    <ParentPageScaffold
      title="Timetable"
      description={
        child && className
          ? `Weekly schedule for ${displayStudentName(child)} (${className}).`
          : 'Link a student with a class to view the timetable.'
      }
    >
      {!child || !className ? null : loading ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>Loading timetable…</div>
      ) : byDay.length === 0 ? (
        <div className={`${parentPortal.cardMuted} text-[#b0bdd8] text-sm`}>No periods published yet.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {byDay.map(([day, periods]) => (
            <div key={day} className={parentPortal.card}>
              <h2 className="text-base font-semibold text-[#ff6b6b] mb-3">{day}</h2>
              <ul className="space-y-2">
                {periods.map((p, i) => (
                  <li
                    key={`${day}-${String(p.start_time)}-${i}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-white/[0.06] last:border-0"
                  >
                    <span className="text-sm text-[#e8eeff] font-medium">{p.subject || '—'}</span>
                    <span className="text-xs text-[#b0bdd8]">
                      {String(p.start_time || '').slice(0, 5)}–{String(p.end_time || '').slice(0, 5)} ·{' '}
                      {p.teacherName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ParentPageScaffold>
  );
}
