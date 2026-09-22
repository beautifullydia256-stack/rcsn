import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import { useTeacherContext } from '../useTeacherContext';
import { enqueue, getOfflineStudents } from '@/lib/offlineDb';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Save,
  AlertCircle,
  CheckCircle,
  WifiOff,
  ArrowLeft,
  CalendarCheck,
  Users,
  Check,
  X,
  Sparkles,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react';

type StudentRow = { student_id: string; name: string; current_class: string; admission_number?: string };
type AttendanceRow = { student_id: string; present?: boolean | null; status?: string | null };

function todayISO() {
  return schoolCalendarTodayIso();
}

// 180° Calibrated Semi-Circle Progress Gauge
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
          fontSize: '13px',
          fontWeight: 800,
          color,
          letterSpacing: '-0.02em',
        }}
      >
        {centerLabel ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
}

// Deterministic avatar color generation
function getAvatarColor(name: string, isDark: boolean): { bg: string; text: string } {
  const colors = [
    { bg: isDark ? '#1E3A8A' : '#DBEAFE', text: isDark ? '#93C5FD' : '#1D4ED8' },
    { bg: isDark ? '#064E3B' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#047857' },
    { bg: isDark ? '#78350F' : '#FEF3C7', text: isDark ? '#FCD34D' : '#B45309' },
    { bg: isDark ? '#581C87' : '#F3E8FF', text: isDark ? '#D8B4FE' : '#6B21A8' },
    { bg: isDark ? '#831843' : '#FCE7F3', text: isDark ? '#F472B6' : '#BE185D' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function TeacherAttendancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const { schoolId, teacherId, classNames, isLoading: ctxLoading } = useTeacherContext();
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || '');
  const selectedDate = todayISO();
  const [localPresent, setLocalPresent] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Sync selectedClass with classNames once context loads if empty
  useEffect(() => {
    if (!selectedClass && classNames.length > 0) {
      setSelectedClass(classNames[0]);
    }
  }, [selectedClass, classNames]);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher', 'attendance', 'students', schoolId ?? '', selectedClass, isOnline],
    queryFn: async (): Promise<StudentRow[]> => {
      if (!schoolId || !selectedClass) return [];

      // Offline: serve from IndexedDB cache
      if (!isOnline) {
        const cached = await getOfflineStudents(schoolId);
        return cached
          .filter((s) => s.class_name === selectedClass && s.status === 'active')
          .map((s) => ({
            student_id: s.student_id,
            name: s.student_name,
            current_class: s.class_name,
            admission_number: s.admission_number ?? undefined,
          }));
      }

      // Online: fetch active students for this term/semester in this class
      try {
        const term = await resolveCurrentSchoolTerm(supabase, schoolId, todayISO());
        if (term) {
          const activeIds = await resolveActiveStudentIdsForTerm(supabase, schoolId, term, todayISO());
          if (activeIds.size > 0) {
            const { data } = await supabase
              .from('students')
              .select('student_id, name, current_class, admission_number')
              .eq('school_id', schoolId)
              .eq('status', 'active')
              .eq('current_class', selectedClass)
              .in('student_id', Array.from(activeIds))
              .order('name');
            return (data as StudentRow[]) ?? [];
          }
          return [];
        }
      } catch (err) {
        console.error('[AttendancePage] Failed resolving term active students:', err);
      }

      // Fallback if no active term is configured
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class, admission_number')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .eq('current_class', selectedClass)
        .order('name');
      return (data as StudentRow[]) ?? [];
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['teacher', 'attendance', 'records', schoolId ?? '', selectedClass, selectedDate],
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!schoolId || !selectedClass || !selectedDate || !isOnline) return [];
      const { data } = await supabase
        .from('student_attendance')
        .select('student_id, present, status')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .eq('attendance_date', selectedDate);
      return (data as AttendanceRow[]) ?? [];
    },
    enabled: !!schoolId && !!selectedClass && !!selectedDate && isOnline,
  });

  const attendanceByStudent = useMemo(
    () =>
      new Map(
        existingAttendance.map((a) => [a.student_id, studentAttendanceRowIsPresent(a)])
      ),
    [existingAttendance]
  );

  useEffect(() => {
    if (students.length === 0) {
      setLocalPresent({});
      return;
    }
    const next: Record<string, boolean> = {};
    students.forEach((s) => {
      next[s.student_id] = attendanceByStudent.get(s.student_id) ?? false;
    });
    setLocalPresent(next);
  }, [students, attendanceByStudent]);

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSavedOffline(false);
      if (!schoolId || !teacherId || !selectedClass) throw new Error('Missing context');
      const attendanceDate = todayISO();
      const validStudentIds = new Set(students.map((s) => s.student_id));
      const entries = Object.entries(localPresent).filter(([id]) => validStudentIds.has(id));
      if (entries.length === 0) return;

      if (!isOnline) {
        // Queue for offline sync
        const rows = entries.map(([student_id, present]) => {
          const student = students.find((s) => s.student_id === student_id);
          return {
            student_id,
            student_name: student?.name ?? '',
            class_name: selectedClass,
            school_id: schoolId,
            attendance_date: attendanceDate,
            present,
            status: present ? 'present' : 'absent',
            arrived_late: false,
            marked_by: teacherId ?? null,
          };
        });
        await enqueue({
          schoolId,
          action: { type: 'attendance', table: 'student_attendance', rows },
          createdAt: Date.now(),
        });
        setSavedOffline(true);
        return;
      }

      // Online: direct Supabase upsert
      const rows = entries.map(([student_id, present]) => ({
        school_id: schoolId,
        class_name: selectedClass,
        student_id,
        teacher_id: teacherId,
        attendance_date: attendanceDate,
        status: present ? 'present' : 'absent',
        present: !!present,
      }));
      const { error } = await supabase.from('student_attendance').upsert(rows, {
        onConflict: 'student_id,attendance_date',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (!savedOffline) {
        queryClient.invalidateQueries({
          queryKey: ['teacher', 'attendance', 'records', schoolId ?? '', selectedClass, selectedDate],
        });
        queryClient.invalidateQueries({
          queryKey: ['dashboard'],
        });
      }
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || 'Failed to save attendance');
    },
  });

  const isLoading = ctxLoading || studentsLoading || (isOnline && attendanceLoading);

  // Present/Absent Calculations
  const totalStudents = students.length;
  const presentCount = Object.values(localPresent).filter(Boolean).length;
  const absentCount = totalStudents - presentCount;
  const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

  // Batch actions
  const markAll = (present: boolean) => {
    const next: Record<string, boolean> = {};
    students.forEach((s) => {
      next[s.student_id] = present;
    });
    setLocalPresent(next);
  };

  return (
    <div
      style={{
        background: t.bg,
        color: t.textPrimary,
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={14} />
                Dashboard
              </button>
              <span style={{ fontSize: '12px', color: t.textSub }}>/</span>
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 600 }}>Daily Register</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              Classroom Attendance Register
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Record official daily morning roll-call with automatic offline caching and cloud sync.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => saveAllMutation.mutate()}
              disabled={saveAllMutation.isPending || students.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: t.brandMint,
                color: '#064E3B',
                border: 'none',
                borderRadius: '10px',
                padding: '11px 20px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: saveAllMutation.isPending || students.length === 0 ? 'not-allowed' : 'pointer',
                opacity: saveAllMutation.isPending || students.length === 0 ? 0.5 : 1,
                boxShadow: '0 2px 10px rgba(61, 232, 160, 0.25)',
              }}
            >
              <Save size={16} />
              {saveAllMutation.isPending ? 'Saving Roll...' : 'Save Attendance Register'}
            </button>
          </div>
        </div>

        {/* Offline Banner Notification */}
        {!isOnline && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: isDark ? 'rgba(245, 192, 68, 0.1)' : '#FEF3C7',
              border: `1px solid ${isDark ? 'rgba(245, 192, 68, 0.3)' : '#FCD34D'}`,
              color: isDark ? t.brandGold : '#92400E',
            }}
          >
            <WifiOff size={20} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Offline Mode Active</div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>
                Attendance will be securely cached on this device and synced automatically once your internet connection is restored.
              </div>
            </div>
          </div>
        )}

        {/* Save Success Alert */}
        {saveSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: isDark ? 'rgba(61, 232, 160, 0.15)' : '#ECFDF5',
              border: `1px solid ${isDark ? 'rgba(61, 232, 160, 0.4)' : '#A7F3D0'}`,
              color: isDark ? t.brandMint : '#065F46',
            }}
          >
            <CheckCircle size={18} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              {savedOffline
                ? 'Attendance register cached locally in offline storage queue.'
                : 'Attendance register successfully committed and synced to cloud.'}
            </span>
          </div>
        )}

        {/* Save Error Alert */}
        {saveError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5'}`,
              color: isDark ? '#F87171' : '#B91C1C',
            }}
          >
            <AlertCircle size={18} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{saveError}</span>
          </div>
        )}

        {/* 4 POS KPI Cards with Semi-Circle Gauge */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: Attendance Rate Gauge */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Attendance Rate
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: t.textPrimary, marginTop: '4px' }}>
                {Math.round(attendanceRate)}%
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                {presentCount} of {totalStudents} present
              </span>
            </div>
            <SemiCircleGauge
              percent={attendanceRate}
              color={t.brandMint}
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}
            />
          </div>

          {/* Card 2: Present Count */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Present in Class
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                {presentCount}
              </div>
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 500 }}>
                Marked attending
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(61, 232, 160, 0.12)' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandMint,
              }}
            >
              <CheckCircle size={24} />
            </div>
          </div>

          {/* Card 3: Absent Count */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Absent Learners
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: isDark ? '#F87171' : '#DC2626', marginTop: '4px' }}>
                {absentCount}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Unverified absence
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#F87171' : '#DC2626',
              }}
            >
              <AlertCircle size={24} />
            </div>
          </div>

          {/* Card 4: Total Enrolled */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Class Enrollment
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandBlue, marginTop: '4px' }}>
                {totalStudents}
              </div>
              <span style={{ fontSize: '12px', color: t.brandBlue, fontWeight: 500 }}>
                Registered on roll
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(120, 170, 255, 0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandBlue,
              }}
            >
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Toolbar: Class Picker, Date Badge, and Batch Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginBottom: '4px' }}>
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  color: t.textPrimary,
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  minWidth: '180px',
                  cursor: 'pointer',
                }}
              >
                {classNames.map((c) => (
                  <option key={c} value={c} style={{ background: t.card, color: t.textPrimary }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginBottom: '4px' }}>
                Register Date
              </label>
              <div
                style={{
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  color: t.textPrimary,
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Clock size={14} style={{ color: t.brandBlue }} />
                Today ({new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
              </div>
            </div>
          </div>

          {/* Batch marking shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => markAll(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: isDark ? 'rgba(61, 232, 160, 0.15)' : '#ECFDF5',
                border: `1px solid ${isDark ? 'rgba(61, 232, 160, 0.3)' : '#A7F3D0'}`,
                color: isDark ? t.brandMint : '#047857',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Check size={13} />
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll(false)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: t.card,
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RotateCcw size={13} />
              Clear Roll
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: `3px solid ${t.brandMint}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', fontSize: '14px', color: t.textMuted }}>Loading class roster and attendance history...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && students.length === 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: t.textSub,
              }}
            >
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              No active students enrolled in {selectedClass}
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, maxWidth: '400px', margin: '8px auto 0 auto' }}>
              Verify with the administration or select another assigned class from the toolbar above.
            </p>
          </div>
        )}

        {/* Student Roll Table */}
        {!isLoading && students.length > 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${t.border}`,
                      background: t.surface,
                      color: t.textSub,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <th style={{ padding: '14px 20px', width: '50px' }}>#</th>
                    <th style={{ padding: '14px 20px' }}>Learner Profile</th>
                    <th style={{ padding: '14px 16px' }}>Admission Number</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Attendance State</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, index) => {
                    const isPresent = localPresent[s.student_id] ?? false;
                    const avatar = getAvatarColor(s.name, isDark);
                    const initials = s.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={s.student_id}
                        style={{
                          borderBottom: index === students.length - 1 ? 'none' : `1px solid ${t.border}`,
                          background: isPresent
                            ? isDark
                              ? 'rgba(61, 232, 160, 0.02)'
                              : '#F0FDF4'
                            : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Index */}
                        <td style={{ padding: '14px 20px', color: t.textSub, fontWeight: 600 }}>
                          {index + 1}
                        </td>

                        {/* Name & Avatar */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: avatar.bg,
                                color: avatar.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ fontWeight: 700, color: t.textPrimary }}>
                              {s.name}
                            </div>
                          </div>
                        </td>

                        {/* Admission Number */}
                        <td style={{ padding: '14px 16px', color: t.textMuted, fontWeight: 500 }}>
                          {s.admission_number || 'N/A'}
                        </td>

                        {/* Toggle Buttons */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setLocalPresent((p) => ({ ...p, [s.student_id]: true }))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                background: isPresent
                                  ? t.brandMint
                                  : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#E5E7EB',
                                color: isPresent ? '#064E3B' : t.textMuted,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Check size={13} />
                              Present
                            </button>

                            <button
                              type="button"
                              onClick={() => setLocalPresent((p) => ({ ...p, [s.student_id]: false }))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                background: !isPresent
                                  ? isDark
                                    ? '#EF4444'
                                    : '#DC2626'
                                  : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#E5E7EB',
                                color: !isPresent ? '#FFFFFF' : t.textMuted,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <X size={13} />
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary */}
            <div
              style={{
                padding: '14px 20px',
                background: t.surface,
                borderTop: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12px',
                color: t.textMuted,
              }}
            >
              <span>{presentCount} Present · {absentCount} Absent</span>
              <button
                type="button"
                onClick={() => saveAllMutation.mutate()}
                disabled={saveAllMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.brandMint,
                  color: '#064E3B',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Save size={13} />
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
