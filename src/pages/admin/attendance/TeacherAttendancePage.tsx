import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Users,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Calendar,
  Download,
  Search,
  Building2,
  RefreshCw,
  MapPin,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { getTokens, PosTokens } from '../../../styles/posThemeTokens';
import { useSchoolType } from '../../../hooks/useSchoolType';
import { useNavigate } from 'react-router-dom';
import AdminPageWrapper from '../../../components/layout/AdminPageWrapper';
import { GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';
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

const EAT = 'Africa/Kampala'; // UTC+3

function normUtc(iso: string): string {
  return /[Z+]/.test(iso) ? iso : iso + 'Z';
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(normUtc(iso)).toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: EAT,
    });
  } catch {
    const eat = new Date(new Date(normUtc(iso)).getTime() + 3 * 60 * 60 * 1000);
    return eat.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00Z').toLocaleDateString('en-UG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: EAT,
    });
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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isWorkingDay(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
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

// Deterministic pastel avatar background
function getAvatarBg(name: string, isDark: boolean): { bg: string; text: string } {
  const palettes = isDark
    ? [
        { bg: '#1e293b', text: '#38bdf8' },
        { bg: '#064e3b', text: '#34d399' },
        { bg: '#3b0764', text: '#c084fc' },
        { bg: '#451a03', text: '#fbbf24' },
        { bg: '#4c0519', text: '#fb7185' },
      ]
    : [
        { bg: '#e0f2fe', text: '#0284c7' },
        { bg: '#dcfce7', text: '#16a34a' },
        { bg: '#f3e8ff', text: '#9333ea' },
        { bg: '#fef3c7', text: '#d97706' },
        { bg: '#ffe4e6', text: '#e11d48' },
      ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palettes[Math.abs(h) % palettes.length];
}

// 180° Calibrated SVG Semi-circle Gauge
function SemiCircleGauge({
  percent,
  color,
  trackColor,
  centerLabel,
}: {
  percent: number;
  color: string;
  trackColor: string;
  centerLabel?: string;
}) {
  const circ = 113.1;
  const ratio = Math.min(Math.max(percent / 100, 0), 1);
  const strokeDash = `${(circ * ratio).toFixed(1)} ${circ}`;

  return (
    <div style={{ position: 'relative', width: '84px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="84" height="48" viewBox="0 0 84 48">
        <path d="M 6 42 A 36 36 0 0 1 78 42" fill="none" stroke={trackColor} strokeWidth="6" strokeLinecap="round" />
        <path
          d="M 6 42 A 36 36 0 0 1 78 42"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '-0.02em',
        }}
      >
        {centerLabel ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
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
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);
  const { isTertiary } = useSchoolType();
  const navigate = useNavigate();

  const [filterMode, setFilterMode] = useState<'term' | 'custom'>('custom');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [customStart, setCustomStart] = useState(todayStr());
  const [customEnd, setCustomEnd] = useState(todayStr());
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'logs'>('summary');

  const { data: terms = [] } = useQuery({
    queryKey: ['school-terms', schoolId],
    queryFn: () => fetchTerms(schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const availableYears = useMemo(
    () => [...new Set(terms.map((term) => term.year))].sort((a, b) => b - a),
    [terms]
  );

  const termsForYear = useMemo(
    () => terms.filter((term) => term.year === selectedYear),
    [terms, selectedYear]
  );

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === 'term' && selectedTerm) {
      const termItem = terms.find((term) => term.id === selectedTerm);
      if (termItem) return { startDate: termItem.start_date, endDate: termItem.end_date };
    }
    if (filterMode === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: '', endDate: '' };
  }, [filterMode, selectedTerm, customStart, customEnd, terms]);

  const canFetch = !!schoolId && !!startDate && !!endDate;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['teacher-attendance', schoolId, startDate, endDate],
    queryFn: () => fetchTeacherAttendanceData(schoolId!, startDate, endDate),
    enabled: canFetch,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const teachers = data?.teachers ?? [];
  const logs = data?.logs ?? [];

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((tch) => {
      if (tch.department) set.add(tch.department);
    });
    return Array.from(set).sort();
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((tch) => {
      const matchesSearch =
        tch.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (tch.employee_id && tch.employee_id.toLowerCase().includes(teacherSearch.toLowerCase()));
      const matchesDept = selectedDepartment === 'all' || tch.department === selectedDepartment;
      return matchesSearch && matchesDept;
    });
  }, [teachers, teacherSearch, selectedDepartment]);

  const logsByTeacher = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    logs.forEach((log) => {
      if (!map.has(log.teacher_id)) map.set(log.teacher_id, []);
      map.get(log.teacher_id)!.push(log);
    });
    return map;
  }, [logs]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, TeacherRow>();
    teachers.forEach((tch) => map.set(tch.teacher_id, tch));
    return map;
  }, [teachers]);

  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesTeacher = selectedTeacher === 'all' || log.teacher_id === selectedTeacher;
      const tch = teacherMap.get(log.teacher_id);
      const matchesDept = selectedDepartment === 'all' || tch?.department === selectedDepartment;
      return matchesTeacher && matchesDept;
    });
  }, [logs, selectedTeacher, selectedDepartment, teacherMap]);

  const isSingleDay = startDate === endDate;

  // High-level KPI aggregations for active period
  const totalRoster = teachers.length;

  const summaryByTeacher = useMemo(() => {
    return teachers.map((tch) => {
      const tLogs = logsByTeacher.get(tch.teacher_id) ?? [];
      const hasPunch = tLogs.length > 0;
      const latestLog = tLogs[0] ?? null;
      const daysAttended = tLogs.filter((l) => !!l.check_in_time).length;
      const isLate = latestLog?.status === 'late';
      return {
        ...tch,
        hasRecord: hasPunch,
        latestLog,
        daysAttended,
        isLate,
      };
    });
  }, [teachers, logsByTeacher]);

  const presentCount = summaryByTeacher.filter((s) => s.hasRecord).length;
  const lateCount = summaryByTeacher.filter((s) => s.isLate).length;
  const absentCount = Math.max(0, totalRoster - presentCount);
  const attendanceRate = totalRoster > 0 ? (presentCount / totalRoster) * 100 : 0;
  const onTimeRate = presentCount > 0 ? ((presentCount - lateCount) / presentCount) * 100 : 100;

  function applyQuick(preset: (typeof QUICK_BTNS)[number]['preset']) {
    const { start, end } = quickRange(preset);
    setCustomStart(start);
    setCustomEnd(end);
    setFilterMode('custom');
  }

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title =
      selectedTeacher === 'all'
        ? `${isTertiary ? 'Tutor' : 'Teacher'} Attendance Audit Report`
        : `${isTertiary ? 'Tutor' : 'Teacher'} Attendance — ${teacherMap.get(selectedTeacher)?.name ?? ''}`;

    doc.setFontSize(14);
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.text(`Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleString()}`, 14, 22);

    const rows = visibleLogs.map((l) => [
      teacherMap.get(l.teacher_id)?.name ?? l.teacher_id,
      teacherMap.get(l.teacher_id)?.employee_id ?? '—',
      teacherMap.get(l.teacher_id)?.department ?? 'General',
      formatDate(l.attendance_date),
      formatTime(l.check_in_time),
      formatTime(l.check_out_time),
      duration(l.check_in_time, l.check_out_time),
      l.status.toUpperCase(),
      l.check_in_distance_m != null ? `${l.check_in_distance_m}m` : '—',
    ]);

    autoTable(doc, {
      head: [['Staff Name', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out', 'Duration', 'Status', 'Proximity']],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] },
    });

    doc.save(`faculty-attendance-${startDate}-to-${endDate}.pdf`);
  }

  const staffRoleLabel = isTertiary ? 'Tutor' : 'Teacher';
  const staffPluralLabel = isTertiary ? 'Tutors' : 'Teachers';

  return (
    <AdminPageWrapper>
      {/* INSTITUTIONAL GOVERNMENT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            FACULTY & CLINICAL TUTOR ATTENDANCE AUDIT
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            {Math.round(attendanceRate)}% SIGN-IN RATE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gov-btn gov-btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            SYNC
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={visibleLogs.length === 0}
            className="gov-btn gov-btn-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            EXPORT PDF AUDIT
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance')}
            className="gov-btn gov-btn-sm"
          >
            STUDENT ATTENDANCE
          </button>
        </div>
      </div>

      {/* 4 TOP CALIBRATED GOVERNMENT METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">SIGN-IN RATE</div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-0.5">
            {Math.round(attendanceRate)}%
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">SIGNED IN ON DUTY</div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-0.5">
            {presentCount} / {totalRoster}
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">LATE ARRIVALS</div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-0.5">
            {lateCount}
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">PENDING / ABSENT</div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-0.5">
            {absentCount}
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ──────────────────────────────────────── */}
      <div className="gov-card p-3 rounded-lg border border-[#CCCCCC] bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Tab Switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`gov-btn gov-btn-sm ${activeTab === 'summary' ? 'gov-btn-primary' : ''}`}
            >
              STAFF ROLL-CALL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`gov-btn gov-btn-sm ${activeTab === 'logs' ? 'gov-btn-primary' : ''}`}
            >
              PUNCH AUDIT LOGS ({visibleLogs.length})
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            {QUICK_BTNS.map(({ label, preset }) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyQuick(preset)}
                className={`gov-btn gov-btn-sm ${
                  filterMode === 'custom' &&
                  customStart === quickRange(preset).start &&
                  customEnd === quickRange(preset).end
                    ? 'gov-btn-primary'
                    : ''
                }`}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filters: Search & Department */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777777] pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${staffRoleLabel.toLowerCase()}…`}
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="gov-input pl-8 py-1 text-xs w-full"
            />
          </div>

          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="gov-select text-xs py-1"
            >
              <option value="all">ALL DEPARTMENTS</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="gov-select text-xs py-1 max-w-[150px]"
          >
            <option value="all">ALL {staffPluralLabel.toUpperCase()}</option>
            {teachers.map((tch) => (
              <option key={tch.teacher_id} value={tch.teacher_id}>
                {tch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main View: Tab 1 (Staff Roll-Call Matrix) ────────────────────────── */}
      {activeTab === 'summary' && (
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: t.cardShadow,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                {staffRoleLabel} Daily Roll-Call & Punctuality Ledger
              </span>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>
                Reporting status for {formatDate(startDate)}
                {startDate !== endDate ? ` to ${formatDate(endDate)}` : ''}
              </p>
            </div>
            <span style={{ fontSize: 12, color: t.textMuted }}>
              Showing {filteredTeachers.length} of {teachers.length} staff members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    background: t.surface,
                    borderBottom: `1px solid ${t.cardBorder}`,
                    color: t.textMuted,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px 20px' }}>Faculty Member</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Punch Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Check-In</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Check-Out</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Duration</th>
                  {!isSingleDay && <th style={{ padding: '12px 16px', textAlign: 'center' }}>Days Attended</th>}
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <GovTableLoader colSpan={8} />
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      No {staffPluralLabel.toLowerCase()} found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((tch) => {
                    const s = summaryByTeacher.find((x) => x.teacher_id === tch.teacher_id);
                    const av = getAvatarBg(tch.name, isDark);
                    const initials = tch.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    const latest = s?.latestLog;
                    const isWeekend = isSingleDay && !isWorkingDay(startDate);

                    return (
                      <tr
                        key={tch.teacher_id}
                        style={{
                          borderBottom: `1px solid ${t.cardBorder}`,
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Teacher Name & Avatar */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: av.bg,
                                color: av.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 13,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: t.textPrimary }}>{tch.name}</div>
                              <div style={{ fontSize: 11, color: t.textMuted }}>
                                {tch.employee_id ? `ID: ${tch.employee_id}` : 'General Staff'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: t.surface,
                              color: t.textSecondary,
                              border: `1px solid ${t.cardBorder}`,
                            }}
                          >
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {tch.department || 'Academic'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {isWeekend ? (
                            <span style={{ fontSize: 12, color: t.textMuted }}>Weekend</span>
                          ) : s?.hasRecord ? (
                            latest?.status === 'late' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 10px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isDark ? 'rgba(245, 192, 68, 0.15)' : 'rgba(217, 119, 6, 0.1)',
                                  color: t.gold,
                                  border: `1px solid ${isDark ? 'rgba(245, 192, 68, 0.3)' : 'rgba(217, 119, 6, 0.25)'}`,
                                }}
                              >
                                <Clock className="w-3 h-3" /> Late
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 10px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isDark ? 'rgba(16, 217, 168, 0.15)' : 'rgba(13, 148, 136, 0.1)',
                                  color: t.teal,
                                  border: `1px solid ${isDark ? 'rgba(16, 217, 168, 0.3)' : 'rgba(13, 148, 136, 0.25)'}`,
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Present
                              </span>
                            )
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                                background: isDark ? 'rgba(247, 92, 92, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                                color: t.red,
                                border: `1px solid ${isDark ? 'rgba(247, 92, 92, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                              }}
                            >
                              <XCircle className="w-3 h-3" /> Absent
                            </span>
                          )}
                        </td>

                        {/* Check-In */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: latest?.check_in_time ? (isDark ? '#34d399' : '#059669') : t.textMuted }}>
                          {formatTime(latest?.check_in_time ?? null)}
                        </td>

                        {/* Check-Out */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: latest?.check_out_time ? (isDark ? '#f87171' : '#dc2626') : t.textMuted }}>
                          {formatTime(latest?.check_out_time ?? null)}
                        </td>

                        {/* Duration */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: t.textSecondary }}>
                          {duration(latest?.check_in_time ?? null, latest?.check_out_time ?? null)}
                        </td>

                        {/* Days Attended (multi-day view) */}
                        {!isSingleDay && (
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: t.textPrimary }}>
                            {s?.daysAttended ?? 0} days
                          </td>
                        )}

                        {/* Actions */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacher(tch.teacher_id);
                              setActiveTab('logs');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: t.surface,
                              border: `1px solid ${t.cardBorder}`,
                              color: t.teal,
                              cursor: 'pointer',
                            }}
                          >
                            View Logs
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Main View: Tab 2 (Detailed Audit Punch Logs) ────────────────────── */}
      {activeTab === 'logs' && (
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: t.cardShadow,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                {selectedTeacher === 'all'
                  ? 'All Punch Audit Logs'
                  : `${teacherMap.get(selectedTeacher)?.name ?? 'Staff'} — Punch Records`}
              </span>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>
                Biometric timestamps, duration, and geo-distance accuracy
              </p>
            </div>

            {selectedTeacher !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTeacher('all')}
                style={{
                  fontSize: 12,
                  color: t.teal,
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                ← View All Staff Logs
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    background: t.surface,
                    borderBottom: `1px solid ${t.cardBorder}`,
                    color: t.textMuted,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px 20px' }}>Staff Name</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Check-In</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Check-Out</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Work Duration</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center' }}>Geofence Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <GovTableLoader colSpan={7} />
                ) : visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      No punch records found for the selected filter period.
                    </td>
                  </tr>
                ) : (
                  visibleLogs.map((l) => {
                    const tch = teacherMap.get(l.teacher_id);
                    const av = getAvatarBg(tch?.name || 'Teacher', isDark);
                    return (
                      <tr
                        key={l.log_id}
                        style={{
                          borderBottom: `1px solid ${t.cardBorder}`,
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: av.bg,
                                color: av.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 11,
                              }}
                            >
                              {(tch?.name || 'T')[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: t.textPrimary }}>{tch?.name ?? '—'}</div>
                              <div style={{ fontSize: 10, color: t.textMuted }}>{tch?.department ?? 'Academic'}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', color: t.textSecondary }}>{formatDate(l.attendance_date)}</td>

                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: l.check_in_time ? (isDark ? '#34d399' : '#059669') : t.textMuted }}>
                          {formatTime(l.check_in_time)}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: l.check_out_time ? (isDark ? '#f87171' : '#dc2626') : t.textMuted }}>
                          {formatTime(l.check_out_time)}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: t.textSecondary }}>
                          {duration(l.check_in_time, l.check_out_time)}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              background:
                                l.status === 'present'
                                  ? (isDark ? 'rgba(16, 217, 168, 0.12)' : 'rgba(13, 148, 136, 0.1)')
                                  : l.status === 'late'
                                  ? (isDark ? 'rgba(245, 192, 68, 0.12)' : 'rgba(217, 119, 6, 0.1)')
                                  : (isDark ? 'rgba(247, 92, 92, 0.12)' : 'rgba(239, 68, 68, 0.1)'),
                              color: l.status === 'present' ? t.teal : l.status === 'late' ? t.gold : t.red,
                            }}
                          >
                            {l.status}
                          </span>
                        </td>

                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 11, fontFamily: 'monospace', color: t.textMuted }}>
                          {l.check_in_distance_m != null ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {l.check_in_distance_m}m
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
