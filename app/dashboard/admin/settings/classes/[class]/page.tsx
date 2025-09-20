"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export default function ClassSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const className = decodeURIComponent(Array.isArray(params?.class) ? params.class[0] : (params?.class as string));

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [classTeacherId, setClassTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [students, setStudents] = useState<any[]>([]);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);

      // Load teachers list for dropdown
      const { data: tchs } = await supabase.from('teachers').select('teacher_id,name').eq('school_id', u.school_id).order('name');
      setTeachers(tchs || []);

      // Load students in this class
      const { data: studs } = await supabase.from('students').select('student_id,name,current_class,created_at').eq('school_id', u.school_id).eq('current_class', className);
      setStudents(studs || []);
      setStudentCount((studs || []).length);

      // TODO: load subjects and class teacher from settings tables once created
    };
    run();
  }, [className, router]);

  // Ensure browser back goes to the dashboard instead of login or previous page
  useEffect(() => {
    const handlePopState = () => {
      router.replace('/dashboard/admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    setSubjects((prev) => Array.from(new Set([...prev, newSubject.trim()])));
    setNewSubject("");
    // TODO: persist to subjects-per-class table
  };

  const removeSubject = (s: string) => {
    setSubjects((prev) => prev.filter((x) => x !== s));
    // TODO: persist removal
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Class Settings – {className}</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin/settings')}>Back to Settings</button>
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-white font-medium mb-3">Subjects in this Class</div>
          <div className="flex gap-2 mb-3">
            <input value={newSubject} onChange={(e)=>setNewSubject(e.target.value)} placeholder="Add subject (e.g., Mathematics)" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60 flex-1" />
            <button className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2" onClick={addSubject}>Add</button>
          </div>
          {subjects.length === 0 ? (
            <div className="text-white/70 text-sm">No subjects added yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <span key={s} className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-sm">
                  {s} <button className="ml-2 text-red-300 hover:text-red-200" onClick={()=>removeSubject(s)}>×</button>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-white font-medium mb-3">Class Teacher</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="w-full rounded-xl border border-white/10 bg-white text-black px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" value={classTeacherId} onChange={(e)=>setClassTeacherId(e.target.value)}>
              <option value="">Select Teacher</option>
              {teachers.map(t => (
                <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
              ))}
            </select>
            <button className="rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2">Save Class Teacher</button>
          </div>
          <div className="text-white/70 text-sm mt-2">The class teacher can manage class subjects, students and reports.</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium">Students in {className}</div>
            <div className="text-white/80 text-sm">Total: {studentCount}</div>
          </div>
          {students.length === 0 ? (
            <div className="text-white/70 text-sm">No students in this class.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-2 text-white/80">Name</th>
                    <th className="px-4 py-2 text-white/80">Enrolled</th>
                    <th className="px-4 py-2 text-white/80">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                  {students.map(s => (
                    <tr key={s.student_id} className="border-t border-white/10">
                      <td className="px-4 py-2 text-white">{s.name}</td>
                      <td className="px-4 py-2 text-white/90">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <button className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-500 text-white" onClick={()=>setShowReports(true)}>Report Forms</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {showReports && (
            <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/10 text-sm text-white/90">Report list placeholder. Selecting a student will show recent report with option to view older reports.</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


