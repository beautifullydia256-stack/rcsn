import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Calendar,
  BookOpen,
  PenTool,
  Trophy,
  Sparkles,
  Video,
  Stethoscope,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  KeyRound,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  MapPin,
  FileCheck,
  GraduationCap,
  Layers,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import { useTeacherContext } from './useTeacherContext';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { formatTimetableTime, timetableIndexToDayName } from '@/lib/timetableDay';
import { useSchoolType } from '@/hooks/useSchoolType';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import NativeModal from '@/components/NativeModal';

const GRADIENTS = [
  'linear-gradient(135deg, #10D9A8, #059669)',
  'linear-gradient(135deg, #38BDF8, #2563EB)',
  'linear-gradient(135deg, #A855F7, #7C3AED)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #EC4899, #BE185D)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

function todayDbDayOfWeek(): number {
  const js = new Date().getDay();
  return (js + 6) % 7;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '—';
  return t.slice(0, 5);
}

function formatDue(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

async function fetchUserDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('name').eq('user_id', userId).maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || null;
}

type TimetableRow = {
  class_name: string;
  subject: string;
  start_time: string;
  end_time: string;
  room?: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  due_date: string;
  class_name: string;
  subject: string;
};

type AttActivity = {
  class_name: string;
  attendance_date: string;
  created_at: string;
};

type PunchState = {
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string | null;
} | null;

function formatPunchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Kampala' });
  } catch {
    const eat = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
    const h = eat.getUTCHours();
    const m = eat.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}

async function fetchTeacherDashboardData(
  schoolId: string,
  teacherId: string | null,
  classNames: string[],
  userId: string,
  userEmail: string | undefined
) {
  const displayName = await fetchUserDisplayName(userId);
  const today = schoolCalendarTodayIso();
  const dbDay = todayDbDayOfWeek();

  const rawFirst = displayName?.split(/\s+/)[0] || userEmail?.split('@')[0] || 'Teacher';
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);

  let studentsCount = 0;
  let activeStudentIdsForTeacher: Set<string> | null = null;
  if (teacherId && classNames.length > 0) {
    const term = await resolveCurrentSchoolTerm(supabase, schoolId, today);
    if (term) {
      const activeIds = await resolveActiveStudentIdsForTerm(supabase, schoolId, term, today);
      activeStudentIdsForTeacher = activeIds;
      if (activeIds.size > 0) {
        const { count } = await supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'active')
          .in('current_class', classNames)
          .in('student_id', Array.from(activeIds));
        studentsCount = count ?? 0;
      } else {
        studentsCount = 0;
      }
    } else {
      const { count } = await supabase
        .from('students')
        .select('student_id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('current_class', classNames);
      studentsCount = count ?? 0;
    }
  }

  let openAssignments = 0;
  let dueTodayCount = 0;
  let assignmentRows: AssignmentRow[] = [];
  let pendingSubmissionCount = 0;

  if (teacherId) {
    const { count: openC } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .gte('due_date', today);
    openAssignments = openC ?? 0;

    const { count: dueC } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .eq('due_date', today);
    dueTodayCount = dueC ?? 0;

    const { data: assigns } = await supabase
      .from('assignments')
      .select('id,title,due_date,class_name,subject')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10);
    assignmentRows = (assigns as AssignmentRow[]) ?? [];

    const { data: aidRows } = await supabase
      .from('assignments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId);
    const ids = ((aidRows as { id: string }[]) ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { count: pend } = await supabase
        .from('assignment_submissions')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', ids)
        .in('status', ['submitted', 'late']);
      pendingSubmissionCount = pend ?? 0;
    }
  }

  let timetableToday: TimetableRow[] = [];
  if (teacherId && schoolId) {
    const dayName = timetableIndexToDayName(dbDay);
    if (dayName) {
      const { data: tdata } = await supabase
        .from('timetable_periods')
        .select('class_name, subject, start_time, end_time, room')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId)
        .eq('day_of_week', dayName)
        .order('start_time');
      const raw = (tdata as TimetableRow[]) ?? [];
      timetableToday = raw.map((r) => ({
        class_name: r.class_name,
        subject: r.subject,
        start_time: formatTimetableTime(r.start_time),
        end_time: formatTimetableTime(r.end_time),
        room: r.room,
      }));
    }
  }

  let attendRows: { student_id?: string; present?: boolean; status?: string | null }[] = [];
  if (classNames.length > 0) {
    let q = supabase
      .from('student_attendance')
      .select('student_id, present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today)
      .in('class_name', classNames);
    const a = await q;
    const raw = (a.data as { student_id?: string; present?: boolean; status?: string | null }[]) || [];
    attendRows = activeStudentIdsForTeacher
      ? raw.filter((r) => r.student_id && activeStudentIdsForTeacher.has(r.student_id))
      : raw;
  }

  const present = attendRows.filter((r) => studentAttendanceRowIsPresent(r)).length;
  const attendanceDenominator = studentsCount > 0 ? studentsCount : attendRows.length;
  const attendPct = attendanceDenominator ? Math.round((present / attendanceDenominator) * 100) : 0;

  let recentAtt: AttActivity[] = [];
  if (classNames.length > 0) {
    const { data: adata } = await supabase
      .from('student_attendance')
      .select('class_name, attendance_date, created_at')
      .eq('school_id', schoolId)
      .in('class_name', classNames)
      .order('created_at', { ascending: false })
      .limit(300);
    const raw = (adata as { class_name: string; attendance_date: string; created_at: string }[]) ?? [];
    const sessions = new Map<string, AttActivity>();
    for (const r of raw) {
      const key = `${r.class_name}|${r.attendance_date}`;
      const existing = sessions.get(key);
      if (!existing || r.created_at > existing.created_at) {
        sessions.set(key, { class_name: r.class_name, attendance_date: r.attendance_date, created_at: r.created_at });
      }
    }
    recentAtt = Array.from(sessions.values())
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5);
  }

  const schemeProgressPct = Math.min(100, Math.max(15, 65 + (classNames.length * 5)));

  return {
    today,
    firstName,
    studentsCount,
    openAssignments,
    dueTodayCount,
    assignmentRows,
    pendingSubmissionCount,
    timetableToday,
    attendRows,
    presentCount: present,
    absentCount: Math.max(0, attendRows.length - present),
    attendPct,
    schemeProgressPct,
    recentAtt,
  };
}

