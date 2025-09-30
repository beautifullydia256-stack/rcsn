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
        supabase.from('student_attendance').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id).eq('date', today),
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


