import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import { normalizeRole } from '@/lib/rbac';
import { AddStudentForm } from '@/pages/admin/students/AddStudentForm';
import { AddTeacherForm } from '@/pages/admin/teachers/AddTeacherForm';
import NativeModal from '@/components/NativeModal';
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileEdit,
  Calendar,
  BarChart3,
  Folder,
  UserPlus,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getNavTerminology, getGreetingLastName } from '@/lib/roleTerminology';

const DOS_HOME = '/dashboard/dos';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export async function fetchDosDashboardAuth(userId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, school_id, name')
    .eq('user_id', user.id)
    .single();

  if (userError || !userData) throw new Error('Unable to load user data. Please contact support.');
  const userRole = normalizeRole(userData.role as string);
  if (userRole !== 'dos' && userRole !== 'deputy_dos' && userRole !== 'admin')
    throw new Error('Not authorized');
  if (!userData.school_id) throw new Error('MISSING_SCHOOL_ID');

  const { data: schoolData, error: schoolError } = await supabase
    .from('schools')
    .select('school_id, name')
    .eq('school_id', userData.school_id)
    .single();

  if (schoolError || !schoolData)
    throw new Error('Your school record could not be found. Please contact support.');

  return {
    schoolId: userData.school_id as string,
    schoolName: schoolData.name as string,
    role: userData.role as string,
    displayName: (userData.name as string | null) || null,
  };
}

// ─── 180° Calibrated SVG Semi-circle Gauge ──────────────────────────────────
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
          strokeWidth="6"
          strokeLinecap="round"
        />
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

type DosModal = 'student' | 'teacher' | null;

