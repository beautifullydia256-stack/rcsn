"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Attendance – {className}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {presentCount} present, {absentCount} absent out of {totalCount} students
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={()=>router.push('/dashboard/teacher/attendance')}>Back</button>
                <button disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50" onClick={save}>{saving ? 'Saving...' : 'Save Attendance'}</button>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Present</div>
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">{presentCount}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Absent</div>
                <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{absentCount}</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{totalCount}</div>
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                  No students found for this class.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Name</th>
                        <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Class</th>
                        <th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Present</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {students.map(s => (
                        <tr key={s.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{s.name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.current_class}</td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={!!presentMap[s.student_id]} 
                                onChange={()=>toggle(s.student_id)} 
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-green-600"></div>
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


