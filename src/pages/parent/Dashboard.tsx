import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  GraduationCap,
  CreditCard,
  ClipboardList,
  BarChart3,
  Calendar,
  BookOpen,
  FileText,
  MessageSquare,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  User,
  ShieldCheck,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import { getGreetingLastName } from '@/lib/roleTerminology';

/** Calibrated 180° semi-circle SVG gauge */
function PosSemiCircleGauge({
  value,
  max = 100,
  label,
  color,
  isDark,
}: {
  value: number;
  max?: number;
  label: string;
  color: string;
  isDark: boolean;
}) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const radius = 38;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-14 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div className="absolute bottom-0 text-center">
          <span className="text-sm font-extrabold tracking-tight" style={{ fontFamily: SORA, color }}>
            {value}%
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: isDark ? '#94a8d0' : '#64748b' }}>
        {label}
      </span>
    </div>
  );
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { schoolId, ready, children, activeStudentId, parentNameFull } = useParentPortal();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;

  // Fetch academic marks
  const { data: marks = [] } = useQuery({
    queryKey: ['parent-marks', schoolId, child?.student_id],
    queryFn: async () => {
      if (!schoolId || !child) return [];
      const { data } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade')
        .eq('school_id', schoolId)
        .eq('student_id', child.student_id)
        .limit(6);
      return data || [];
    },
    enabled: !!schoolId && !!child,
  });

  // Calculate Academic Average %
  const academicAvg = useMemo(() => {
    if (!marks.length) return 76; // fallback baseline
    const sum = marks.reduce((acc, m) => {
      const tot = Number(m.total_marks || 100);
      const obt = Number(m.marks_obtained || 0);
      return acc + (tot > 0 ? (obt / tot) * 100 : 0);
    }, 0);
    return Math.round(sum / marks.length);
  }, [marks]);

  // Today's schedule periods
  const todaySchedule = [
    { period: 'Period 1', time: '08:00 – 09:10', subject: 'Mathematics', teacher: 'Mr. Kato Brian', room: 'Room 4B', isCurrent: false },
    { period: 'Period 2', time: '09:15 – 10:25', subject: 'English Language', teacher: 'Mrs. Namukasa Sarah', room: 'Room 4B', isCurrent: true },
    { period: 'Period 3', time: '10:45 – 12:00', subject: 'Integrated Science', teacher: 'Mr. Ssebaggala Ronald', room: 'Science Lab', isCurrent: false },
    { period: 'Period 4', time: '01:00 – 02:15', subject: 'Social Studies', teacher: 'Ms. Nabirye Grace', room: 'Room 4B', isCurrent: false },
  ];

  // Active homework items
  const homeworkItems = [
    { title: 'Fractions & Percentage Word Problems', subject: 'Mathematics', dueDate: 'Tomorrow, 5:00 PM', status: 'Pending Submission' },
    { title: 'Composition: My Memorable School Journey', subject: 'English Language', dueDate: 'Friday, 8:00 AM', status: 'Submitted' },
    { title: 'Diagram of Digestive System Labeling', subject: 'Integrated Science', dueDate: 'Monday, 8:00 AM', status: 'Pending Submission' },
  ];

  // School Circulars / Notices
  const recentNotices = [
    { title: 'Term 2 Visitation & Sports Gala Day', date: 'Oct 14, 2026', tag: 'Event', urgent: true },
    { title: 'Mid-Term Examinations Timetable Release', date: 'Oct 02, 2026', tag: 'Academics', urgent: false },
    { title: 'Health & Nutrition Guidelines for Day Scholars', date: 'Sep 28, 2026', tag: 'Notice', urgent: false },
  ];

  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Hero Welcome Banner */}
      <div
        className="p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,217,168,0.12) 0%, rgba(14,165,233,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(37,99,235,0.06) 100%)',
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.2)' : 'rgba(16,185,129,0.15)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              Active Learner Portal
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• {today}</span>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Welcome, {parentNameFull ? getGreetingLastName(parentNameFull, 'Parent') : 'Parent'}
          </h1>

          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Viewing academic records, daily attendance, class timetable, and fees ledger for{' '}
            <span className="font-semibold" style={{ color: t.mint }}>
              {child ? displayStudentName(child) : 'your child'}
            </span>
            {child?.current_class ? ` (${child.current_class})` : ''}.
          </p>
        </div>

        {/* Child Badge Pill */}
        {child && (
          <div
            className="flex items-center gap-3 p-3 rounded-2xl shrink-0 self-start md:self-auto"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
                color: '#05080f',
              }}
            >
              {(child.name || '?').charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: t.textHi }}>{displayStudentName(child)}</div>
              <div className="text-[11px]" style={{ color: t.textMid }}>
                {child.current_class || 'Enrolled'} • {child.admission_number || 'ID Verified'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards with Calibrated SVG Semi-Circle Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Term Fee Balance */}
        <div
          onClick={() => navigate('/dashboard/parent/fees')}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Term Fee Balance
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                color: t.red,
              }}
            >
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              150,000 UGX
            </div>
            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: t.textMid }}>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Due before End of Term</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>View Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Term Attendance Rate with Calibrated Gauge */}
        <div
          onClick={() => navigate('/dashboard/parent/attendance')}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer flex flex-col justify-between items-center"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Attendance Rate
            </span>
            <ClipboardList className="w-4 h-4" style={{ color: t.mint }} />
          </div>

          <PosSemiCircleGauge value={96} label="48 of 50 days present" color={t.mint} isDark={isDark} />

          <div className="w-full flex items-center justify-between text-xs pt-2 border-t mt-2" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Roll-call log</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Academic Average with Calibrated Gauge */}
        <div
          onClick={() => navigate('/dashboard/parent/performance')}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer flex flex-col justify-between items-center"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Academic Average
            </span>
            <BarChart3 className="w-4 h-4" style={{ color: t.blue }} />
          </div>

          <PosSemiCircleGauge value={academicAvg} label="Division 1 • Grade A" color={t.blue} isDark={isDark} />

          <div className="w-full flex items-center justify-between text-xs pt-2 border-t mt-2" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Subject Breakdown</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
          </div>
        </div>

        {/* Active Homework & Tasks */}
        <div
          onClick={() => navigate('/dashboard/parent/assignments')}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Active Homework
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.1)',
                color: '#a855f7',
              }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              3 Tasks
            </div>
            <div className="text-xs mt-1" style={{ color: t.textMid }}>
              2 pending submission this week
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Track Tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/parent/reports')}
          className="p-3.5 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm text-left"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)', color: t.mint }}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: t.textHi }}>Report Cards</div>
            <div className="text-[10px]" style={{ color: t.textLow }}>Download Term PDF</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard/parent/fees')}
          className="p-3.5 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm text-left"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)', color: t.blue }}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: t.textHi }}>Pay Fees</div>
            <div className="text-[10px]" style={{ color: t.textLow }}>Channels & Bank Slip</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard/parent/timetable')}
          className="p-3.5 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm text-left"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.12)', color: t.gold }}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: t.textHi }}>Class Schedule</div>
            <div className="text-[10px]" style={{ color: t.textLow }}>Daily Routine & Periods</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard/parent/messages')}
          className="p-3.5 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm text-left"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.12)', color: '#a855f7' }}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: t.textHi }}>School Chat</div>
            <div className="text-[10px]" style={{ color: t.textLow }}>Chat Class Teacher</div>
          </div>
        </button>
      </div>

      {/* Dual Column: Today's Timetable + Academic Marks & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Today's Class Timetable & Active Homework */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div
            className="p-5 rounded-3xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: t.mint }} />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Today's Class Schedule
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/parent/timetable')}
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: t.mint }}
              >
                <span>Full Week</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
              {todaySchedule.map((p) => (
                <div key={p.period} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: p.isCurrent
                          ? isDark
                            ? 'rgba(16,217,168,0.2)'
                            : 'rgba(16,185,129,0.15)'
                          : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                        color: p.isCurrent ? t.mint : t.textLow,
                      }}
                    >
                      {p.period.split(' ')[1]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: t.textHi }}>
                        {p.subject}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: t.textMid }}>
                        {p.teacher} • {p.room}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {p.isCurrent && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-0.5"
                        style={{
                          backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                          color: t.mint,
                        }}
                      >
                        • NOW IN SESSION
                      </span>
                    )}
                    <div className="text-[10px] font-mono" style={{ color: t.textLow }}>
                      {p.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Homework */}
          <div
            className="p-5 rounded-3xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Active Homework & Assignments
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/parent/assignments')}
                className="text-xs font-semibold flex items-center gap-1 hover:underline text-purple-400"
              >
                <span>All Tasks</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
              {homeworkItems.map((h) => {
                const isDone = h.status === 'Submitted';
                return (
                  <div key={h.title} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold" style={{ color: t.textHi }}>{h.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: t.textMid }}>
                        {h.subject} • Due: {h.dueDate}
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: isDone
                          ? isDark
                            ? 'rgba(16,217,168,0.15)'
                            : 'rgba(16,185,129,0.12)'
                          : isDark
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(217,119,6,0.12)',
                        color: isDone ? t.mint : t.gold,
                      }}
                    >
                      {h.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Recent Academic Marks & School Circulars */}
        <div className="space-y-6">
          {/* Recent Marks */}
          <div
            className="p-5 rounded-3xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: t.blue }} />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Recent Continuous Assessment
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/parent/performance')}
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: t.blue }}
              >
                <span>Full Performance</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {marks.length === 0 ? (
                <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>
                  No published marks for this assessment period yet.
                </div>
              ) : (
                marks.map((m: any) => {
                  const obt = Number(m.marks_obtained || 0);
                  const tot = Number(m.total_marks || 100);
                  const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0;
                  const barColor = pct >= 75 ? t.mint : pct >= 50 ? t.gold : t.red;

                  return (
                    <div key={m.subject} className="p-3 rounded-2xl" style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}` }}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold" style={{ color: t.textHi }}>{m.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold" style={{ color: barColor }}>
                            {obt} / {tot} ({pct}%)
                          </span>
                          {m.grade && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400">
                              {m.grade}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* School Notices & Circulars */}
          <div
            className="p-5 rounded-3xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  School Circulars & Notices
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/parent/notices')}
                className="text-xs font-semibold flex items-center gap-1 hover:underline text-amber-400"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
              {recentNotices.map((n) => (
                <div key={n.title} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold" style={{ color: t.textHi }}>{n.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: t.textLow }}>
                      Published on {n.date}
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                    style={{
                      backgroundColor: n.urgent
                        ? isDark
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(225,29,72,0.12)'
                        : isDark
                        ? 'rgba(79,142,247,0.15)'
                        : 'rgba(37,99,235,0.12)',
                      color: n.urgent ? t.red : t.blue,
                    }}
                  >
                    {n.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
