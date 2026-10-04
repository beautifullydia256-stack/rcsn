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
import { AddStudentForm } from '@/pages/admin/students/AddStudentForm';
import { AddTeacherForm } from '@/pages/admin/teachers/AddTeacherForm';
import { AddParentForm } from '@/pages/admin/parents/AddParentForm';
import NativeModal from '@/components/NativeModal';
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Calendar,
  AlertTriangle,
  FileText,
  BarChart3,
  MessageSquare,
  UserPlus,
  Bell,
  Stethoscope,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle, getNavTerminology, getGreetingLastName } from '@/lib/roleTerminology';

const HT_HOME = '/dashboard/head-teacher';

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export async function fetchHeadTeacherDashboardAuth(userId: string) {
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
  if (userRole !== 'head_teacher' && userRole !== 'deputy_head_teacher' && userRole !== 'admin' && userRole !== 'owner') {
    throw new Error('Not authorized');
  }

  const schoolId = (userData.school_id as string) || 'e1b10000-0000-4000-a000-000000000001';

  let schoolName = 'Rakai Community School of Nursing';
  try {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name')
      .eq('school_id', schoolId)
      .maybeSingle();
    if (schoolData?.name) schoolName = schoolData.name;
  } catch {
    /* fallback to institutional name */
  }

  return {
    schoolId,
    schoolName,
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

type HtModal = 'student' | 'teacher' | 'parent' | null;

export default function HeadTeacherDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const { isTertiary, schoolType } = useSchoolType();
  const navTerms = getNavTerminology(schoolType);

  const [kpis, setKpis] = useState({ students: 0, teachers: 0, attendance_students: 0, attendance_teachers: 0, exams: 0, discipline: 0 });
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [teacherRate, setTeacherRate] = useState(0);
  const [attendanceDisplay, setAttendanceDisplay] = useState('');
  const [attendanceSub, setAttendanceSub] = useState('');
  const [notices, setNotices] = useState<any[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<Array<{ teacher_id: string; name: string; classes: number; subjects: number; periods: number }>>([]);
  const [activeExamSets, setActiveExamSets] = useState<Array<{ id: string; name: string; term: number; year: number; target_classes: string[] }>>([]);
  const [htModal, setHtModal] = useState<HtModal>(null);

  const { data: authData, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'head-teacher', 'auth', user?.id ?? ''],
    queryFn: () => fetchHeadTeacherDashboardAuth(user!.id),
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

        const [currentTerm, { count: teachersCount }, stuAttResult, { count: tchAttCount }, { count: examsCount }, { count: disciplineCount }] =
          await Promise.all([
            resolveCurrentSchoolTerm(supabase, schoolId, today),
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('student_attendance').select('student_id, present, status').eq('school_id', schoolId).eq('attendance_date', today),
            supabase.from('teacher_attendance_logs').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('attendance_date', today).not('check_in_time', 'is', null),
            supabase.from('school_events').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('event_date', today),
            supabase.from('discipline_records').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('incident_date', today),
          ]);

        const enrolled = currentTerm
          ? (await resolveActiveStudentIdsForTerm(supabase, schoolId, currentTerm, today)).size
          : 0;

        const attRows = (stuAttResult.data || []) as { student_id: string; present?: boolean | null; status?: string | null }[];
        const presentToday = new Set(attRows.filter(studentAttendanceRowIsPresent).map((r) => r.student_id)).size;
        const markedToday = new Set(attRows.map((r) => r.student_id)).size;
        const stuPct = enrolled > 0 ? Math.round((presentToday / enrolled) * 100) : 0;
        const tchPct = (teachersCount || 0) > 0 ? Math.round(((tchAttCount || 0) / (teachersCount || 1)) * 100) : 0;

        setAttendanceRate(stuPct);
        setTeacherRate(tchPct);
        setAttendanceDisplay(`${presentToday.toLocaleString()} / ${enrolled.toLocaleString()}`);
        setAttendanceSub(
          enrolled > 0
            ? `${stuPct}% of roster present · ${markedToday.toLocaleString()} marked today`
            : 'No active enrollments found',
        );

        setKpis({
          students: enrolled,
          teachers: teachersCount || 0,
          attendance_students: presentToday,
          attendance_teachers: tchAttCount || 0,
          exams: examsCount || 0,
          discipline: disciplineCount || 0,
        });

        const { data: recent } = await supabase
          .from('notifications')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(5);
        setNotices(recent || []);

        try {
          const [{ data: periods }, { data: teacherRows }] = await Promise.all([
            supabase.from('timetable_periods').select('teacher_id, class_name, subject').eq('school_id', schoolId),
            supabase.from('teachers').select('teacher_id, name').eq('school_id', schoolId),
          ]);
          const teacherNames = new Map<string, string>(
            (teacherRows || []).map((t: any) => [t.teacher_id, t.name]),
          );
          const map = new Map<string, { name: string; classes: Set<string>; subjects: Set<string>; periods: number }>();
          (periods || []).forEach((r: any) => {
            if (!r.teacher_id) return;
            if (!map.has(r.teacher_id)) {
              map.set(r.teacher_id, { name: teacherNames.get(r.teacher_id) || 'Unknown', classes: new Set(), subjects: new Set(), periods: 0 });
            }
            const obj = map.get(r.teacher_id)!;
            if (r.class_name) obj.classes.add(r.class_name);
            if (r.subject) obj.subjects.add(r.subject);
            obj.periods += 1;
          });
          setTeacherLoad(
            Array.from(map.values())
              .map((v) => ({ teacher_id: '', name: v.name, classes: v.classes.size, subjects: v.subjects.size, periods: v.periods }))
              .sort((a, b) => b.periods - a.periods),
          );
        } catch {}

        try {
          const { data: activeSets } = await supabase
            .from('exam_sets')
            .select('id, name, term, year, target_classes')
            .eq('school_id', schoolId)
            .eq('active_for_input', true)
            .order('year', { ascending: false })
            .order('term', { ascending: true });
          setActiveExamSets(
            (activeSets || []).map((es: any) => ({
              id: es.id,
              name: es.name,
              term: es.term,
              year: es.year,
              target_classes: es.target_classes || [],
            })),
          );
        } catch {}
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    }

    void load();
  }, [authData?.schoolId]);

  const fallbackRole = isTertiary ? 'Principal' : 'Head Teacher';
  const lastName = getGreetingLastName(authData?.displayName, '');
  const greetingTarget = lastName ? lastName : fallbackRole;

  const quickActions = [
    { icon: <FileText className="w-5 h-5 text-amber-400" />, label: 'Headed Paper', sub: 'Letterhead & templates', path: '/dashboard/head-teacher/headed-paper', color: t.gold },
    { icon: <GraduationCap className="w-5 h-5 text-teal-400" />, label: isTertiary ? 'Trainees' : 'Students', sub: isTertiary ? 'Trainee records & cohorts' : 'Records & UACE profiles', path: '/dashboard/head-teacher/students', color: t.mint },
    { icon: <BookOpen className="w-5 h-5 text-blue-400" />, label: isTertiary ? 'Tutors & Instructors' : 'Teachers', sub: isTertiary ? 'Staff & module allocations' : 'Staff & class assignments', path: '/dashboard/head-teacher/teachers', color: t.blue },
    { icon: <BarChart3 className="w-5 h-5 text-indigo-400" />, label: isTertiary ? 'UNMEB Slips & Transcripts' : 'Generate Reports', sub: isTertiary ? 'Semester results & transcripts' : 'Exam results & report cards', path: isTertiary ? '/dashboard/admin/reports/generate-tertiary' : '/dashboard/head-teacher/reports/generate', color: '#818cf8' },
    { icon: <MessageSquare className="w-5 h-5 text-purple-400" />, label: isTertiary ? 'Principal Remarks' : 'Comments Settings', sub: isTertiary ? 'Grading & remarks settings' : 'Head teacher remarks', path: '/dashboard/head-teacher/headteacher-comments-settings', color: '#a78bfa' },
    ...(isTertiary ? [{ icon: <Stethoscope className="w-5 h-5 text-emerald-400" />, label: 'Ward Postings', sub: 'Clinical rotations & logbooks', path: '/dashboard/admin/ward-postings', color: t.mint }] : []),
    { icon: <ClipboardCheck className="w-5 h-5 text-emerald-400" />, label: isTertiary ? 'Trainee Attendance' : 'Attendance', sub: isTertiary ? 'Clinical & lecture attendance' : 'Daily attendance overview', path: '/dashboard/head-teacher/attendance', color: '#34d399' },
  ];

  const addActions: Array<{ icon: React.ReactNode; label: string; sub: string; modal: HtModal; color: string }> = [
    { icon: <UserPlus className="w-5 h-5 text-teal-400" />, label: isTertiary ? 'Add Trainee' : 'Add Student', sub: isTertiary ? 'Enrol a new trainee' : 'Enrol a new student', modal: 'student', color: t.mint },
    { icon: <UserPlus className="w-5 h-5 text-blue-400" />, label: isTertiary ? 'Add Tutor' : 'Add Teacher', sub: isTertiary ? 'Register a new tutor' : 'Register a new teacher', modal: 'teacher', color: t.blue },
    { icon: <UserPlus className="w-5 h-5 text-purple-400" />, label: isTertiary ? 'Add Parent / Sponsor' : 'Add Parent', sub: isTertiary ? 'Add a parent or sponsor' : 'Add a parent or guardian', modal: 'parent', color: '#a78bfa' },
  ];

  if (isPending) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${t.mintDim}`, borderTopColor: t.mint, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Loading executive dashboard...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '40px auto' }}>
        <div style={{ background: t.card, border: `1px solid ${t.redDim}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ color: t.red, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Unable to load Head Teacher Dashboard</div>
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
      {/* ── Executive Header ─────────────────────────────────────────────────── */}
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.02em' }}>
            Good {getGreeting()}, {greetingTarget}
          </h1>
          <p style={{ margin: '4px 0 0', color: t.textSecondary, fontSize: 13 }}>
            {authData.schoolName || 'School Dashboard'}
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
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Current Term</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Executive KPI Cards ───────────────────────────────────────────── */}
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
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Enrolled Trainees' : 'Active Students'}</span>
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

        {/* 2. Teachers Count */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Faculty Tutors' : 'Teachers on Roster'}</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.blue }}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.blue, lineHeight: 1 }}>
            {kpis.teachers.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Total teaching staff
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
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{isTertiary ? 'Tutors Signed In' : 'Staff Attendance'}</span>
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

        {/* 5. School Events & Assessment */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Events & Exams</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.gold }}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.gold, lineHeight: 1 }}>
            {kpis.exams}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Upcoming scheduled
          </div>
        </div>

        {/* 6. Discipline & Welfare Alerts */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Welfare & Discipline</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.redDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.red }}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: kpis.discipline > 0 ? t.red : t.mint, lineHeight: 1 }}>
            {kpis.discipline}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            {kpis.discipline === 0 ? 'All clear' : 'Incidents logged'}
          </div>
        </div>
      </div>

      {/* ── Middle Row: Teacher Workload & Recent Notices ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Teacher Workload */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                {isTertiary ? 'Faculty Teaching Allocations' : 'Staff Teaching Load & Class Allocations'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: t.textMuted }}>
                {isTertiary ? 'Weekly lecture and clinical practical commitments' : 'Weekly timetable assignments, classes and subject allocations'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/head-teacher/teachers')}
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
              <span>Faculty Directory</span>
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
                      No teacher allocations recorded yet.
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

        {/* Notices & Bulletins */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                Official Circulars & Notices
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: t.textMuted }}>
                School broadcast messages
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/head-teacher/notifications')}
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

          {notices.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: t.textMuted }}>
              <Bell className="w-8 h-8 opacity-40 mb-2" />
              <div style={{ fontSize: 13, fontWeight: 500 }}>No circulars broadcasted yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Staff and student notices will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notices.map((n) => (
                <div
                  key={n.notification_id || n.id}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                    {n.title || 'Official Circular'}
                  </div>
                  <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {n.message || n.content || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Executive Action Grid ───────────────────────────────────────────── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
          Executive School Controls & Workspaces
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
              onClick={() => setHtModal(aa.modal)}
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
      <NativeModal isOpen={htModal === 'student'} onClose={() => setHtModal(null)} title={isTertiary ? 'Add Trainee' : 'Enrol Student'} size="xl">
        <AddStudentForm mode="modal" onCompleted={() => setHtModal(null)} onCancel={() => setHtModal(null)} />
      </NativeModal>
      <NativeModal isOpen={htModal === 'teacher'} onClose={() => setHtModal(null)} title={isTertiary ? 'Add Tutor / Instructor' : 'Add Teacher'} size="lg">
        <AddTeacherForm mode="modal" onCompleted={() => setHtModal(null)} onCancel={() => setHtModal(null)} />
      </NativeModal>
      <NativeModal isOpen={htModal === 'parent'} onClose={() => setHtModal(null)} title={isTertiary ? 'Add Parent / Sponsor' : 'Add Parent'} size="lg">
        <AddParentForm mode="modal" onCompleted={() => setHtModal(null)} onCancel={() => setHtModal(null)} />
      </NativeModal>
    </div>
  );
}
