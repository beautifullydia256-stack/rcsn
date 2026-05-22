import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';

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
  if (userRole !== 'head_teacher' && userRole !== 'admin') throw new Error('Not authorized');
  if (!userData.school_id) throw new Error('MISSING_SCHOOL_ID');

  const { data: schoolData, error: schoolError } = await supabase
    .from('schools')
    .select('school_id, name')
    .eq('school_id', userData.school_id)
    .single();

  if (schoolError || !schoolData) throw new Error('Your school record could not be found. Please contact support.');

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

function statusBadge(published: boolean): React.CSSProperties {
  return published
    ? { padding: '3px 10px', borderRadius: 99, background: 'rgba(16,217,168,0.12)', color: '#10d9a8', border: '1px solid rgba(16,217,168,0.25)', fontSize: 11, fontWeight: 600 }
    : { padding: '3px 10px', borderRadius: 99, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', fontSize: 11, fontWeight: 600 };
}

// ─── KPI config ────────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  { key: 'students',             label: 'Total Students',    icon: '👨‍🎓', color: '#10d9a8' },
  { key: 'teachers',             label: 'Teachers',          icon: '📚',  color: '#3d8ef8' },
  { key: 'attendance_students',  label: 'Students Present',  icon: '✅',  color: '#818cf8' },
  { key: 'attendance_teachers',  label: 'Teachers Present',  icon: '📋',  color: '#a78bfa' },
  { key: 'exams',                label: 'Upcoming Events',   icon: '📅',  color: '#fbbf24' },
  { key: 'discipline',           label: 'Discipline Alerts', icon: '⚠️',  color: '#fb7185' },
] as const;

