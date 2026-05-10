import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolTerm {
  id: string;
  school_id: string;
  year: number;
  term: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  attendance_date: string;
  present: boolean;
  status: string;
  arrived_late: boolean;
}

interface StudentRow {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  days: Record<string, boolean | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function getWorkingDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    if (isWeekday(cur)) {
      days.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchSchoolData(userId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('school_id')
    .eq('user_id', userId)
    .single();
  if (!userData?.school_id) return { schoolId: null, terms: [], classes: [] };

  const schoolId = userData.school_id;

  const { data: terms } = await supabase
    .from('school_terms')
    .select('*')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true });

  const { data: classes } = await supabase
    .from('student_attendance')
    .select('class_name')
    .eq('school_id', schoolId);

  const uniqueClasses = [
    ...new Set((classes || []).map((c: any) => c.class_name)),
  ].sort();

  return { schoolId, terms: terms || [], classes: uniqueClasses };
}

async function fetchAttendance(
  schoolId: string,
  startDate: string,
  endDate: string,
  classFilter: string
) {
  let query = supabase
    .from('student_attendance')
    .select(
      `attendance_id, student_id, class_name, attendance_date,
       present, status, arrived_late,
       students!inner(name, admission_number)`
    )
    .eq('school_id', schoolId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .order('class_name', { ascending: true })
    .order('attendance_date', { ascending: true });

  if (classFilter && classFilter !== 'all') {
    query = query.eq('class_name', classFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    attendance_id: r.attendance_id,
    student_id: r.student_id,
    student_name: r.students?.name || 'Unknown',
    admission_number: r.students?.admission_number || '',
    class_name: r.class_name,
    attendance_date: r.attendance_date,
    present: r.present,
    status: r.status,
    arrived_late: r.arrived_late,
  })) as AttendanceRecord[];
}

// ─── Build Pivot Table ────────────────────────────────────────────────────────