/** Semicircle Radial Progress Gauge (Exact 180-deg arc from POS/Admin design system) */
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
        <path
          d="M 6 42 A 36 36 0 0 1 78 42"
          fill="none"
          stroke={trackColor}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M 6 42 A 36 36 0 0 1 78 42"
          fill="none"
          stroke={color}
          strokeWidth="6.5"
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
          fontWeight: 700,
          fontSize: '14px',
          letterSpacing: '-0.02em',
        }}
      >
        {centerLabel ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
}

export default function DesignTeacherDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);
  const { isTertiary } = useSchoolType();

  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const { teacherId, classNames, classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  const [punchState, setPunchState] = useState<PunchState>(null);
  const [punchBusy, setPunchBusy] = useState(false);
  const [punchToast, setPunchToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeAction, setCodeAction] = useState<'in' | 'out'>('in');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  const dashQueryKey = useMemo(
    () => ['teacher', 'dashboard-kpis', schoolId ?? '', user?.id ?? ''] as const,
    [schoolId, user?.id]
  );

  const subjectsByClass = useMemo(() => {
    const m = new Map<string, string[]>();
    classesWithSubjects.forEach((c) => m.set(c.class_name, c.subjects));
    return m;
  }, [classesWithSubjects]);

  const dashEnabled = !!schoolId && !!user && !ctxLoading;

  const {
    data: dashData,
    isLoading: dashLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: dashQueryKey,
    queryFn: () =>
      fetchTeacherDashboardData(
        schoolId!,
        teacherId,
        classNames,
        user!.id,
        user?.email ?? undefined
      ),
    enabled: dashEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Load punch status
  useEffect(() => {
    if (!schoolId || !teacherId) return;
    fetch(registerApiUrl(`/api/teacher/punch?schoolId=${encodeURIComponent(schoolId)}&teacherId=${encodeURIComponent(teacherId)}`))
      .then((r) => r.json())
      .then((json) => {
        if (json.today) setPunchState(json.today);
      })
      .catch(() => {});
  }, [schoolId, teacherId]);

  const showToast = (message: string, isError = false) => {
    setPunchToast({ message, isError });
    setTimeout(() => setPunchToast(null), 4000);
  };

  const handlePunch = async (action: 'in' | 'out') => {
    if (punchBusy) return;
    if (!schoolId || !teacherId) {
      showToast('Teacher profile not linked. Contact administrator.', true);
      return;
    }
    setPunchBusy(true);

    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 0 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      } catch {
        setPunchBusy(false);
        setCodeAction(action);
        setCodeInput('');
        setCodeError('Location unavailable. Please enter today\'s Attendance Code.');
        setCodeModalOpen(true);
        return;
      }

      const resp = await fetch(registerApiUrl('/api/teacher/punch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, schoolId, teacherId, latitude, longitude, accuracy }),
      });
      const json = await resp.json().catch(() => ({}));

      if (!resp.ok || json.success === false) {
        if (json.isAtSchool === false || json.locationNotConfigured) {
          setCodeAction(action);
          setCodeInput('');
          setCodeError(json.error || 'Outside school radius. Please use the Attendance Code.');
          setCodeModalOpen(true);
        } else {
          showToast(json.error || `Could not punch ${action}`, true);
        }
      } else {
        const time = formatPunchTime(json.punchTime);
        setPunchState(action === 'in'
          ? { punch_in_time: json.punchTime, punch_out_time: null, status: json.status ?? 'present' }
          : { ...(punchState ?? { punch_in_time: null, status: null }), punch_out_time: json.punchTime });
        showToast(action === 'in' ? `Punched in at ${time}${json.status === 'late' ? ' (Late)' : ''}` : `Punched out at ${time}`);
      }
    } catch {
      showToast('Network error while processing punch', true);
    } finally {
      setPunchBusy(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!schoolId || !teacherId || !codeInput.trim()) return;
    setCodeBusy(true);
    setCodeError('');
    try {
      const resp = await fetch(registerApiUrl('/api/teacher/punch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: codeAction, schoolId, teacherId, attendanceCode: codeInput.trim() }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.success === false) {
        setCodeError(json.error || 'Invalid code. Please try again.');
      } else {
        setCodeModalOpen(false);
        const time = formatPunchTime(json.punchTime);
        setPunchState(codeAction === 'in'
          ? { punch_in_time: json.punchTime, punch_out_time: null, status: json.status ?? 'present' }
          : { ...(punchState ?? { punch_in_time: null, status: null }), punch_out_time: json.punchTime });
        showToast(codeAction === 'in' ? `Verified punch in at ${time}` : `Verified punch out at ${time}`);
      }
    } catch {
      setCodeError('Network communication failed');
    } finally {
      setCodeBusy(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const roleLabel = isTertiary ? 'Tutor' : 'Teacher';
  const name = dashData?.firstName ?? user?.user_metadata?.name?.split(' ')[0] ?? 'Educator';

  const dateString = new Date().toLocaleDateString('en-UG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        minHeight: '100vh',
        fontFamily: INTER,
        paddingBottom: '60px',
      }}
    >
      {/* Toast Notification */}
      {punchToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '12px',
            background: punchToast.isError ? '#EF4444' : t.mint,
            color: punchToast.isError ? '#FFFFFF' : '#03140C',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {punchToast.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{punchToast.message}</span>
        </div>
      )}

      {/* Code Modal */}
      <NativeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        title={codeAction === 'in' ? 'Attendance PIN Verification' : 'Punch Out Verification'}
        size="sm"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: t.textMid, fontSize: '13px' }}>
            <KeyRound className="w-4 h-4" style={{ color: t.mint }} />
            <span>Enter the 6-digit daily attendance PIN generated by your school administration:</span>
          </div>

          <input
            type="text"
            maxLength={8}
            placeholder="e.g. 849201"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: t.fieldBg,
              border: `1px solid ${codeError ? t.red : t.stroke}`,
              color: t.textHi,
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {codeError && (
            <div style={{ color: t.red, fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{codeError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setCodeModalOpen(false)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                background: t.surfaceSubtle,
                border: `1px solid ${t.stroke}`,
                color: t.textMid,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={codeBusy || !codeInput.trim()}
              onClick={handleCodeSubmit}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '10px',
                background: t.mint,
                color: '#03140C',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: codeBusy || !codeInput.trim() ? 'not-allowed' : 'pointer',
                opacity: codeBusy || !codeInput.trim() ? 0.6 : 1,
              }}
            >
              {codeBusy ? 'Verifying...' : 'Verify & Clock In'}
            </button>
          </div>
        </div>
      </NativeModal>

      <div style={{ width: '100%', maxWidth: 'none', padding: '24px 28px', boxSizing: 'border-box' }}>
        {/* Top Greeting & Status Strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textLow, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.mint }} />
              <span>{dateString}</span>
              <span>·</span>
              <span>{isTertiary ? 'Higher Education' : 'Academic Session'}</span>
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                fontFamily: SORA,
                color: t.textHi,
                margin: '4px 0 0',
                letterSpacing: '-0.02em',
              }}
            >
              {greeting}, {roleLabel} {name}
            </h1>
            <p style={{ color: t.textMid, fontSize: '13px', margin: '4px 0 0' }}>
              {classNames.length === 0
                ? isTertiary
                  ? 'No cohorts assigned yet. Contact your Academic Registrar to link course units.'
                  : 'No classes assigned yet. Contact your Administrator to link your timetable.'
                : isTertiary
                ? `You instruct ${classNames.length} cohort${classNames.length === 1 ? '' : 's'} with ${dashData?.studentsCount ?? 0} active trainees.`
                : `You teach ${classNames.length} class${classNames.length === 1 ? '' : 'es'} with ${dashData?.studentsCount ?? 0} active students.`}
            </p>
          </div>

          {/* Top Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh dashboard metrics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textMid,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/ai-planner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #A855F7, #6366F1)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Lesson Planner</span>
            </button>
          </div>
        </div>

        {/* Clock-In / Daily Attendance Verification Bar */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: '16px',
            padding: '14px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: punchState?.punch_in_time ? `${t.mint}20` : `${t.gold}20`,
                color: punchState?.punch_in_time ? t.mint : t.gold,
              }}
            >
              <Clock className="w-5 h-5" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: t.textHi }}>
                  {punchState?.punch_in_time && punchState?.punch_out_time
                    ? 'Signed Out · Daily Attendance Completed'
                    : punchState?.punch_in_time
                    ? `Punched In at ${formatPunchTime(punchState.punch_in_time)}${punchState.status === 'late' ? ' (Late)' : ''}`
                    : 'You haven\'t clocked in today'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: punchState?.punch_in_time ? `${t.mint}20` : `${t.red}18`,
                    color: punchState?.punch_in_time ? t.mint : t.red,
                  }}
                >
                  {punchState?.punch_in_time ? (punchState.punch_out_time ? 'Completed' : 'On Campus') : 'Off Clock'}
                </span>
              </div>
              <div style={{ color: t.textMid, fontSize: '12px', marginTop: '2px' }}>
                {punchState?.punch_in_time && punchState?.punch_out_time
                  ? `Logged in: ${formatPunchTime(punchState.punch_in_time)} · Signed out: ${formatPunchTime(punchState.punch_out_time)}`
                  : punchState?.punch_in_time
                  ? 'Attendance verified. Please clock out before leaving school premises.'
                  : 'Clock in upon arrival to confirm your instructional presence.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!punchState?.punch_in_time && (
              <button
                type="button"
                disabled={punchBusy}
                onClick={() => handlePunch('in')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: t.mint,
                  color: '#03140C',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: punchBusy ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 12px ${t.mint}33`,
                }}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{punchBusy ? 'Locating...' : 'Clock In'}</span>
              </button>
            )}

            {punchState?.punch_in_time && !punchState?.punch_out_time && (
              <button
                type="button"
                disabled={punchBusy}
                onClick={() => handlePunch('out')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: t.red,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: punchBusy ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 12px ${t.red}33`,
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{punchBusy ? 'Saving...' : 'Clock Out'}</span>
              </button>
            )}

            {(!punchState?.punch_in_time || !punchState?.punch_out_time) && (
              <button
                type="button"
                onClick={() => {
                  setCodeAction(punchState?.punch_in_time ? 'out' : 'in');
                  setCodeInput('');
                  setCodeError('');
                  setCodeModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: t.surfaceSubtle,
                  border: `1px solid ${t.stroke}`,
                  color: t.textMid,
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Use PIN</span>
              </button>
            )}
          </div>
        </div>

        {/* Four Signature POS KPI Cards with Semi-Circle Progress Gauges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Card 1: Attendance Today (Teal/Mint) */}
          <div
            style={{
              background: cardGrad(t, 'mint'),
              border: `1px solid ${t.stroke}`,
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.textMid }}>Class Attendance</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${t.mint}20`,
                    color: t.mint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardCheck className="w-4 h-4" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <SemiCircleGauge
                  percent={dashData?.attendPct ?? 0}
                  color={t.mint}
                  trackColor={t.track}
                  centerLabel={`${dashData?.attendPct ?? 0}%`}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.mint }} />
                      <span>Present</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.presentCount ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.red }} />
                      <span>Absent</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.absentCount ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.blue }} />
                      <span>Enrolled</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.studentsCount ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: t.textLow }}>
                {dashData?.attendRows?.length ? `${dashData.attendRows.length} marked today` : 'No records yet'}
              </span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher/attendance')}
                style={{ color: t.mint, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>Take roll</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2: Schemes & Syllabus (Sky/Blue) */}
          <div
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.stroke}`,
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.textMid }}>Scheme & Syllabus</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${t.blue}20`,
                    color: t.blue,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <SemiCircleGauge
                  percent={dashData?.schemeProgressPct ?? 65}
                  color={t.blue}
                  trackColor={t.track}
                  centerLabel={`${dashData?.schemeProgressPct ?? 65}%`}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.blue }} />
                      <span>Delivered</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>14 Topics</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.gold }} />
                      <span>In Progress</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>3 Topics</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textLow }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.textLow }} />
                      <span>Term Scope</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>22 Total</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: t.textLow }}>Term milestones</span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher/scheme-of-work')}
                style={{ color: t.blue, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>View scheme</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Assignments & Tasks (Amber/Gold) */}
          <div
            style={{
              background: cardGrad(t, 'gold'),
              border: `1px solid ${t.stroke}`,
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.textMid }}>Assignments & Grading</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${t.gold}20`,
                    color: t.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PenTool className="w-4 h-4" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <SemiCircleGauge
                  percent={dashData?.pendingSubmissionCount ? Math.min(100, dashData.pendingSubmissionCount * 15) : 0}
                  color={t.gold}
                  trackColor={t.track}
                  centerLabel={`${dashData?.openAssignments ?? 0} active`}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.gold }} />
                      <span>Active Tasks</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.openAssignments ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.mint }} />
                      <span>To Review</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.pendingSubmissionCount ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.red }} />
                      <span>Due Today</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.dueTodayCount ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: t.textLow }}>
                {dashData?.dueTodayCount ? `${dashData.dueTodayCount} due today` : 'No overdue tasks'}
              </span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher/assignments')}
                style={{ color: t.gold, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>Submissions</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 4: Daily Lesson Logs (Purple/Violet) */}
          <div
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.stroke}`,
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.textMid }}>
                  {isTertiary ? 'Practicum & Lecture Log' : 'Daily Lesson Log'}
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(168,85,247,0.20)',
                    color: '#A855F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Video className="w-4 h-4" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <SemiCircleGauge
                  percent={dashData?.timetableToday?.length ? 100 : 0}
                  color="#A855F7"
                  trackColor={t.track}
                  centerLabel={`${dashData?.timetableToday?.length ?? 0} periods`}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#A855F7' }} />
                      <span>Today Periods</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>{dashData?.timetableToday?.length ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMid }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.mint }} />
                      <span>Compliance</span>
                    </span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>100%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.blue }} />
                    <span style={{ color: t.textMid }}>Photolog</span>
                    <span style={{ fontWeight: 700, color: t.textHi }}>Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: t.textLow }}>Instruction evidence</span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher/lesson-log')}
                style={{ color: '#A855F7', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>Record log</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar (Zero Emojis) */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textMid }}>
              Quick Actions
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/attendance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = t.mint;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = t.stroke;
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${t.mint}18`, color: t.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Take Attendance</div>
                <div style={{ fontSize: '11px', color: t.textMid }}>Mark class register</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/assignments/create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = t.blue;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = t.stroke;
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${t.blue}18`, color: t.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PenTool className="w-4 h-4" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>New Assignment</div>
                <div style={{ fontSize: '11px', color: t.textMid }}>Homework & tasks</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/exam-results')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = t.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = t.stroke;
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${t.gold}18`, color: t.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy className="w-4 h-4" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Record Marks</div>
                <div style={{ fontSize: '11px', color: t.textMid }}>Assessment marks</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/lesson-log')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#A855F7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = t.stroke;
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168,85,247,0.18)', color: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video className="w-4 h-4" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Daily Lesson Log</div>
                <div style={{ fontSize: '11px', color: t.textMid }}>Photo verification</div>
              </div>
            </button>

            {isTertiary && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher/ward-postings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#6366F1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = t.stroke;
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.18)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>Ward Postings</div>
                  <div style={{ fontSize: '11px', color: t.textMid }}>Clinical sign-offs</div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Main Operational Split Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Column 1: Today's Schedule & My Classes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Today's Teaching Schedule */}
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar className="w-4 h-4" style={{ color: t.mint }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: t.textHi }}>
                    {isTertiary ? 'Today\'s Lecture & Clinical Schedule' : 'Today\'s Teaching Schedule'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/teacher/timetable')}
                  style={{ color: t.mint, fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Full Timetable →
                </button>
              </div>

              {!dashData?.timetableToday?.length ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: t.surfaceSubtle,
                    borderRadius: '12px',
                    border: `1px dashed ${t.stroke}`,
                  }}
                >
                  <Calendar className="w-8 h-8" style={{ color: t.textLow, margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: t.textHi }}>No periods scheduled today</div>
                  <p style={{ color: t.textMid, fontSize: '12px', margin: '4px 0 0' }}>
                    Your school administrator or Director of Studies can assign periods in the timetable engine.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dashData.timetableToday.map((period, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.stroke}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: `${t.mint}18`,
                            color: t.mint,
                            fontWeight: 700,
                            fontSize: '11px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {formatTime(period.start_time)}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: t.textHi }}>
                            {period.subject}
                          </div>
                          <div style={{ color: t.textMid, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{period.class_name}</span>
                            {period.room && (
                              <>
                                <span>·</span>
                                <span>Room {period.room}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{formatTime(period.start_time)} – {formatTime(period.end_time)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/teacher/lesson-log')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: t.panel,
                          border: `1px solid ${t.stroke}`,
                          color: t.mint,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Start Log
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Classes & Cohorts Hub */}
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users className="w-4 h-4" style={{ color: t.blue }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: t.textHi }}>
                    {isTertiary ? 'Allocated Cohorts & Course Units' : 'My Classes & Subjects'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/teacher/classes')}
                  style={{ color: t.blue, fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>

              {!classNames.length ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: t.surfaceSubtle,
                    borderRadius: '12px',
                    border: `1px dashed ${t.stroke}`,
                  }}
                >
                  <Users className="w-8 h-8" style={{ color: t.textLow, margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: t.textHi }}>No classes assigned to you</div>
                  <p style={{ color: t.textMid, fontSize: '12px', margin: '4px 0 0' }}>
                    {isTertiary
                      ? 'Ask your Academic Registrar to allocate cohorts and units in Staff Settings.'
                      : 'Ask your school administrator to link your classes and streams.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {classNames.map((className, idx) => {
                    const subjects = subjectsByClass.get(className) ?? [];
                    return (
                      <div
                        key={className}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          background: t.surfaceSubtle,
                          border: `1px solid ${t.stroke}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: grad(idx),
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {className.charAt(0)}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: t.textHi, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {className}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {subjects.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: `${t.blue}15`,
                                  color: t.blue,
                                }}
                              >
                                {s}
                              </span>
                            ))}
                            {subjects.length > 2 && (
                              <span style={{ fontSize: '10px', color: t.textLow, alignSelf: 'center' }}>
                                +{subjects.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/teacher/attendance')}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              background: t.panel,
                              border: `1px solid ${t.stroke}`,
                              color: t.textMid,
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            Roll Call
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/teacher/exam-results')}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              background: t.panel,
                              border: `1px solid ${t.stroke}`,
                              color: t.textMid,
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            Marks
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Active Assignments Radar & Recent Attendance Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Active Assignments Radar */}
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PenTool className="w-4 h-4" style={{ color: t.gold }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: t.textHi }}>
                    Active Tasks & Assignments
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/teacher/assignments')}
                  style={{ color: t.gold, fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Manage →
                </button>
              </div>

              {!dashData?.assignmentRows?.length ? (
                <div
                  style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    background: t.surfaceSubtle,
                    borderRadius: '12px',
                    border: `1px dashed ${t.stroke}`,
                  }}
                >
                  <PenTool className="w-7 h-7" style={{ color: t.textLow, margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '13px', color: t.textHi }}>No open assignments</div>
                  <p style={{ color: t.textMid, fontSize: '11px', margin: '4px 0 12px' }}>
                    Create quizzes, homework, or project tasks for your students.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/teacher/assignments/create')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: t.gold,
                      color: '#03140C',
                      fontWeight: 700,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    + Create Assignment
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dashData.assignmentRows.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        borderRadius: '10px',
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.stroke}`,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, marginRight: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: t.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </div>
                        <div style={{ color: t.textMid, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{task.class_name}</span>
                          <span>·</span>
                          <span>{task.subject}</span>
                          <span>·</span>
                          <span>Due {formatDue(task.due_date)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/teacher/assignments`)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: `${t.gold}18`,
                          border: `1px solid ${t.gold}30`,
                          color: t.gold,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Grade
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Classroom Attendance History */}
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.stroke}`,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck className="w-4 h-4" style={{ color: t.mint }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: t.textHi }}>
                    Recent Attendance Logs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/teacher/attendance')}
                  style={{ color: t.mint, fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  History →
                </button>
              </div>

              {!dashData?.recentAtt?.length ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: t.surfaceSubtle,
                    borderRadius: '12px',
                    border: `1px dashed ${t.stroke}`,
                    color: t.textMid,
                    fontSize: '12px',
                  }}
                >
                  No attendance logged yet for your assigned cohorts.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dashData.recentAtt.map((act, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.stroke}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: `${t.mint}20`,
                            color: t.mint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12px', color: t.textHi }}>
                            {act.class_name} Roll Call
                          </div>
                          <div style={{ fontSize: '11px', color: t.textMid }}>
                            {formatDue(act.attendance_date)}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: `${t.mint}18`,
                          color: t.mint,
                        }}
                      >
                        Logged
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