// ─── Quick action config ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: '📄', label: 'Headed Paper',         sub: 'Letterhead & templates',      path: '/dashboard/head-teacher/headed-paper',                         color: '#fbbf24' },
  { icon: '👨‍🎓', label: 'Students',            sub: 'Records & UACE profiles',     path: '/dashboard/head-teacher/students',                              color: '#10d9a8' },
  { icon: '📚', label: 'Teachers',              sub: 'Staff & class assignments',   path: '/dashboard/head-teacher/teachers',                              color: '#3d8ef8' },
  { icon: '📊', label: 'Generate Reports',      sub: 'Exam results & report cards', path: '/dashboard/head-teacher/reports/generate',                      color: '#818cf8' },
  { icon: '💬', label: 'Comments Settings',     sub: 'Head teacher remarks',        path: '/dashboard/head-teacher/headteacher-comments-settings',         color: '#a78bfa' },
  { icon: '📋', label: 'Attendance',            sub: 'Daily attendance overview',   path: '/dashboard/head-teacher/attendance',                            color: '#34d399' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function HeadTeacherDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);

  const [kpis, setKpis] = useState({ students: 0, teachers: 0, attendance_students: 0, attendance_teachers: 0, exams: 0, discipline: 0 });
  const [notices, setNotices] = useState<any[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<Array<{ teacher_id: string; name: string; classes: number; subjects: number; periods: number }>>([]);
  const [pendingResults, setPendingResults] = useState<Array<{ exam_set_id: string; name: string; term: number; year: number; class_name: string; published?: boolean; published_at?: string }>>([]);

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

        const [{ count: studentsCount }, { count: teachersCount }, stuAtt, tchAtt, { count: examsCount }, { count: disciplineCount }] =
          await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('student_attendance').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('attendance_date', today),
            supabase.from('teacher_attendance_logs').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('punch_in', today),
            supabase.from('school_events').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('start_date', today),
            supabase.from('discipline_records').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('incident_date', today),
          ]);

        setKpis({
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          attendance_students: stuAtt?.count || 0,
          attendance_teachers: tchAtt?.count || 0,
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
          const { data: links } = await supabase
            .from('teacher_class_subjects')
            .select('teacher_id, class_name, subject, teachers!inner(name)')
            .eq('school_id', schoolId);
          const map = new Map<string, { name: string; classes: Set<string>; subjects: Set<string> }>();
          (links || []).forEach((r: any) => {
            if (!map.has(r.teacher_id)) map.set(r.teacher_id, { name: r.teachers?.name || 'Unknown', classes: new Set(), subjects: new Set() });
            const obj = map.get(r.teacher_id)!;
            if (r.class_name) obj.classes.add(r.class_name);
            if (r.subject) obj.subjects.add(r.subject);
          });
          setTeacherLoad(
            Array.from(map.entries())
              .map(([teacher_id, v]) => ({ teacher_id, name: v.name, classes: v.classes.size, subjects: v.subjects.size, periods: v.classes.size * v.subjects.size }))
              .sort((a, b) => b.periods - a.periods),
          );
        } catch {}

        try {
          const { data: activeSets } = await supabase
            .from('exam_sets')
            .select('id,name,term,year,target_classes,active_for_input')
            .eq('school_id', schoolId)
            .eq('active_for_input', true)
            .order('year', { ascending: false })
            .order('term', { ascending: true });

          const setIds = (activeSets || []).map((es: any) => es.id);
          let pubs: any[] = [];
          if (setIds.length > 0) {
            const { data: pubData } = await supabase
              .from('exam_set_publications')
              .select('exam_set_id,class_name,published,published_at')
              .eq('school_id', schoolId)
              .in('exam_set_id', setIds);
            pubs = pubData || [];
          }
          const pending: typeof pendingResults = [];
          (activeSets || []).forEach((es: any) => {
            const classes: string[] = es.target_classes?.length ? es.target_classes : [];
            classes.forEach((cn) => {
              const pub = pubs.find((p) => p.exam_set_id === es.id && p.class_name === cn);
              pending.push({ exam_set_id: es.id, name: es.name, term: es.term, year: es.year, class_name: cn, published: !!pub?.published, published_at: pub?.published_at || undefined });
            });
          });
          setPendingResults(pending);
        } catch {}
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    }

    void load();
  }, [authData?.schoolId]);

  // ── Publish / unpublish ────────────────────────────────────────────────────

  const handlePublishResult = async (examSetId: string, className: string, publish: boolean) => {
    try {
      const res = await fetch('/api/exam-sets/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_set_id: examSetId, class_name: className, publish }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setPendingResults((prev) =>
        prev.map((x) =>
          x.exam_set_id === examSetId && x.class_name === className
            ? { ...x, published: publish, published_at: publish ? new Date().toISOString() : undefined }
            : x,
        ),
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (!user?.id || isPending || !authData?.schoolId) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--pw-border, rgba(255,255,255,0.1))',
          borderTopColor: 'var(--pw-teal, #10d9a8)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--pw-t3, #94a8d0)', fontSize: 13 }}>Loading dashboard…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError && error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (message === 'Not authenticated') { navigate(`/login?returnUrl=${encodeURIComponent(HT_HOME)}`); return null; }
    if (message === 'Not authorized') { navigate('/dashboard'); return null; }
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <h2 style={{ color: 'var(--pw-t1)', fontSize: 18, fontWeight: 700, margin: 0 }}>Account Setup Required</h2>
        <p style={{ color: 'var(--pw-t3)', fontSize: 13, maxWidth: 360 }}>{message}</p>
        <button onClick={() => navigate('/login')} style={{ ...ghostBtn, marginTop: 8 }}>Back to Login</button>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = authData.displayName?.split(' ')[0] || 'Head Teacher';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pw-bg, #05080f)' }}>
      <div
        style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}
        className="pb-24 md:pb-10"
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
          className="pr-12 md:pr-0"
        >
          <div>
            <div style={{ color: 'var(--pw-t3, #94a8d0)', fontSize: 12, letterSpacing: '0.4px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pw-teal, #10d9a8)', display: 'inline-block', flexShrink: 0 }} />
              {todayStr}
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pw-t1, #f8fafc)', lineHeight: 1.25 }}>
              Good {getGreeting()}, {firstName}
            </h1>
            <p style={{ margin: '5px 0 0', color: 'var(--pw-t2, #c5d4ef)', fontSize: 13 }}>
              {authData.schoolName}
            </p>
          </div>
          <div style={{ background: 'var(--pw-s1, #0b1120)', border: '1px solid var(--pw-border)', borderRadius: 12, padding: '10px 18px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: 'var(--pw-teal, #10d9a8)', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              {new Date().getDate()}
            </div>
            <div style={{ color: 'var(--pw-t3, #94a8d0)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>
              {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" style={{ marginBottom: 20 }}>
          {KPI_CONFIG.map(({ key, label, icon, color }) => (
            <div
              key={key}
              style={{ ...card, padding: '16px', cursor: 'default', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = color + '55')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--pw-border, rgba(255,255,255,0.07))')}
            >
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
                {kpis[key as keyof typeof kpis]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--pw-t3, #94a8d0)', marginTop: 5, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Main row: Teacher Load + Notices ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>

          {/* Teacher Workload */}
          <div style={card} className="lg:col-span-2">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <div>
                <p style={sectionTitle}>Teacher Workload</p>
                <p style={sectionSub}>Class assignments &amp; subject loads</p>
              </div>
              <button style={ghostBtn} onClick={() => navigate('/dashboard/head-teacher/teachers')}>Manage →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Teacher</th>
                    <th style={{ ...th, textAlign: 'center' }}>Classes</th>
                    <th style={{ ...th, textAlign: 'center' }}>Subjects</th>
                    <th style={th}>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherLoad.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ ...td, color: 'var(--pw-t3)', textAlign: 'center', padding: '24px 14px' }}>
                        No assignments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    teacherLoad.map((t) => (
                      <tr
                        key={t.teacher_id}
                        style={{ borderBottom: '1px solid var(--pw-border)', transition: 'background 0.12s' }}
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
                        <td style={{ ...td, color: 'var(--pw-t2, #c5d4ef)' }}>{t.periods} periods/wk</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Notices */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <p style={sectionTitle}>Recent Notices</p>
              <button style={ghostBtn} onClick={() => navigate('/dashboard/head-teacher/notifications')}>All →</button>
            </div>
            {notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--pw-t3)' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: 13, margin: 0 }}>No recent notices</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notices.map((n) => (
                  <div
                    key={n.notification_id}
                    style={{ background: 'var(--pw-s2, #101828)', border: '1px solid var(--pw-border)', borderRadius: 10, padding: '12px 14px' }}
                  >
                    <p style={{ color: 'var(--pw-t1)', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{n.title}</p>
                    <p style={{ color: 'var(--pw-t3)', fontSize: 11, margin: 0 }}>
                      {n.category} · {new Date(n.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <p style={{ ...sectionTitle, marginBottom: 14 }}>Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <div style={{ color: 'var(--pw-t1)', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                <div style={{ color: 'var(--pw-t3)', fontSize: 11, lineHeight: 1.4 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Exam Approvals ───────────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div>
              <p style={sectionTitle}>Exam Result Approvals</p>
              <p style={sectionSub}>Active exam sets awaiting publication</p>
            </div>
            <button style={ghostBtn} onClick={() => navigate('/dashboard/head-teacher/exam-sets')}>All Exams →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Exam Set</th>
                  <th style={th}>Class</th>
                  <th style={th}>Term / Year</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...td, color: 'var(--pw-t3)', textAlign: 'center', padding: '28px 14px' }}>
                      No exam sets currently active for input.
                    </td>
                  </tr>
                ) : (
                  pendingResults.map((r) => (
                    <tr
                      key={r.exam_set_id + r.class_name}
                      style={{ borderBottom: '1px solid var(--pw-border)', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pw-s2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={td}>{r.name}</td>
                      <td style={{ ...td, color: 'var(--pw-t2)' }}>{r.class_name || 'All Classes'}</td>
                      <td style={{ ...td, color: 'var(--pw-t2)' }}>Term {r.term}, {r.year}</td>
                      <td style={td}>
                        <span style={statusBadge(!!r.published)}>
                          {r.published
                            ? `Published${r.published_at ? ' · ' + new Date(r.published_at).toLocaleDateString('en-GB') : ''}`
                            : 'Pending'}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handlePublishResult(r.exam_set_id, r.class_name, true)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(16,217,168,0.15)', color: '#10d9a8', fontFamily: 'inherit' }}
                          >
                            Publish
                          </button>
                          <button
                            onClick={() => handlePublishResult(r.exam_set_id, r.class_name, false)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(251,113,133,0.15)', color: '#fb7185', fontFamily: 'inherit' }}
                          >
                            Unpublish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
