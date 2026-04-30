import { useEffect, useRef, useState } from 'react';
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

// KPI Component
function Kpi({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <div className={`p-4 rounded-lg ${color} text-white hover:-translate-y-1 transition-transform cursor-pointer`}>
      <div className="text-sm opacity-90">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function HeadTeacherDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const rolloverFired = useRef(false);

  // Head teacher specific state
  const [kpis, setKpis] = useState<any>({ 
    students: 0, 
    teachers: 0, 
    attendance_students: 0, 
    attendance_teachers: 0, 
    exams: 0, 
    discipline: 0 
  });
  const [notices, setNotices] = useState<any[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<Array<{ 
    teacher_id: string; 
    name: string; 
    classes: number; 
    subjects: number; 
    periods: number 
  }>>([]);
  const [pendingResults, setPendingResults] = useState<Array<{ 
    exam_set_id: string; 
    name: string; 
    term: number; 
    year: number; 
    class_name: string; 
    published?: boolean; 
    published_at?: string 
  }>>([]);

  const schoolId = schoolIdFromStore ?? undefined;

  const { data: authData, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'head-teacher', 'auth', user?.id ?? ''],
    queryFn: () => fetchHeadTeacherDashboardAuth(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    retry: false,
  });

  // Load head teacher dashboard data
  useEffect(() => {
    if (!authData?.schoolId) return;
    
    const loadDashboardData = async () => {
      try {
        const schoolId = authData.schoolId;
        
        // Load KPIs
        const [{ count: studentsCount }, { count: teachersCount }] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        ]);

        // Attendance today
        const today = schoolCalendarTodayIso();
        const [stuAtt, tchAtt] = await Promise.all([
          supabase.from('student_attendance').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('attendance_date', today),
          supabase.from('teacher_attendance_logs').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('punch_in', today)
        ]);

        // Upcoming exams/events
        const { count: examsCount } = await supabase.from('school_events').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('start_date', today);

        // Discipline alerts
        const { count: disciplineCount } = await supabase.from('discipline_records').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).gte('incident_date', today);

        setKpis({
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          attendance_students: stuAtt?.count || 0,
          attendance_teachers: tchAtt?.count || 0,
          exams: examsCount || 0,
          discipline: disciplineCount || 0,
        });

        // Load recent notices
        const { data: recent } = await supabase.from('notifications').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5);
        setNotices(recent || []);

        // Teacher Load
        try {
          const { data: links } = await supabase
            .from('teacher_class_subjects')
            .select('teacher_id, class_name, subject, teachers!inner(name)')
            .eq('school_id', schoolId);
          const map = new Map<string, { name: string; classes: Set<string>; subjects: Set<string> }>();
          (links || []).forEach((r: any) => {
            const key = r.teacher_id;
            if (!map.has(key)) map.set(key, { name: r.teachers?.name || 'Unknown', classes: new Set(), subjects: new Set() });
            const obj = map.get(key)!;
            if (r.class_name) obj.classes.add(r.class_name);
            if (r.subject) obj.subjects.add(r.subject);
          });
          const load = Array.from(map.entries()).map(([teacher_id, v]) => ({
            teacher_id,
            name: v.name,
            classes: v.classes.size,
            subjects: v.subjects.size,
            periods: v.classes.size * v.subjects.size,
          })).sort((a,b)=> b.periods - a.periods);
          setTeacherLoad(load);
        } catch {}

        // Pending Results
        try {
          const { data: activeSets } = await supabase
            .from('exam_sets')
            .select('id,name,term,year,target_classes,active_for_input')
            .eq('school_id', schoolId)
            .eq('active_for_input', true)
            .order('year', { ascending: false })
            .order('term', { ascending: true });
          
          const setIds = (activeSets || []).map((es:any)=> es.id);
          let pubs: any[] = [];
          if (setIds.length > 0) {
            const { data: pubData } = await supabase
              .from('exam_set_publications')
              .select('exam_set_id,class_name,published,published_at')
              .eq('school_id', schoolId)
              .in('exam_set_id', setIds);
            pubs = pubData || [];
          }

          const pending: Array<{ exam_set_id: string; name: string; term: number; year: number; class_name: string; published?: boolean; published_at?: string }> = [];
          (activeSets || []).forEach((es: any) => {
            const classes: string[] = es.target_classes && es.target_classes.length ? es.target_classes : [];
            classes.forEach((cn) => {
              const pub = pubs.find(p => p.exam_set_id === es.id && p.class_name === cn);
              pending.push({
                exam_set_id: es.id,
                name: es.name,
                term: es.term,
                year: es.year,
                class_name: cn,
                published: !!pub?.published,
                published_at: pub?.published_at || null
              });
            });
          });
          setPendingResults(pending);
        } catch {}
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [authData?.schoolId]);

  useEffect(() => {
    const sid = schoolId ?? authData?.schoolId;
    if (!sid || rolloverFired.current) return;
    rolloverFired.current = true;
    void (async () => {
      try {
        const nextYear = new Date().getFullYear() + 1;
        const { ensureAcademicYearExists } = await import('@/lib/ensureAcademicYear');
        await ensureAcademicYearExists(nextYear);
        const { error: rpcError } = await supabase.rpc('automatic_term3_rollover');
        if (rpcError) throw rpcError;
      } catch {
        // Silent fail
      }
    })();
  }, [schoolId, authData?.schoolId]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ac-border)] border-t-emerald-500" />
          <p className="ac-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError && error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    const missingSchoolId = message === 'MISSING_SCHOOL_ID';
    const displayMessage = missingSchoolId
      ? 'Your account is not linked to a school. Please contact support to complete your account setup.'
      : message;

    if (message === 'Not authenticated') {
      navigate(`/login?returnUrl=${encodeURIComponent(HT_HOME)}`);
      return null;
    }
    if (message === 'Not authorized') {
      navigate('/dashboard');
      return null;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="mb-4 text-4xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-bold ac-text-primary">Account Setup Required</h2>
          <p className="mb-6 ac-text-secondary">{displayMessage}</p>
          {missingSchoolId && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-emerald-600 px-6 py-3 text-white transition-colors hover:bg-emerald-700"
            >
              Complete School Setup
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="ac-text-secondary hover:opacity-100 opacity-80 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isPending || !authData?.schoolId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ac-border)] border-t-emerald-500" />
          <p className="ac-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handlePublishResult = async (examSetId: string, className: string, publish: boolean) => {
    try {
      const res = await fetch('/api/exam-sets/publish', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ exam_set_id: examSetId, class_name: className, publish }) 
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      
      alert(publish ? 'Published successfully' : 'Unpublished');
      setPendingResults(prev => prev.map(x => 
        (x.exam_set_id === examSetId && x.class_name === className) 
          ? { ...x, published: publish, published_at: publish ? new Date().toISOString() : null as any } 
          : x
      ));
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-white/60 mb-1">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/90" />
              Academic Overview
            </span>
          </div>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mb-1">Head Teacher Dashboard</h1>
          <p className="text-white/70">Academic command center for school oversight</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Kpi title="Students" value={kpis.students} color="bg-blue-500" />
          <Kpi title="Teachers" value={kpis.teachers} color="bg-green-500" />
          <Kpi title="Student Attendance Today" value={kpis.attendance_students} color="bg-indigo-500" />
          <Kpi title="Teacher Attendance Today" value={kpis.attendance_teachers} color="bg-purple-500" />
          <Kpi title="Upcoming Exams/Events" value={kpis.exams} color="bg-amber-500" />
          <Kpi title="Discipline Alerts" value={kpis.discipline} color="bg-rose-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teacher Management */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Teacher & Class Management</h2>
              <button 
                onClick={() => navigate('/dashboard/admin/teachers')} 
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
              >
                Manage
              </button>
            </div>
            <ul className="text-white/80 text-sm list-disc pl-5 space-y-1">
              <li>Appoint Class Teachers</li>
              <li>Assign Subjects to Teachers</li>
              <li>View Teacher Load</li>
            </ul>
            {/* Teacher Load Table */}
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-white/80">Teacher</th>
                    <th className="px-4 py-2 text-left text-white/80">Classes</th>
                    <th className="px-4 py-2 text-left text-white/80">Subjects</th>
                    <th className="px-4 py-2 text-left text-white/80">Load</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                  {teacherLoad.length === 0 ? (
                    <tr><td className="px-4 py-3 text-white/70" colSpan={4}>No assignments</td></tr>
                  ) : teacherLoad.map(t => (
                    <tr key={t.teacher_id} className="border-t border-white/10">
                      <td className="px-4 py-2 text-white">{t.name}</td>
                      <td className="px-4 py-2 text-white/90">{t.classes}</td>
                      <td className="px-4 py-2 text-white/90">{t.subjects}</td>
                      <td className="px-4 py-2 text-white/90">{t.periods} periods/wk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notices & Events */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6">
            <h2 className="text-white font-medium mb-3">Recent Notices</h2>
            {notices.length === 0 ? (
              <div className="text-white/70 text-sm">No recent notices</div>
            ) : (
              <div className="space-y-3">
                {notices.map(n => (
                  <div key={n.notification_id} className="p-3 rounded border border-white/10 bg-white/5">
                    <div className="text-white font-medium text-sm">{n.title}</div>
                    <div className="text-white/80 text-xs">{n.category} • {new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 lg:col-span-3">
            <h2 className="text-white font-medium mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('/dashboard/head-teacher/headed-paper')} 
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
              >
                Headed Paper
              </button>
              <button 
                onClick={() => navigate('/dashboard/admin/students')} 
                className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white"
              >
                Students / UACE profiles
              </button>
              <button 
                onClick={() => navigate('/dashboard/admin/teachers')} 
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Manage Teachers
              </button>
              <button 
                onClick={() => navigate('/dashboard/admin/reports/generate')} 
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white"
              >
                Generate Reports
              </button>
              <button 
                onClick={() => navigate('/dashboard/head-teacher/headteacher-comments-settings')} 
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
              >
                Headteacher's Comments Settings
              </button>
            </div>
          </div>

          {/* Approvals / Pending Results */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-medium">Approvals</h2>
              <button 
                onClick={() => navigate('/dashboard/admin/reports/generate')} 
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
              >
                Open Reports
              </button>
            </div>
            <div className="text-white/80 text-sm mb-2">Exam Sets (Active for Input)</div>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-white/80">Exam Set</th>
                    <th className="px-4 py-2 text-left text-white/80">Class</th>
                    <th className="px-4 py-2 text-left text-white/80">Term/Year</th>
                    <th className="px-4 py-2 text-left text-white/80">Status</th>
                    <th className="px-4 py-2 text-left text-white/80">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                  {pendingResults.length === 0 ? (
                    <tr><td className="px-4 py-3 text-white/70" colSpan={5}>No pending items</td></tr>
                  ) : pendingResults.map(r => (
                    <tr key={r.exam_set_id + r.class_name} className="border-t border-white/10">
                      <td className="px-4 py-2 text-white">{r.name}</td>
                      <td className="px-4 py-2 text-white/90">{r.class_name || 'All Classes'}</td>
                      <td className="px-4 py-2 text-white/90">Term {r.term}, {r.year}</td>
                      <td className="px-4 py-2 text-white/90">
                        {r.published ? (
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                            Published{r.published_at ? ` • ${new Date(r.published_at).toLocaleDateString()}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-white/90">
                        <button
                          className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white mr-2"
                          onClick={() => handlePublishResult(r.exam_set_id, r.class_name, true)}
                        >
                          Publish
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
                          onClick={() => handlePublishResult(r.exam_set_id, r.class_name, false)}
                        >
                          Unpublish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
