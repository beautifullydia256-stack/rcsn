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
    <div
      className="pw-page space-y-6"
      style={{
        color: t.textPrimary,
        fontFamily: "'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      {/* ── Top Hero Banner ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 16,
          background: isDark
            ? 'linear-gradient(135deg, rgba(13, 22, 38, 0.95), rgba(8, 15, 28, 0.98))'
            : 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: `1px solid ${t.cardBorder}`,
          padding: '24px 28px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: isDark ? 'rgba(16, 217, 168, 0.12)' : 'rgba(13, 148, 136, 0.1)',
                color: t.teal,
                border: `1px solid ${isDark ? 'rgba(16, 217, 168, 0.25)' : 'rgba(13, 148, 136, 0.2)'}`,
              }}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              FACULTY ATTENDANCE AUDIT
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: t.textMuted,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: t.teal,
                  display: 'inline-block',
                  boxShadow: `0 0 8px ${t.teal}`,
                }}
              />
              Auto-syncs 30s
            </span>
          </div>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: 0,
              color: t.textPrimary,
            }}
          >
            {staffRoleLabel} Clock-In & Presence Ledger
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: t.textSecondary }}>
            Live punch-in records, GPS geofence compliance, and termly attendance analytics for all academic staff.
          </p>
        </div>

        {/* Date & Refresh Quick Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 12,
              background: t.surface,
              border: `1px solid ${t.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {new Date().toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 12,
              background: t.surface,
              border: `1px solid ${t.cardBorder}`,
              color: t.textPrimary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={downloadPdf}
            disabled={visibleLogs.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: visibleLogs.length === 0 ? 'not-allowed' : 'pointer',
              opacity: visibleLogs.length === 0 ? 0.4 : 1,
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Audit</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top Calibrated POS Metric Cards ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Card 1: Attendance Rate Gauge */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: t.cardShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Sign-In Rate
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
              {Math.round(attendanceRate)}%
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: attendanceRate >= 80 ? t.teal : t.red,
                marginTop: 4,
              }}
            >
              {attendanceRate >= 80 ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Optimal Roster
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Attention Needed
                </>
              )}
            </span>
          </div>

          <SemiCircleGauge
            percent={attendanceRate}
            color={attendanceRate >= 80 ? t.teal : attendanceRate >= 50 ? t.gold : t.red}
            trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          />
        </div>

        {/* Card 2: Present Staff */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: t.cardShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Signed In on Duty
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
              {presentCount} <span style={{ fontSize: 14, fontWeight: 500, color: t.textMuted }}>/ {totalRoster}</span>
            </div>
            <span style={{ fontSize: 11, color: t.teal, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Check className="w-3 h-3" /> Active Present
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isDark ? 'rgba(16, 217, 168, 0.12)' : 'rgba(13, 148, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.teal,
            }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Late Arrivals */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: t.cardShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Late Arrivals
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
              {lateCount}
            </div>
            <span style={{ fontSize: 11, color: lateCount > 0 ? t.gold : t.textMuted, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Clock className="w-3 h-3" /> {lateCount > 0 ? 'Punched Past 8:00 AM' : 'Zero Tardiness'}
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isDark ? 'rgba(245, 192, 68, 0.12)' : 'rgba(217, 119, 6, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.gold,
            }}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Unaccounted / Absent */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: '18px 20px',
            boxShadow: t.cardShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Pending / Absent
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}>
              {absentCount}
            </div>
            <span style={{ fontSize: 11, color: absentCount > 0 ? t.red : t.teal, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {absentCount > 0 ? (
                <>
                  <XCircle className="w-3 h-3" /> No Punch-In Logged
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Full Turnout
                </>
              )}
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isDark ? 'rgba(247, 92, 92, 0.12)' : 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.red,
            }}
          >
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ──────────────────────────────────────── */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: t.cardShadow,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* View Tab Switcher */}
          <div
            style={{
              display: 'inline-flex',
              padding: 3,
              borderRadius: 10,
              background: t.surface,
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'summary' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                color: activeTab === 'summary' ? t.textPrimary : t.textMuted,
                boxShadow: activeTab === 'summary' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Roll-Call</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'logs' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                color: activeTab === 'logs' ? t.textPrimary : t.textMuted,
                boxShadow: activeTab === 'logs' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Punch Audit Logs</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                }}
              >
                {visibleLogs.length}
              </span>
            </button>
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {QUICK_BTNS.map(({ label, preset }) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyQuick(preset)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${t.cardBorder}`,
                  background: filterMode === 'custom' && customStart === quickRange(preset).start && customEnd === quickRange(preset).end ? (isDark ? '#1e293b' : '#0d9488') : t.surface,
                  color: filterMode === 'custom' && customStart === quickRange(preset).start && customEnd === quickRange(preset).end ? '#ffffff' : t.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters: Search & Department */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 200 }}>
            <Search
              className="w-3.5 h-3.5 text-slate-400"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder={`Search ${staffRoleLabel.toLowerCase()}...`}
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: 8,
                background: t.surface,
                border: `1px solid ${t.cardBorder}`,
                color: t.textPrimary,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: t.surface,
                border: `1px solid ${t.cardBorder}`,
                color: t.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: t.surface,
              border: `1px solid ${t.cardBorder}`,
              color: t.textPrimary,
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              maxWidth: 160,
            }}
          >
            <option value="all">All {staffPluralLabel}</option>
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
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: t.teal }} />
                      Loading faculty attendance data...
                    </td>
                  </tr>
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
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: t.teal }} />
                      Loading logs...
                    </td>
                  </tr>
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
    </div>
  );
}
