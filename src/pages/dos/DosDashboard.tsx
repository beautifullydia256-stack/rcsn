import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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
  AlertTriangle,
} from 'lucide-react';

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

// ─── Shared style atoms ────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--pw-s1, #0b1120)',
  border: '1px solid var(--pw-border, rgba(255,255,255,0.07))',
  borderRadius: 16,
  padding: '20px',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--pw-t1, #f8fafc)',
  fontSize: 14,
  fontWeight: 600,
  margin: 0,
};

const sectionSub: React.CSSProperties = {
  color: 'var(--pw-t3, #94a8d0)',
  fontSize: 12,
  marginTop: 3,
};

const th: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  color: 'var(--pw-t3, #94a8d0)',
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--pw-border, rgba(255,255,255,0.07))',
};

const td: React.CSSProperties = {
  padding: '11px 14px',
  color: 'var(--pw-t1, #f8fafc)',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const ghostBtn: React.CSSProperties = {
  background: 'var(--pw-s2, #101828)',
  border: '1px solid var(--pw-border, rgba(255,255,255,0.07))',
  borderRadius: 8,
  padding: '5px 12px',
  color: 'var(--pw-t2, #c5d4ef)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  flexShrink: 0,
};

function pill(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 22,
    borderRadius: 6,
    background: color + '22',
    color,
    fontSize: 12,
    fontWeight: 700,
    padding: '0 6px',
  };
}

// ─── KPI config ────────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  { key: 'students',            label: 'Active This Term',    icon: <GraduationCap className="w-5 h-5" />, color: '#10d9a8' },
  { key: 'teachers',            label: 'Teachers',            icon: <BookOpen className="w-5 h-5" />,  color: '#3d8ef8' },
  { key: 'attendance_students', label: 'Student Attendance',  icon: <ClipboardCheck className="w-5 h-5" />,  color: '#818cf8' },
  { key: 'attendance_teachers', label: 'Teachers Signed In',  icon: <ClipboardList className="w-5 h-5" />,  color: '#a78bfa' },
  { key: 'exam_sets',           label: 'Active Exam Sets',    icon: <FileEdit className="w-5 h-5" />,  color: '#fbbf24' },
  { key: 'timetable_periods',   label: 'Timetable Periods',   icon: <Calendar className="w-5 h-5" />, color: '#34d399' },
] as const;

// ─── Quick action config ───────────────────────────────────────────────────────

