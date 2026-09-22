import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  Calendar,
  ArrowLeft,
  Clock,
  BookOpen,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ParentTimetablePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const className = child?.current_class ? String(child.current_class) : '';

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>('Monday');

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
        for (const te of th || []) {
          const r = te as { teacher_id: string; name?: string };
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

  // Group periods by day
  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const d = r.day_of_week || 'Monday';
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return m;
  }, [rows]);

  const activePeriods = byDay.get(activeDay) || [];

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mb-2"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.12)',
                  color: t.gold,
                  fontFamily: SORA,
                }}
              >
                CLASS SCHEDULE & PERIODS
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Weekly Class Timetable
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Lesson periods, subject schedules, and teaching faculty for{' '}
              <span className="font-semibold" style={{ color: t.mint }}>
                {child ? displayStudentName(child) : 'your child'}
              </span>
              {className ? ` (${className})` : ''}.
            </p>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div
        className="p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-sm"
        style={{
          backgroundColor: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        {DAYS.map((day) => {
          const isSelected = activeDay === day;
          const count = (byDay.get(day) || []).length;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
              style={{
                backgroundColor: isSelected
                  ? isDark
                    ? 'rgba(255,255,255,0.12)'
                    : '#ffffff'
                  : 'transparent',
                color: isSelected ? t.textHi : t.textLow,
                boxShadow: isSelected && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span>{day}</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px]"
                style={{
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(16,217,168,0.2)'
                      : 'rgba(16,185,129,0.15)'
                    : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                  color: isSelected ? t.mint : t.textLow,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Periods Timeline */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              {activeDay} Daily Schedule
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textLow }}>
            {activePeriods.length} Lesson Periods
          </span>
        </div>

        {!child || !className ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            Please link a student with an active class to view the timetable.
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Loading timetable...
          </div>
        ) : activePeriods.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No periods published for {activeDay} yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activePeriods.map((p, idx) => {
              const start = String(p.start_time || '').slice(0, 5);
              const end = String(p.end_time || '').slice(0, 5);

              return (
                <div
                  key={`${activeDay}-${start}-${idx}`}
                  className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:scale-[1.005]"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.1)',
                        color: t.gold,
                      }}
                    >
                      P{idx + 1}
                    </div>

                    <div>
                      <div className="text-sm font-bold" style={{ color: t.textHi }}>
                        {p.subject || 'Lesson Period'}
                      </div>
                      <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: t.textMid }}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{p.teacherName}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center font-mono text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: t.textHi }}>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{start} – {end}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