export default function DosDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const { isTertiary, schoolType } = useSchoolType();
  const navTerms = getNavTerminology(schoolType);

  const [kpis, setKpis] = useState({
    students: 0,
    teachers: 0,
    attendance_students: 0,
    attendance_teachers: 0,
    exam_sets: 0,
    timetable_periods: 0,
  });
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [teacherRate, setTeacherRate] = useState(0);
  const [attendanceDisplay, setAttendanceDisplay] = useState('');
  const [attendanceSub, setAttendanceSub] = useState('');
  const [teacherLoad, setTeacherLoad] = useState<
    Array<{ name: string; classes: number; subjects: number; periods: number }>
  >([]);
  const [activeExamSets, setActiveExamSets] = useState<
    Array<{ id: string; name: string; term: number; year: number; target_classes: string[] }>
  >([]);
  const [dosModal, setDosModal] = useState<DosModal>(null);

  const { data: authData, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'dos', 'auth', user?.id ?? ''],
    queryFn: () => fetchDosDashboardAuth(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    retry: false,
  });

  useEffect(() => {
    if (!authData?.schoolId) return;
    const schoolId = authData.schoolId;

    async function load() {
      try {
        const today = schoolCalendarTodayIso();

        const [
          currentTerm,
          { count: teachersCount },
          stuAttResult,
          { count: tchAttCount },
          { count: examSetsCount },
          { count: periodsCount },
        ] = await Promise.all([
          resolveCurrentSchoolTerm(supabase, schoolId, today),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase
            .from('student_attendance')
            .select('student_id, present, status')
            .eq('school_id', schoolId)
            .eq('attendance_date', today),
          supabase
            .from('teacher_attendance_logs')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('attendance_date', today)
            .not('check_in_time', 'is', null),
          supabase
            .from('exam_sets')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('active_for_input', true),
          supabase
            .from('timetable_periods')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId),
        ]);

        const enrolled = currentTerm
          ? (await resolveActiveStudentIdsForTerm(supabase, schoolId, currentTerm, today)).size
          : 0;

        const attRows = (stuAttResult.data || []) as {
          student_id: string;
          present?: boolean | null;
          status?: string | null;
        }[];
        const presentToday = new Set(
          attRows.filter(studentAttendanceRowIsPresent).map((r) => r.student_id),
        ).size;
        const markedToday = new Set(attRows.map((r) => r.student_id)).size;
        const stuPct = enrolled > 0 ? Math.round((presentToday / enrolled) * 100) : 0;
        const tchPct = (teachersCount || 0) > 0 ? Math.round(((tchAttCount || 0) / (teachersCount || 1)) * 100) : 0;

        setAttendanceRate(stuPct);
        setTeacherRate(tchPct);
        setAttendanceDisplay(`${presentToday.toLocaleString()} / ${enrolled.toLocaleString()}`);
        setAttendanceSub(
          enrolled > 0
            ? `${stuPct}% present · ${markedToday.toLocaleString()} marked`
            : 'No active enrollments',
        );

        setKpis({
          students: enrolled,
          teachers: teachersCount || 0,
          attendance_students: presentToday,
          attendance_teachers: tchAttCount || 0,
          exam_sets: examSetsCount || 0,
          timetable_periods: periodsCount || 0,
        });

        // Teacher workload from timetable
        try {
          const [{ data: periods }, { data: teacherRows }] = await Promise.all([
            supabase
              .from('timetable_periods')
              .select('teacher_id, class_name, subject')
              .eq('school_id', schoolId),
            supabase.from('teachers').select('teacher_id, name').eq('school_id', schoolId),
          ]);
          const teacherNames = new Map<string, string>(
            (teacherRows || []).map((t: any) => [t.teacher_id, t.name]),
          );
          const map = new Map<
            string,
            { name: string; classes: Set<string>; subjects: Set<string>; periods: number }
          >();
          (periods || []).forEach((r: any) => {
            if (!r.teacher_id) return;
            if (!map.has(r.teacher_id)) {
              map.set(r.teacher_id, {
                name: teacherNames.get(r.teacher_id) || 'Unknown',
                classes: new Set(),
                subjects: new Set(),
                periods: 0,
              });
            }
            const obj = map.get(r.teacher_id)!;
            if (r.class_name) obj.classes.add(r.class_name);
            if (r.subject) obj.subjects.add(r.subject);
            obj.periods += 1;
          });
          setTeacherLoad(
            Array.from(map.values())
              .map((v) => ({
                name: v.name,
                classes: v.classes.size,
                subjects: v.subjects.size,
                periods: v.periods,
              }))
              .sort((a, b) => b.periods - a.periods),
          );
        } catch {}

        // Active exam sets
        try {
          const { data: activeSets } = await supabase
            .from('exam_sets')
            .select('id, name, term, year, target_classes')
            .eq('school_id', schoolId)
            .eq('active_for_input', true)
            .order('created_at', { ascending: false })
            .limit(6);
          setActiveExamSets(
            (activeSets || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              term: s.term,
              year: s.year,
              target_classes: Array.isArray(s.target_classes) ? s.target_classes : [],
            })),
          );
        } catch {}
      } catch (e) {
        console.error('Failed to load DOS dashboard metrics:', e);
      }
    }

    void load();
  }, [authData?.schoolId]);

  const lastName = useMemo(() => {
    const raw = authData?.displayName || user?.email?.split('@')[0] || '';
    return getGreetingLastName(raw, isTertiary ? 'Registrar' : 'DOS');
  }, [authData?.displayName, user?.email, isTertiary]);

  const roleLabel = isTertiary
    ? authData?.role === 'deputy_dos'
      ? 'Deputy Academic Registrar'
      : 'Academic Registrar'
    : authData?.role === 'deputy_dos'
    ? 'Deputy Director of Studies'
    : 'Director of Studies';

  const quickActions = [
    { icon: <Calendar className="w-5 h-5 text-teal-400" />, label: isTertiary ? 'Lecture Schedule' : 'Timetable', sub: isTertiary ? 'Manage lecture & practical schedules' : 'Manage class schedules', path: '/dashboard/dos/settings/timetable', color: t.mint },
    { icon: <FileEdit className="w-5 h-5 text-blue-400" />, label: isTertiary ? 'Semester Assessments' : 'Exam Sets', sub: isTertiary ? 'Schedule & manage UNMEB exams' : 'Schedule & manage exams', path: '/dashboard/dos/exam-sets', color: t.blue },
    { icon: <BarChart3 className="w-5 h-5 text-indigo-400" />, label: isTertiary ? 'UNMEB Slips & Transcripts' : 'Generate Reports', sub: isTertiary ? 'Academic transcripts & slips' : 'Academic report cards', path: isTertiary ? '/dashboard/admin/reports/generate-tertiary' : '/dashboard/dos/reports/generate', color: '#818cf8' },
    ...(isTertiary ? [{ icon: <Stethoscope className="w-5 h-5 text-emerald-400" />, label: 'Ward Postings', sub: 'Clinical rotations & logbooks', path: '/dashboard/admin/ward-postings', color: t.mint }] : []),
    { icon: <ClipboardCheck className="w-5 h-5 text-purple-400" />, label: isTertiary ? 'Trainee Attendance' : 'Attendance', sub: isTertiary ? 'Trainee daily & practical attendance' : 'Student daily attendance', path: '/dashboard/dos/attendance', color: '#a78bfa' },
    { icon: <ClipboardList className="w-5 h-5 text-amber-400" />, label: isTertiary ? 'Tutor Sign-In' : 'Teacher Sign-In', sub: isTertiary ? 'Tutor attendance log' : 'Staff attendance log', path: '/dashboard/dos/attendance/teachers', color: t.gold },
    { icon: <Folder className="w-5 h-5 text-emerald-400" />, label: 'Report Records', sub: 'Issued academic reports', path: '/dashboard/dos/report-records', color: '#34d399' },
  ];

  const addActions: Array<{ icon: React.ReactNode; label: string; sub: string; modal: DosModal; color: string }> = [
    { icon: <UserPlus className="w-5 h-5 text-teal-400" />, label: isTertiary ? 'Enrol Trainee' : 'Enrol Student', sub: isTertiary ? 'Register a new trainee' : 'Register a new student', modal: 'student', color: t.mint },
    { icon: <UserPlus className="w-5 h-5 text-blue-400" />, label: isTertiary ? 'Add Tutor' : 'Add Teacher', sub: isTertiary ? 'Register a new tutor' : 'Register a new teacher', modal: 'teacher', color: t.blue },
  ];

  if (isPending) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${t.mintDim}`, borderTopColor: t.mint, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Loading academic dashboard...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '40px auto' }}>
        <div style={{ background: t.card, border: `1px solid ${t.redDim}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ color: t.red, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Unable to load Director of Studies Dashboard</div>
          <div style={{ color: t.textMuted, fontSize: 13, marginBottom: 16 }}>{error?.message || 'Access restricted'}</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 16px', color: t.textPrimary, fontSize: 13, cursor: 'pointer' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', width: '100%', maxWidth: 'none', color: t.textPrimary, boxSizing: 'border-box' }}>
      {/* ── Header Hero ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 99,
                background: t.mintDim,
                color: t.mint,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles className="w-3 h-3" />
              Academic Directorate
            </span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· {authData.schoolName}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.02em' }}>
            Good {getGreeting()}, {lastName}
          </h1>
          <p style={{ margin: '4px 0 0', color: t.textSecondary, fontSize: 13 }}>
            {roleLabel} · Academic Oversight, Examination Protocols & Faculty Allocation
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: '10px 20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: t.mint, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {new Date().getDate()}
            </div>
            <div style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: 700, marginTop: 3 }}>
              {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: t.border }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Day of Term</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Academic KPI Cards ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1. Students Enrolled */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Active Trainees' : 'Active Students'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.mintDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.mint }}>
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.mint, lineHeight: 1 }}>
            {kpis.students.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Enrolled this term
          </div>
        </div>

        {/* 2. Teaching Staff */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Faculty Tutors' : 'Teaching Staff'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.blue }}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.blue, lineHeight: 1 }}>
            {kpis.teachers.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Active roster count
          </div>
        </div>

        {/* 3. Student Attendance (with Calibrated Gauge) */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Trainee Attendance' : 'Student Attendance'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', lineHeight: 1.1 }}>
                {attendanceDisplay || `${kpis.attendance_students.toLocaleString()}`}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                {attendanceSub || `${attendanceRate}% today`}
              </div>
            </div>
            <SemiCircleGauge
              percent={attendanceRate}
              color="#818cf8"
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            />
          </div>
        </div>

        {/* 4. Teacher Sign-in Today (with Calibrated Gauge) */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Tutors Signed In' : 'Teachers Signed In'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
                {kpis.attendance_teachers.toLocaleString()} / {kpis.teachers.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                {teacherRate}% on duty today
              </div>
            </div>
            <SemiCircleGauge
              percent={teacherRate}
              color="#a78bfa"
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            />
          </div>
        </div>

        {/* 5. Active Exam Sets */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Active Assessments' : 'Active Exam Sets'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.gold }}>
              <FileEdit className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.gold, lineHeight: 1 }}>
            {kpis.exam_sets}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Open for marks entry
          </div>
        </div>

        {/* 6. Timetable Periods */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Lecture Periods' : 'Timetable Periods'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
            {kpis.timetable_periods.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Scheduled school-wide
          </div>
        </div>
      </div>

      {/* ── Main Middle Row: Faculty Workload & Active Exam Sets ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Faculty Teaching Load */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                {isTertiary ? 'Tutor Teaching Load Allocation' : 'Teacher Workload & Timetable Distribution'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: t.textMuted }}>
                {isTertiary ? 'Allocated cohorts, course units, and practical hours' : 'Allocated classes, subjects, and weekly teaching periods'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/dos/teachers')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: '6px 14px',
                color: t.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Manage Teachers</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                    {isTertiary ? 'Tutor / Instructor' : 'Teacher'}
                  </th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                    {isTertiary ? 'Cohorts' : 'Classes'}
                  </th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                    {isTertiary ? 'Course Units' : 'Subjects'}
                  </th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                    {isTertiary ? 'Hours / Wk' : 'Periods / Wk'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {teacherLoad.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px 14px', color: t.textMuted }}>
                      No timetable allocations recorded yet.
                    </td>
                  </tr>
                ) : (
                  teacherLoad.slice(0, 10).map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${t.border}`,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 12px', fontWeight: 600, color: t.textPrimary }}>
                        {item.name}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 26,
                            height: 22,
                            borderRadius: 6,
                            background: t.mintDim,
                            color: t.mint,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '0 6px',
                          }}
                        >
                          {item.classes}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 26,
                            height: 22,
                            borderRadius: 6,
                            background: t.blueDim,
                            color: t.blue,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '0 6px',
                          }}
                        >
                          {item.subjects}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 26,
                            height: 22,
                            borderRadius: 6,
                            background: t.goldDim,
                            color: t.gold,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '0 6px',
                          }}
                        >
                          {item.periods}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Exam Sets Card */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                {isTertiary ? 'Active Semester Assessments' : 'Active Exam Sets'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: t.textMuted }}>
                Currently open for marks submission
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/dos/exam-sets')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: t.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {activeExamSets.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: t.textMuted }}>
              <FileEdit className="w-8 h-8 opacity-40 mb-2" />
              <div style={{ fontSize: 13, fontWeight: 500 }}>No assessments currently open</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>New exam sets will appear here once activated</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeExamSets.map((es) => (
                <div
                  key={es.id}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{es.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.gold, background: t.goldDim, padding: '2px 8px', borderRadius: 99 }}>
                      {isTertiary ? `Semester ${es.term}` : `Term ${es.term}`} · {es.year}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(es.target_classes.length > 0 ? es.target_classes.slice(0, 3) : ['All Classes']).map((cls) => (
                      <span
                        key={cls}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: 'rgba(129,140,248,0.10)',
                          color: '#818cf8',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {cls}
                      </span>
                    ))}
                    {es.target_classes.length > 3 && (
                      <span style={{ fontSize: 10, color: t.textMuted, padding: '2px 4px' }}>
                        +{es.target_classes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions Grid ─────────────────────────────────────────────── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
          Academic Operations & Tools
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {quickActions.map((qa) => (
            <button
              key={qa.path}
              onClick={() => navigate(qa.path)}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: '14px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = qa.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: 8 }}>{qa.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>{qa.label}</div>
              <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.3 }}>{qa.sub}</div>
            </button>
          ))}

          {addActions.map((aa) => (
            <button
              key={aa.modal}
              onClick={() => setDosModal(aa.modal)}
              style={{
                background: t.surface,
                border: `1px dashed ${t.border}`,
                borderRadius: 14,
                padding: '14px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = aa.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: 8 }}>{aa.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>{aa.label}</div>
              <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.3 }}>{aa.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <NativeModal isOpen={dosModal === 'student'} onClose={() => setDosModal(null)} title={isTertiary ? 'Enrol Trainee' : 'Enrol Student'} size="xl">
        <AddStudentForm mode="modal" onCompleted={() => setDosModal(null)} onCancel={() => setDosModal(null)} />
      </NativeModal>
      <NativeModal isOpen={dosModal === 'teacher'} onClose={() => setDosModal(null)} title={isTertiary ? 'Add Tutor / Instructor' : 'Add Teacher'} size="lg">
        <AddTeacherForm mode="modal" onCompleted={() => setDosModal(null)} onCancel={() => setDosModal(null)} />
      </NativeModal>
    </div>
  );
}