const QUICK_ACTIONS: Array<{ icon: React.ReactNode; label: string; sub: string; path: string; color: string }> = [
  { icon: <Calendar className="w-5 h-5" />, label: 'Timetable',        sub: 'Manage class schedules',    path: '/dashboard/dos/settings/timetable', color: '#10d9a8' },
  { icon: <FileEdit className="w-5 h-5" />, label: 'Exam Sets',         sub: 'Schedule & manage exams',   path: '/dashboard/dos/exam-sets',          color: '#3d8ef8' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Generate Reports',  sub: 'Academic report cards',     path: '/dashboard/dos/reports/generate',   color: '#818cf8' },
  { icon: <ClipboardCheck className="w-5 h-5" />, label: 'Attendance',        sub: 'Student daily attendance',  path: '/dashboard/dos/attendance',         color: '#a78bfa' },
  { icon: <ClipboardList className="w-5 h-5" />, label: 'Teacher Sign-In',   sub: 'Staff attendance log',      path: '/dashboard/dos/attendance/teachers',color: '#fbbf24' },
  { icon: <Folder className="w-5 h-5" />, label: 'Report Records',    sub: 'Issued academic reports',   path: '/dashboard/dos/report-records',     color: '#34d399' },
];

type DosModal = 'student' | 'teacher' | null;

const ADD_ACTIONS: Array<{ icon: React.ReactNode; label: string; sub: string; modal: DosModal; color: string }> = [
  { icon: <UserPlus className="w-5 h-5" />, label: 'Enrol Student', sub: 'Register a new student', modal: 'student', color: '#10d9a8' },
  { icon: <UserPlus className="w-5 h-5" />, label: 'Add Teacher',   sub: 'Register a new teacher', modal: 'teacher', color: '#3d8ef8' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DosDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [kpis, setKpis] = useState({
    students: 0,
    teachers: 0,
    attendance_students: 0,
    attendance_teachers: 0,
    exam_sets: 0,
    timetable_periods: 0,
  });
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
        const pct = enrolled > 0 ? Math.round((presentToday / enrolled) * 100) : 0;

        setAttendanceDisplay(`${presentToday.toLocaleString()} / ${enrolled.toLocaleString()}`);
        setAttendanceSub(
          enrolled > 0
            ? `${pct}% present · ${markedToday.toLocaleString()} marked today`
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
        console.error('DOS dashboard load error:', err);
      }
    }

    void load();
  }, [authData?.schoolId]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (!user?.id || isPending || !authData?.schoolId) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid var(--pw-border, rgba(255,255,255,0.1))',
            borderTopColor: 'var(--pw-teal, #10d9a8)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--pw-t3, #94a8d0)', fontSize: 13 }}>Loading dashboard…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError && error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (message === 'Not authenticated') {
      navigate(`/login?returnUrl=${encodeURIComponent(DOS_HOME)}`);
      return null;
    }
    if (message === 'Not authorized') {
      navigate('/dashboard');
      return null;
    }
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <div className="flex justify-center mb-1">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
        </div>
        <h2 style={{ color: 'var(--pw-t1)', fontSize: 18, fontWeight: 700, margin: 0 }}>
          Account Setup Required
        </h2>
        <p style={{ color: 'var(--pw-t3)', fontSize: 13, maxWidth: 360 }}>{message}</p>
        <button onClick={() => navigate('/login')} style={{ ...ghostBtn, marginTop: 8 }}>
          Back to Login
        </button>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const firstName = authData.displayName?.split(' ')[0] || 'DOS';
  const roleLabel =
    normalizeRole(authData.role) === 'deputy_dos' ? 'Deputy Director of Studies' : 'Director of Studies';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pw-bg, #05080f)' }}>
      <div
        style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}
        className="pb-24 md:pb-10"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          style={{
            marginBottom: 28,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
          className="pr-12 md:pr-0"
        >
          <div>
            <div
              style={{
                color: 'var(--pw-t3, #94a8d0)',
                fontSize: 12,
                letterSpacing: '0.4px',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--pw-teal, #10d9a8)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {todayStr}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--pw-t1, #f8fafc)',
                lineHeight: 1.25,
              }}
            >
              Good {getGreeting()}, {firstName}
            </h1>
            <p style={{ margin: '5px 0 0', color: 'var(--pw-t2, #c5d4ef)', fontSize: 13 }}>
              {roleLabel} · {authData.schoolName}
            </p>
          </div>
          <div
            style={{
              background: 'var(--pw-s1, #0b1120)',
              border: '1px solid var(--pw-border)',
              borderRadius: 12,
              padding: '10px 18px',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{ color: 'var(--pw-teal, #10d9a8)', fontSize: 30, fontWeight: 800, lineHeight: 1 }}
            >
              {new Date().getDate()}
            </div>
            <div
              style={{
                color: 'var(--pw-t3, #94a8d0)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginTop: 3,
              }}
            >
              {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" style={{ marginBottom: 20 }}>
          {KPI_CONFIG.map(({ key, label, icon, color }) => {
            const isAttendance = key === 'attendance_students';
            const displayVal =
              isAttendance && attendanceDisplay
                ? attendanceDisplay
                : kpis[key as keyof typeof kpis].toLocaleString();
            return (
              <div
                key={key}
                style={{ ...card, padding: '16px', cursor: 'default', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = color + '55')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--pw-border, rgba(255,255,255,0.07))')
                }
              >
                <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: isAttendance ? 20 : 28, fontWeight: 800, color, lineHeight: 1 }}>
                  {displayVal}
                </div>
                {isAttendance && attendanceSub ? (
                  <div style={{ fontSize: 10, color: 'var(--pw-t3, #94a8d0)', marginTop: 5, lineHeight: 1.4 }}>
                    {attendanceSub}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--pw-t3, #94a8d0)', marginTop: 5, fontWeight: 500 }}>
                    {label}
                  </div>
                )}
                {isAttendance && (
                  <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 600, opacity: 0.8 }}>
                    {label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Main row: Teacher Workload + Active Exam Sets ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
          {/* Teacher Workload */}
          <div style={card} className="lg:col-span-2">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div>
                <p style={sectionTitle}>Teacher Workload</p>
                <p style={sectionSub}>Timetable assignments · periods per week</p>
              </div>
              <button style={ghostBtn} onClick={() => navigate('/dashboard/dos/teachers')}>
                Manage →
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Teacher</th>
                    <th style={{ ...th, textAlign: 'center' }}>Classes</th>
                    <th style={{ ...th, textAlign: 'center' }}>Subjects</th>
                    <th style={{ ...th, textAlign: 'center' }}>Periods / Wk</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherLoad.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{ ...td, color: 'var(--pw-t3)', textAlign: 'center', padding: '24px 14px' }}
                      >
                        No timetable assignments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    teacherLoad.slice(0, 10).map((t, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--pw-border)',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pw-s2, #101828)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={td}>{t.name}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={pill('#10d9a8')}>{t.classes}</span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={pill('#3d8ef8')}>{t.subjects}</span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={pill('#fbbf24')}>{t.periods}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Exam Sets */}
          <div style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div>
                <p style={sectionTitle}>Active Exam Sets</p>
                <p style={sectionSub}>Open for result input</p>
              </div>
              <button style={ghostBtn} onClick={() => navigate('/dashboard/dos/exam-sets')}>
                Manage →
              </button>
            </div>
            {activeExamSets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--pw-t3)' }}>
                <ClipboardList className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p style={{ fontSize: 13, margin: 0 }}>No exam sets currently active.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeExamSets.map((es) => (
                  <div
                    key={es.id}
                    style={{
                      background: 'var(--pw-s2, #101828)',
                      border: '1px solid var(--pw-border)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ color: 'var(--pw-t1)', fontSize: 13, fontWeight: 600 }}>
                      {es.name}
                    </div>
                    <div style={{ color: 'var(--pw-t3)', fontSize: 11, marginTop: 3 }}>
                      Term {es.term} · {es.year}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(es.target_classes.length > 0 ? es.target_classes.slice(0, 4) : ['All Classes']).map(
                        (cls) => (
                          <span
                            key={cls}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'rgba(129,140,248,0.12)',
                              color: '#818cf8',
                              border: '1px solid rgba(129,140,248,0.25)',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {cls}
                          </span>
                        ),
                      )}
                      {es.target_classes.length > 4 && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'rgba(129,140,248,0.08)',
                            color: '#818cf8',
                            fontSize: 10,
                          }}
                        >
                          +{es.target_classes.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <p style={{ ...sectionTitle, marginBottom: 14 }}>Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {QUICK_ACTIONS.map(({ icon, label, sub, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  background: 'var(--pw-s2, #101828)',
                  border: '1px solid var(--pw-border, rgba(255,255,255,0.07))',
                  borderRadius: 12,
                  padding: '14px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color + '55';
                  e.currentTarget.style.background = 'var(--pw-s3, #141c2e)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pw-border, rgba(255,255,255,0.07))';
                  e.currentTarget.style.background = 'var(--pw-s2, #101828)';
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ color: 'var(--pw-t1)', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ color: 'var(--pw-t3)', fontSize: 11, lineHeight: 1.4 }}>{sub}</div>
              </button>
            ))}
            {ADD_ACTIONS.map(({ icon, label, sub, modal, color }) => (
              <button
                key={modal}
                onClick={() => setDosModal(modal)}
                style={{
                  background: 'var(--pw-s2, #101828)',
                  border: '1px solid var(--pw-border, rgba(255,255,255,0.07))',
                  borderRadius: 12,
                  padding: '14px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color + '55';
                  e.currentTarget.style.background = 'var(--pw-s3, #141c2e)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pw-border, rgba(255,255,255,0.07))';
                  e.currentTarget.style.background = 'var(--pw-s2, #101828)';
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ color: 'var(--pw-t1)', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ color: 'var(--pw-t3)', fontSize: 11, lineHeight: 1.4 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add modals ──────────────────────────────────────────────────────── */}
      <NativeModal isOpen={dosModal === 'student'} onClose={() => setDosModal(null)} title="Enrol Student" size="xl">
        <AddStudentForm mode="modal" onCompleted={() => setDosModal(null)} onCancel={() => setDosModal(null)} />
      </NativeModal>
      <NativeModal isOpen={dosModal === 'teacher'} onClose={() => setDosModal(null)} title="Add Teacher" size="lg">
        <AddTeacherForm mode="modal" onCompleted={() => setDosModal(null)} onCancel={() => setDosModal(null)} />
      </NativeModal>
    </div>
  );
}
