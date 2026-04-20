"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import GlassBackground from "../../components/GlassBackground";
import { studentAttendanceRowIsPresent } from "@/src/lib/studentAttendanceRow";
import { schoolCalendarTodayIso } from "@/src/lib/schoolCalendarDate";

export default function ClassAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(Array.isArray(params?.class) ? params.class[0] : (params?.class as string));
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const presentCount = useMemo(() => Object.values(presentMap).filter(Boolean).length, [presentMap]);
  const totalCount = students.length;
  const absentCount = totalCount - presentCount;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const metaTeacherId = (user as any)?.user_metadata?.teacher_id || (user as any)?.raw_user_meta_data?.teacher_id;
      setTeacherId(metaTeacherId || user.id);
      // Get school_id from user metadata instead of users table to avoid 406 errors
      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) return router.push('/login');
      setSchoolId(schoolId);
      const { data: studs } = await supabase
        .from('students')
        .select('student_id,name,current_class')
        .eq('school_id', schoolId)
        .eq('current_class', className)
        .order('name');
      setStudents(studs || []);
      // load existing marks for today
      const today = schoolCalendarTodayIso();
      const { data: att } = await supabase
        .from("student_attendance")
        .select("student_id,present,status")
        .eq("school_id", schoolId)
        .eq("class_name", className)
        .eq("attendance_date", today);
      const map: Record<string, boolean> = {};
      (att || []).forEach((a) => {
        map[a.student_id] = studentAttendanceRowIsPresent(a);
      });
      setPresentMap(map);
    };
    if (className) load();
  }, [className, router]);

  const toggle = (id: string) => {
    setPresentMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const save = async () => {
    if (!schoolId || !teacherId) return;
    setSaving(true);
    const today = schoolCalendarTodayIso();
    const rows = students.map((s) => {
      const isPresent = !!presentMap[s.student_id];
      return {
        school_id: schoolId,
        class_name: className,
        student_id: s.student_id,
        teacher_id: teacherId,
        attendance_date: today,
        status: isPresent ? "present" : "absent",
        present: isPresent,
      };
    });
    const { error: upsertErr } = await supabase
      .from("student_attendance")
      .upsert(rows, { onConflict: "student_id,attendance_date" });
    setSaving(false);
    if (upsertErr) {
      alert(`Failed to save attendance: ${upsertErr.message}`);
      return;
    }
    alert('Attendance saved');
  };

  return (
    <div className="flex min-h-screen relative">
      <GlassBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Attendance – {className}</h1>
                <p className="text-white/70">
                  {presentCount} present, {absentCount} absent out of {totalCount} students
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/teacher/attendance')}>Back</button>
                <button disabled={saving} className="px-4 py-2 rounded-lg bg-green-600/80 hover:bg-green-600 text-white disabled:opacity-50" onClick={save}>{saving ? 'Saving...' : 'Save Attendance'}</button>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-center text-white">
                <div className="text-white/70 text-sm mb-1">Present</div>
                <div className="text-2xl font-semibold text-green-400">{presentCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-center text-white">
                <div className="text-white/70 text-sm mb-1">Absent</div>
                <div className="text-2xl font-semibold text-red-400">{absentCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-center text-white">
                <div className="text-white/70 text-sm mb-1">Total</div>
                <div className="text-2xl font-semibold text-white">{totalCount}</div>
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
            >
              {students.length === 0 ? (
                <div className="text-center py-12 text-white/70">
                  No students found for this class.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/5">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-white/90 font-medium">Name</th>
                        <th className="px-4 py-3 text-white/90 font-medium">Class</th>
                        <th className="px-4 py-3 text-white/90 font-medium">Present</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {students.map(s => (
                        <tr key={s.student_id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white">{s.name}</td>
                          <td className="px-4 py-3 text-white/70">{s.current_class}</td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={!!presentMap[s.student_id]} 
                                onChange={()=>toggle(s.student_id)} 
                              />
                              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-green-600"></div>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}


