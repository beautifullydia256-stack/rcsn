import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogRow {
  log_id: string;
  teacher_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  check_in_distance_m: number | null;
  check_in_accuracy_m: number | null;
}

interface TeacherRow {
  teacher_id: string;
  name: string;
  employee_id: string | null;
  department: string | null;
}

interface SchoolTerm {
  id: string;
  school_id: string;
  year: number;
  term: number;
  start_date: string;
  end_date: string;
  is_current?: boolean;
  is_closed?: boolean;
}

const EAT = 'Africa/Kampala'; // UTC+3, no DST

// Supabase returns `timestamp without time zone` columns without a tz marker.
// Those values were stored as new Date().toISOString() on the server (UTC), so
// we must force UTC interpretation to avoid the browser treating them as local time.
function normUtc(iso: string): string {
  return /[Z+]/.test(iso) ? iso : iso + 'Z';
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(normUtc(iso)).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: EAT });
  } catch {
    // Manual EAT (+3h) fallback when Intl timezone data unavailable
    const eat = new Date(new Date(normUtc(iso)).getTime() + 3 * 60 * 60 * 1000);
    return eat.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00Z').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: EAT });
  } catch {
    return d;
  }
}

function duration(pIn: string | null, pOut: string | null): string {
  if (!pIn || !pOut) return '—';
  const diff = new Date(normUtc(pOut)).getTime() - new Date(normUtc(pIn)).getTime();
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function statusChip(status: string) {
  const map: Record<string, string> = {
    present: 'bg-green-900/40 text-green-300 border border-green-700',
    late: 'bg-amber-900/40 text-amber-300 border border-amber-700',
    absent: 'bg-red-900/40 text-red-300 border border-red-700',
  };
  return map[status] ?? 'bg-slate-700 text-slate-300';
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function isWorkingDay(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
  return dow >= 1 && dow <= 5;
}

function quickRange(preset: 'today' | 'this_week' | 'last_week' | 'this_month'): { start: string; end: string } {
  const now = new Date();
  if (preset === 'today') {
    const d = todayStr();
    return { start: d, end: d };
  }
  if (preset === 'this_week') {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
  }
  if (preset === 'last_week') {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

async function fetchTerms(schoolId: string): Promise<SchoolTerm[]> {
  const { data } = await supabase
    .from('school_terms')
    .select('*')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true });
  return (data as SchoolTerm[]) ?? [];
}

async function fetchTeacherAttendanceData(schoolId: string, startDate: string, endDate: string) {
  const [{ data: teachers }, { data: logs }] = await Promise.all([
    supabase
      .from('teachers')
      .select('teacher_id, name, employee_id, department')
      .eq('school_id', schoolId)
      .order('name'),
    supabase
      .from('teacher_attendance_logs')
      .select('log_id, teacher_id, attendance_date, check_in_time, check_out_time, status, check_in_distance_m, check_in_accuracy_m')
      .eq('school_id', schoolId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false }),
  ]);
  return {
    teachers: (teachers as TeacherRow[]) ?? [],
    logs: (logs as LogRow[]) ?? [],
  };
}

const QUICK_BTNS = [
  { label: 'Today', preset: 'today' },
  { label: 'This Week', preset: 'this_week' },
  { label: 'Last Week', preset: 'last_week' },
  { label: 'This Month', preset: 'this_month' },
] as const;

export default function TeacherAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const [filterMode, setFilterMode] = useState<'term' | 'custom'>('custom');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [customStart, setCustomStart] = useState(todayStr());
  const [customEnd, setCustomEnd] = useState(todayStr());
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');

  const { data: terms = [] } = useQuery({
    queryKey: ['school-terms', schoolId],
    queryFn: () => fetchTerms(schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const availableYears = useMemo(() =>
    [...new Set(terms.map((t) => t.year))].sort((a, b) => b - a),
    [terms]
  );

  const termsForYear = useMemo(() =>
    terms.filter((t) => t.year === selectedYear),
    [terms, selectedYear]
  );

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === 'term' && selectedTerm) {
      const t = terms.find((t) => t.id === selectedTerm);
      if (t) return { startDate: t.start_date, endDate: t.end_date };
    }
    if (filterMode === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: '', endDate: '' };
  }, [filterMode, selectedTerm, customStart, customEnd, terms]);

  const canFetch = !!schoolId && !!startDate && !!endDate;

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-attendance', schoolId, startDate, endDate],
    queryFn: () => fetchTeacherAttendanceData(schoolId!, startDate, endDate),
    enabled: canFetch,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const teachers = data?.teachers ?? [];
  const logs = data?.logs ?? [];

  const filteredTeachers = useMemo(() =>
    teachers.filter((t) => t.name.toLowerCase().includes(teacherSearch.toLowerCase())),
    [teachers, teacherSearch]
  );

  const logsByTeacher = useMemo(() => {
    const m = new Map<string, LogRow[]>();
    logs.forEach((l) => {
      if (!m.has(l.teacher_id)) m.set(l.teacher_id, []);
      m.get(l.teacher_id)!.push(l);
    });
    return m;
  }, [logs]);

  const visibleLogs = useMemo(() => {
    if (selectedTeacher === 'all') return logs;
    return logs.filter((l) => l.teacher_id === selectedTeacher);
  }, [logs, selectedTeacher]);

  const teacherMap = useMemo(() => {
    const m = new Map<string, TeacherRow>();
    teachers.forEach((t) => m.set(t.teacher_id, t));
    return m;
  }, [teachers]);

  const isSingleDay = startDate === endDate;

  const summaryByTeacher = useMemo(() =>
    teachers.map((t) => {
      const tLogs = logsByTeacher.get(t.teacher_id) ?? [];
      return {
        ...t,
        hasRecord: tLogs.length > 0,
        daysAttended: tLogs.filter((l) => !!l.check_in_time).length,
      };
    }), [teachers, logsByTeacher]
  );

  function applyQuick(preset: typeof QUICK_BTNS[number]['preset']) {
    const { start, end } = quickRange(preset);
    setCustomStart(start);
    setCustomEnd(end);
    setFilterMode('custom');
  }

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = selectedTeacher === 'all'
      ? 'Teacher Attendance Report'
      : `Teacher Attendance — ${teacherMap.get(selectedTeacher)?.name ?? ''}`;

    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 22);

    const rows = visibleLogs.map((l) => [
      teacherMap.get(l.teacher_id)?.name ?? l.teacher_id,
      teacherMap.get(l.teacher_id)?.employee_id ?? '—',
      formatDate(l.attendance_date),
      formatTime(l.check_in_time),
      formatTime(l.check_out_time),
      duration(l.check_in_time, l.check_out_time),
      l.status.charAt(0).toUpperCase() + l.status.slice(1),
      l.check_in_distance_m != null ? `${l.check_in_distance_m}m` : '—',
    ]);

    autoTable(doc, {
      head: [['Teacher', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Duration', 'Status', 'Distance']],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 142, 247] },
    });

    doc.save(`teacher-attendance-${startDate}-to-${endDate}.pdf`);
  }

  return (
    <AdminPageWrapper
      eyebrow="ATTENDANCE"
      title="Teacher Attendance"
      subtitle="Punch in/out records for all teaching staff · auto-refreshes every 30s"
    >
      {/* Filters */}
      <div className={`${adminCardClass} mb-6`}>
        <div className="flex flex-wrap gap-4 items-end p-4">

          {/* Filter mode toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter By</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => setFilterMode('term')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'term' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Term / Year
              </button>
              <button
                onClick={() => setFilterMode('custom')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {filterMode === 'term' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedTerm(''); }}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
                >
                  {availableYears.length === 0
                    ? <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                    : availableYears.map((y) => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Select Term —</option>
                  {termsForYear.map((t) => (
                    <option key={t.id} value={t.id}>
                      Term {t.term}{t.is_current ? ' (Current)' : ''}{t.is_closed ? ' (Closed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Filters</label>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_BTNS.map(({ label, preset }) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyQuick(preset)}
                      className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-indigo-600 text-slate-200 rounded-lg transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* Teacher filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={downloadPdf}
            disabled={visibleLogs.length === 0}
            className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      {selectedTeacher === 'all' && (
        <div className={`${adminCardClass} mb-6`}>
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-300">Staff Summary</span>
              <input
                type="text"
                placeholder="Search teacher…"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm w-48"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left pb-2 pr-4">Teacher</th>
                    <th className="text-center pb-2 pr-4">Presence</th>
                    {!isSingleDay && <th className="text-center pb-2">Days Attended</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-500">Loading…</td></tr>
                  ) : !canFetch ? (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-500">Select a term or date range to view attendance.</td></tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-500">No teachers found</td></tr>
                  ) : (
                    filteredTeachers.map((t) => {
                      const s = summaryByTeacher.find((x) => x.teacher_id === t.teacher_id);
                      const isWeekend = isSingleDay && !isWorkingDay(startDate);
                      return (
                        <tr
                          key={t.teacher_id}
                          className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => setSelectedTeacher(t.teacher_id)}
                        >
                          <td className="py-2 pr-4 font-medium text-slate-100">{t.name}</td>
                          <td className="py-2 pr-4 text-center">
                            {isWeekend ? (
                              <span className="text-slate-500">—</span>
                            ) : s?.hasRecord ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/40 text-green-300 border border-green-700">Present</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700">Absent</span>
                            )}
                          </td>
                          {!isSingleDay && (
                            <td className="py-2 text-center text-slate-300">{s?.daysAttended ?? 0} days</td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Log table */}
      <div className={adminCardClass}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-slate-300">
            {selectedTeacher === 'all' ? 'All Punch Records' : `${teacherMap.get(selectedTeacher)?.name ?? ''} — Punch Records`}
          </span>
          {selectedTeacher !== 'all' && (
            <button onClick={() => setSelectedTeacher('all')} className="text-xs text-slate-400 hover:text-slate-200 underline">
              ← Back to all
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                {selectedTeacher === 'all' && <th className="text-left px-4 pb-2">Teacher</th>}
                <th className="text-left px-4 pb-2">Date</th>
                <th className="text-center px-4 pb-2">Check In</th>
                <th className="text-center px-4 pb-2">Check Out</th>
                <th className="text-center px-4 pb-2">Duration</th>
                <th className="text-center px-4 pb-2">Status</th>
                <th className="text-center px-4 pb-2">Distance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading…</td></tr>
              ) : !canFetch ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">Select a term or date range to view records.</td></tr>
              ) : visibleLogs.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">No attendance records found for this period.</td></tr>
              ) : (
                visibleLogs.map((l) => (
                  <tr key={l.log_id} className="border-b border-slate-800 hover:bg-slate-800/40">
                    {selectedTeacher === 'all' && (
                      <td className="px-4 py-3 font-medium text-slate-100">{teacherMap.get(l.teacher_id)?.name ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 text-slate-300">{formatDate(l.attendance_date)}</td>
                    <td className="px-4 py-3 text-center text-green-400 font-mono">{formatTime(l.check_in_time)}</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">{formatTime(l.check_out_time)}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{duration(l.check_in_time, l.check_out_time)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusChip(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs font-mono">
                      {l.check_in_distance_m != null ? `${l.check_in_distance_m}m` : '—'}
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
