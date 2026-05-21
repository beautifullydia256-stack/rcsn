import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogRow {
  id: string;
  teacher_id: string;
  date: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string;
}

interface TeacherRow {
  teacher_id: string;
  name: string;
  employee_id: string | null;
  department: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso.slice(11, 16);
  }
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function duration(pIn: string | null, pOut: string | null): string {
  if (!pIn || !pOut) return '—';
  const diff = new Date(pOut).getTime() - new Date(pIn).getTime();
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

async function fetchTeacherAttendanceData(schoolId: string, startDate: string, endDate: string) {
  const [{ data: teachers }, { data: logs }] = await Promise.all([
    supabase
      .from('teachers')
      .select('teacher_id, name, employee_id, department')
      .eq('school_id', schoolId)
      .order('name'),
    supabase
      .from('teacher_attendance_log')
      .select('id, teacher_id, date, punch_in_time, punch_out_time, status')
      .eq('school_id', schoolId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false }),
  ]);
  return {
    teachers: (teachers as TeacherRow[]) ?? [],
    logs: (logs as LogRow[]) ?? [],
  };
}

export default function TeacherAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-attendance', schoolId, startDate, endDate],
    queryFn: () => fetchTeacherAttendanceData(schoolId!, startDate, endDate),
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
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
      formatDate(l.date),
      formatTime(l.punch_in_time),
      formatTime(l.punch_out_time),
      duration(l.punch_in_time, l.punch_out_time),
      l.status.charAt(0).toUpperCase() + l.status.slice(1),
    ]);

    autoTable(doc, {
      head: [['Teacher', 'Employee ID', 'Date', 'Punch In', 'Punch Out', 'Duration', 'Status']],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 142, 247] },
    });

    doc.save(`teacher-attendance-${startDate}-to-${endDate}.pdf`);
  }

  const summaryByTeacher = useMemo(() =>
    teachers.map((t) => {
      const tLogs = logsByTeacher.get(t.teacher_id) ?? [];
      return {
        ...t,
        days: tLogs.length,
        late: tLogs.filter((l) => l.status === 'late').length,
        present: tLogs.filter((l) => l.status === 'present').length,
        punchedOut: tLogs.filter((l) => !!l.punch_out_time).length,
      };
    }), [teachers, logsByTeacher]
  );

  return (
    <AdminPageWrapper
      eyebrow="ATTENDANCE"
      title="Teacher Attendance"
      subtitle="Punch in/out records for all teaching staff"
    >
      {/* Filters */}
      <div className={`${adminCardClass} mb-6`}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
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

      {/* Summary cards */}
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
                    <th className="text-center pb-2 pr-4">Days Logged</th>
                    <th className="text-center pb-2 pr-4">Present</th>
                    <th className="text-center pb-2 pr-4">Late</th>
                    <th className="text-center pb-2">Punched Out</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">Loading…</td></tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No teachers found</td></tr>
                  ) : (
                    filteredTeachers.map((t) => {
                      const s = summaryByTeacher.find((x) => x.teacher_id === t.teacher_id);
                      return (
                        <tr
                          key={t.teacher_id}
                          className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => setSelectedTeacher(t.teacher_id)}
                        >
                          <td className="py-2 pr-4 font-medium text-slate-100">{t.name}</td>
                          <td className="py-2 pr-4 text-center text-slate-300">{s?.days ?? 0}</td>
                          <td className="py-2 pr-4 text-center text-green-400">{s?.present ?? 0}</td>
                          <td className="py-2 pr-4 text-center text-amber-400">{s?.late ?? 0}</td>
                          <td className="py-2 text-center text-slate-400">{s?.punchedOut ?? 0}</td>
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
                <th className="text-center px-4 pb-2">Punch In</th>
                <th className="text-center px-4 pb-2">Punch Out</th>
                <th className="text-center px-4 pb-2">Duration</th>
                <th className="text-center px-4 pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Loading…</td></tr>
              ) : visibleLogs.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">No attendance records found for this period.</td></tr>
              ) : (
                visibleLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                    {selectedTeacher === 'all' && (
                      <td className="px-4 py-3 font-medium text-slate-100">{teacherMap.get(l.teacher_id)?.name ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 text-slate-300">{formatDate(l.date)}</td>
                    <td className="px-4 py-3 text-center text-green-400 font-mono">{formatTime(l.punch_in_time)}</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono">{formatTime(l.punch_out_time)}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{duration(l.punch_in_time, l.punch_out_time)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusChip(l.status)}`}>
                        {l.status}
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
