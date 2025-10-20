"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

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
      const today = new Date().toISOString().slice(0,10);
      const { data: att } = await supabase
        .from('student_attendance')
        .select('student_id,present')
        .eq('school_id', schoolId)
        .eq('class_name', className)
        .eq('date', today);
      const map: Record<string, boolean> = {};
      (att || []).forEach(a => { map[a.student_id] = !!a.present; });
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
    const today = new Date().toISOString().slice(0,10);
    const rows = students.map(s => ({
      school_id: schoolId,
      class_name: className,
      student_id: s.student_id,
      teacher_id: teacherId,
      date: today,
      present: !!presentMap[s.student_id]
    }));
    // Reliable save: remove existing for this class/date/school, then insert fresh
    const { error: delErr } = await supabase
      .from('student_attendance')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_name', className)
      .eq('date', today);
    if (delErr) {
      setSaving(false);
      alert(`Failed to save attendance (delete step): ${delErr.message}`);
      return;
    }
    const { error: insErr } = await supabase
      .from('student_attendance')
      .insert(rows);
    setSaving(false);
    if (insErr) {
      alert(`Failed to save attendance: ${insErr.message}`);
      return;
    }
    alert('Attendance saved');
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Attendance – {className}</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/teacher/attendance')}>Back</button>
            <button disabled={saving} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50" onClick={save}>{saving ? 'Saving...' : 'Save Attendance'}</button>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-white text-center">
            <div className="text-white/70 text-sm">Present</div>
            <div className="text-2xl font-semibold">{presentCount}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-white text-center">
            <div className="text-white/70 text-sm">Absent</div>
            <div className="text-2xl font-semibold">{absentCount}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-white text-center">
            <div className="text-white/70 text-sm">Total</div>
            <div className="text-2xl font-semibold">{totalCount}</div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          {students.length === 0 ? (
            <div className="text-white/80">No students found for this class.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    <th className="px-4 py-2 text-white/80">Name</th>
                    <th className="px-4 py-2 text-white/80">Class</th>
                    <th className="px-4 py-2 text-white/80">Present</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                  {students.map(s => (
                    <tr key={s.student_id} className="border-t border-white/10">
                      <td className="px-4 py-2 text-white">{s.name}</td>
                      <td className="px-4 py-2 text-white/90">{s.current_class}</td>
                      <td className="px-4 py-2">
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={!!presentMap[s.student_id]} onChange={()=>toggle(s.student_id)} />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white/0 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-green-600"></div>
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
    </div>
  );
}


