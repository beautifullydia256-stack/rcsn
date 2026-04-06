"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function HeadTeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any>({ students: 0, teachers: 0, attendance_students: 0, attendance_teachers: 0, exams: 0, discipline: 0 });
  const [notices, setNotices] = useState<any[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<Array<{ teacher_id: string; name: string; classes: number; subjects: number; periods: number }>>([]);
  const [pendingResults, setPendingResults] = useState<Array<{ exam_set_id: string; name: string; term: number; year: number; class_name: string; published?: boolean; published_at?: string }>>([]);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id, role').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);

      // Load KPIs (simple queries; can optimize with views later)
      const [{ count: studentsCount }, { count: teachersCount }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id),
      ]);

      // Attendance today (placeholder: counts from student_attendance and teacher_attendance_logs)
      const today = new Date().toISOString().slice(0,10);
      const [stuAtt, tchAtt] = await Promise.all([
        supabase.from('student_attendance').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id).eq('attendance_date', today),
        supabase.from('teacher_attendance_logs').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id).gte('punch_in', today)
      ]);

      // Upcoming exams/events
      const { count: examsCount } = await supabase.from('school_events').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id).gte('start_date', today);

      // Discipline alerts
      const { count: disciplineCount } = await supabase.from('discipline_records').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id).gte('incident_date', today);

      setKpis({
        students: studentsCount || 0,
        teachers: teachersCount || 0,
        attendance_students: stuAtt?.count || 0,
        attendance_teachers: tchAtt?.count || 0,
        exams: examsCount || 0,
        discipline: disciplineCount || 0,
      });

      // Load recent notices
      const { data: recent } = await supabase.from('notifications').select('*').eq('school_id', u.school_id).order('created_at', { ascending: false }).limit(5);
      setNotices(recent || []);

      // Teacher Load (classes/subjects count)
      try {
        const { data: links } = await supabase
          .from('teacher_class_subjects')
          .select('teacher_id, class_name, subject, teachers!inner(name)')
          .eq('school_id', u.school_id);
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
          periods: v.classes.size * v.subjects.size, // simple heuristic
        })).sort((a,b)=> b.periods - a.periods);
        setTeacherLoad(load);
      } catch {}

      // Pending Results to approve/publish (heuristic: exam sets active_for_input true => pending, per class subjects in assignments)
      try {
        const { data: activeSets } = await supabase
          .from('exam_sets')
          .select('id,name,term,year,target_classes,active_for_input')
          .eq('school_id', u.school_id)
          .eq('active_for_input', true)
          .order('year', { ascending: false })
          .order('term', { ascending: true });
        // Load publication statuses for these exam sets
        const setIds = (activeSets || []).map((es:any)=> es.id);
        let pubs: any[] = [];
        if (setIds.length > 0) {
          const { data: pubData } = await supabase
            .from('exam_set_publications')
            .select('exam_set_id,class_name,published,published_at')
            .eq('school_id', u.school_id)
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
        // Keep both published and pending; UI will indicate status
        setPendingResults(pending);
      } catch {}

      setLoading(false);
    };
    run();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-semibold">Head Teacher Dashboard</h1>
          <p className="text-white/70 text-sm">Academic command center</p>
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
              <button onClick={()=>router.push('/dashboard/admin/teachers')} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Manage</button>
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
              <button onClick={()=>router.push('/dashboard/head-teacher/headed-paper')} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white">Headed Paper</button>
              <button onClick={()=>router.push('/dashboard/admin/teachers')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">Manage Teachers</button>
              <button onClick={()=>router.push('/dashboard/admin/reports/generate')} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white">Generate Reports</button>
              <button onClick={()=>router.push('/dashboard/head-teacher/headteacher-comments-settings')} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white">Headteacher's Comments Settings</button>
            </div>
          </div>

          {/* Approvals / Pending Results */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-medium">Approvals</h2>
              <button onClick={()=>router.push('/dashboard/admin/reports/generate')} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Open Reports</button>
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
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">Published{r.published_at ? ` • ${new Date(r.published_at).toLocaleDateString()}` : ''}</span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-white/90">
                        <button
                          className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white mr-2"
                          onClick={async ()=>{
                            try {
                              const res = await fetch('/api/exam-sets/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_set_id: r.exam_set_id, class_name: r.class_name, publish: true }) });
                              const j = await res.json();
                              if (!res.ok) throw new Error(j.error || 'Failed');
                              alert('Published successfully');
                              // refresh row locally
                              setPendingResults(prev => prev.map(x => (x.exam_set_id===r.exam_set_id && x.class_name===r.class_name) ? { ...x, published: true, published_at: new Date().toISOString() } : x));
                            } catch (e:any) { alert(e.message); }
                          }}
                        >Publish</button>
                        <button
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
                          onClick={async ()=>{
                            try {
                              const res = await fetch('/api/exam-sets/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_set_id: r.exam_set_id, class_name: r.class_name, publish: false }) });
                              const j = await res.json();
                              if (!res.ok) throw new Error(j.error || 'Failed');
                              alert('Unpublished');
                              setPendingResults(prev => prev.map(x => (x.exam_set_id===r.exam_set_id && x.class_name===r.class_name) ? { ...x, published: false, published_at: null as any } : x));
                            } catch (e:any) { alert(e.message); }
                          }}
                        >Unpublish</button>
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

function Kpi({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className={`p-4 rounded-lg ${color} text-white`}>
      <div className="text-sm opacity-90">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </motion.div>
  );
}