function buildStudentRows(
  records: AttendanceRecord[],
  workingDays: string[]
): StudentRow[] {
  const map = new Map<string, StudentRow>();

  for (const r of records) {
    if (!map.has(r.student_id)) {
      map.set(r.student_id, {
        student_id: r.student_id,
        student_name: r.student_name,
        admission_number: r.admission_number,
        class_name: r.class_name,
        days: {},
      });
    }
    map.get(r.student_id)!.days[r.attendance_date] = r.present;
  }

  for (const row of map.values()) {
    for (const d of workingDays) {
      if (!(d in row.days)) row.days[d] = null;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      a.class_name.localeCompare(b.class_name) ||
      a.student_name.localeCompare(b.student_name)
  );
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

function exportToExcel(
  rows: StudentRow[],
  workingDays: string[],
  title: string
) {
  const wb = XLSX.utils.book_new();
  const classes = [...new Set(rows.map((r) => r.class_name))];

  for (const cls of classes) {
    const classRows = rows.filter((r) => r.class_name === cls);

    const header = [
      'Student Name',
      'Adm. No.',
      ...workingDays.map((d) => `${getDayLabel(d)} ${formatDate(d)}`),
      'Absent %',
      'Attended %',
    ];

    const dataRows = classRows.map((row) => {
      const presentCount = workingDays.filter(
        (d) => row.days[d] === true
      ).length;
      const total = workingDays.length;
      const attendedPct =
        total > 0 ? Math.round((presentCount / total) * 100) : 0;
      const absentPct = 100 - attendedPct;

      return [
        row.student_name,
        row.admission_number,
        ...workingDays.map((d) =>
          row.days[d] === true ? '✔' : row.days[d] === false ? '✘' : '-'
        ),
        `${absentPct}%`,
        `${attendedPct}%`,
      ];
    });

    const sheetData = [
      [title],
      [`Class: ${cls}`],
      [`Working days: ${workingDays.length}`],
      [],
      header,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 26 },
      { wch: 12 },
      ...workingDays.map(() => ({ wch: 9 })),
      { wch: 10 },
      { wch: 11 },
    ];

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      cls.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31)
    );
  }

  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}.xlsx`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportToPDF(
  rows: StudentRow[],
  workingDays: string[],
  title: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const classes = [...new Set(rows.map((r) => r.class_name))];

  classes.forEach((cls, idx) => {
    if (idx > 0) doc.addPage();
    const classRows = rows.filter((r) => r.class_name === cls);

    // Header
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text(title, 14, 13);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Class: ${cls}    |    Working Days: ${workingDays.length}    |    Students: ${classRows.length}`, 14, 20);

    const head = [
      [
        'Student Name',
        'Adm No.',
        ...workingDays.map((d) => `${getDayLabel(d)}\n${formatDate(d)}`),
        'Absent%',
        'Attended%',
      ],
    ];

    const body = classRows.map((row) => {
      const presentCount = workingDays.filter(
        (d) => row.days[d] === true
      ).length;
      const total = workingDays.length;
      const attendedPct =
        total > 0 ? Math.round((presentCount / total) * 100) : 0;
      const absentPct = 100 - attendedPct;

      return [
        row.student_name,
        row.admission_number,
        ...workingDays.map((d) =>
          row.days[d] === true ? '✔' : row.days[d] === false ? '✘' : '-'
        ),
        `${absentPct}%`,
        `${attendedPct}%`,
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 25,
      styles: { fontSize: 6.5, cellPadding: 1.2, halign: 'center', overflow: 'linebreak' },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 36 },
        1: { halign: 'left', cellWidth: 18 },
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === '✔') {
            doc.setTextColor(22, 163, 74);
          } else if (val === '✘') {
            doc.setTextColor(220, 38, 38);
          } else {
            doc.setTextColor(60, 60, 60);
          }
        }
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} — PwezaCore School Management System`,
      14,
      doc.internal.pageSize.height - 6
    );
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STALE_TIME_MS = 5 * 60 * 1000;

export default function AttendanceRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'term' | 'custom'>('term');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Fetch school metadata
  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['attendance-meta', user?.id],
    queryFn: () => fetchSchoolData(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = meta?.schoolId ?? null;
  const terms: SchoolTerm[] = meta?.terms ?? [];
  const classes: string[] = meta?.classes ?? [];
  const availableYears = [
    ...new Set(terms.map((t) => t.year)),
  ].sort((a, b) => b - a);
  const termsForYear = terms.filter((t) => t.year === selectedYear);

  // Resolve date range & report title
  const { startDate, endDate, reportTitle } = useMemo(() => {
    if (filterMode === 'custom' && customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd,
        reportTitle: `Attendance Report ${customStart} to ${customEnd}`,
      };
    }
    if (filterMode === 'term' && selectedTerm) {
      const t = terms.find((t) => t.id === selectedTerm);
      if (t) {
        return {
          startDate: t.start_date,
          endDate: t.end_date,
          reportTitle: `Attendance Report Term ${t.term} ${t.year}`,
        };
      }
    }
    return { startDate: '', endDate: '', reportTitle: 'Attendance Report' };
  }, [filterMode, customStart, customEnd, selectedTerm, terms]);

  const canFetch = !!schoolId && !!startDate && !!endDate;

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attLoading } = useQuery({
    queryKey: [
      'attendance-records',
      schoolId,
      startDate,
      endDate,
      selectedClass,
    ],
    queryFn: () =>
      fetchAttendance(schoolId!, startDate, endDate, selectedClass),
    enabled: canFetch,
    staleTime: STALE_TIME_MS,
  });

  const workingDays = useMemo(
    () =>
      startDate && endDate ? getWorkingDaysBetween(startDate, endDate) : [],
    [startDate, endDate]
  );

  const studentRows = useMemo(
    () => buildStudentRows(attendanceRecords, workingDays),
    [attendanceRecords, workingDays]
  );

  const groupedByClass = useMemo(() => {
    const map = new Map<string, StudentRow[]>();
    for (const row of studentRows) {
      if (!map.has(row.class_name)) map.set(row.class_name, []);
      map.get(row.class_name)!.push(row);
    }
    return map;
  }, [studentRows]);

  const isLoading = metaLoading || attLoading;

  return (
    <AdminPageWrapper
      eyebrow="ATTENDANCE"
      title="Attendance Records"
      subtitle="View, filter and download school attendance for any term or date range"
    >
      {/* ── Filter Panel ── */}
      <div className={`${adminCardClass} mb-6`}>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Mode Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Filter By
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => setFilterMode('term')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterMode === 'term'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Term / Year
              </button>
              <button
                onClick={() => setFilterMode('custom')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterMode === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {filterMode === 'term' ? (
            <>
              {/* Year */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedTerm('');
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select Term —</option>
                  {termsForYear.map((t) => (
                    <option key={t.id} value={t.id}>
                      Term {t.term}
                      {t.is_current ? ' (Current)' : ''}
                      {t.is_closed ? ' (Closed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  From
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  To
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Class Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Download Buttons */}
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToExcel(studentRows, workingDays, reportTitle)
              }
              disabled={!canFetch || studentRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              📊 Download Excel
            </button>
            <button
              onClick={() =>
                exportToPDF(studentRows, workingDays, reportTitle)
              }
              disabled={!canFetch || studentRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              📄 Download PDF
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {startDate && endDate && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>
              Period:{' '}
              <span className="text-blue-400 font-medium">{startDate}</span> →{' '}
              <span className="text-blue-400 font-medium">{endDate}</span>
            </span>
            <span>
              Working days:{' '}
              <span className="text-slate-200 font-medium">
                {workingDays.length}
              </span>
            </span>
            <span>
              Students:{' '}
              <span className="text-slate-200 font-medium">
                {studentRows.length}
              </span>
            </span>
            <span>
              Classes:{' '}
              <span className="text-slate-200 font-medium">
                {groupedByClass.size}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Loading attendance records…
        </div>
      ) : !canFetch ? (
        <div
          className={`${adminCardClass} flex flex-col items-center justify-center py-20 text-slate-400`}
        >
          <div className="text-5xl mb-4">📋</div>
          <p className="text-sm font-medium">
            Select a term or date range above to view attendance records.
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Use "Term / Year" for official term reports, or "Custom Range" for
            specific weeks.
          </p>
        </div>
      ) : studentRows.length === 0 ? (
        <div
          className={`${adminCardClass} flex flex-col items-center justify-center py-20 text-slate-400`}
        >
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm font-medium">
            No attendance records found for the selected period.
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Try a different term, year, or date range.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedByClass.entries()).map(([cls, classStudents]) => (
            <ClassAttendanceTable
              key={cls}
              className={cls}
              students={classStudents}
              workingDays={workingDays}
            />
          ))}
        </div>
      )}
    </AdminPageWrapper>
  );
}

// ─── Class Table ──────────────────────────────────────────────────────────────

function ClassAttendanceTable({
  className,
  students,
  workingDays,
}: {
  className: string;
  students: StudentRow[];
  workingDays: string[];
}) {
  return (
    <div className={adminCardClass}>
      {/* Class header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">{className}</h3>
            <p className="text-xs text-slate-400">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ClassAvgBadge students={students} workingDays={workingDays} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800">
              <th className="sticky left-0 z-10 bg-slate-800 text-left px-3 py-2.5 font-semibold text-slate-300 border-r border-slate-700 min-w-[170px]">
                Student Name
              </th>
              {workingDays.map((d, i) => {
                const isMonday = new Date(d).getDay() === 1 && i > 0;
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center min-w-[34px] ${
                      isMonday
                        ? 'border-l-2 border-slate-500'
                        : 'border-l border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-300">
                      {getDayLabel(d)}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {formatDate(d)}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center font-semibold text-slate-300 border-l-2 border-slate-500 min-w-[70px]">
                Absent %
              </th>
              <th className="px-3 py-2 text-center font-semibold text-slate-300 border-l border-slate-700 min-w-[110px]">
                Attended
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const presentCount = workingDays.filter(
                (d) => student.days[d] === true
              ).length;
              const total = workingDays.length;
              const attendedPct =
                total > 0 ? Math.round((presentCount / total) * 100) : 0;
              const absentPct = 100 - attendedPct;
              const isGood = attendedPct >= 75;

              return (
                <tr
                  key={student.student_id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors ${
                    idx % 2 === 0
                      ? 'bg-slate-900/30'
                      : 'bg-slate-800/10'
                  }`}
                >
                  {/* Name */}
                  <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-700 bg-inherit">
                    <div className="font-medium text-slate-200 leading-tight">
                      {student.student_name}
                    </div>
                    {student.admission_number && (
                      <div className="text-[10px] text-slate-500">
                        {student.admission_number}
                      </div>
                    )}
                  </td>

                  {/* Day cells */}
                  {workingDays.map((d, i) => {
                    const val = student.days[d];
                    const isMonday = new Date(d).getDay() === 1 && i > 0;
                    return (
                      <td
                        key={d}
                        className={`px-0.5 py-2 text-center ${
                          isMonday
                            ? 'border-l-2 border-slate-500'
                            : 'border-l border-slate-700/40'
                        }`}
                      >
                        {val === true ? (
                          <span
                            className="text-emerald-400 text-sm"
                            title="Present"
                          >
                            ✔
                          </span>
                        ) : val === false ? (
                          <span
                            className="text-red-400 text-sm"
                            title="Absent"
                          >
                            ✘
                          </span>
                        ) : (
                          <span
                            className="text-slate-600 text-sm"
                            title="No record"
                          >
                            –
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Absent % */}
                  <td className="px-3 py-2 text-center border-l-2 border-slate-500">
                    <span
                      className={`font-bold text-xs ${
                        absentPct > 25 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {absentPct}%
                    </span>
                  </td>

                  {/* Progress bar */}
                  <td className="px-3 py-2 border-l border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isGood ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${attendedPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold w-8 text-right ${
                          isGood ? 'text-blue-400' : 'text-orange-400'
                        }`}
                      >
                        {attendedPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Class Average Badge ──────────────────────────────────────────────────────

function ClassAvgBadge({
  students,
  workingDays,
}: {
  students: StudentRow[];
  workingDays: string[];
}) {
  const totals = students.reduce(
    (acc, s) => {
      acc.present += workingDays.filter((d) => s.days[d] === true).length;
      acc.total += workingDays.length;
      return acc;
    },
    { present: 0, total: 0 }
  );
  const pct =
    totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;
  const isGood = pct >= 75;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Class avg:</span>
      <span
        className={`text-sm font-bold px-3 py-0.5 rounded-full border ${
          isGood
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
