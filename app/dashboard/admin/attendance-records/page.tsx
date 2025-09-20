"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AttendanceRecordsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [role, setRole] = useState<'students'|'teachers'>('students');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      // default: load today
      const today = new Date().toISOString().slice(0,10);
      setFrom(today); setTo(today);
      const { data } = await supabase
        .from('student_attendance')
        .select('student_id,class_name,date,present')
        .eq('school_id', u.school_id)
        .eq('date', today);
      setRows(data || []);
    };
    load();
  }, [router]);

  const reload = async () => {
    if (!schoolId || !from || !to) return;
    if (role === 'students') {
      const { data } = await supabase
        .from('student_attendance')
        .select('student_id,class_name,date,present')
        .eq('school_id', schoolId)
        .gte('date', from)
        .lte('date', to);
      setRows(data || []);
    } else {
      const { data } = await supabase
        .from('attendance')
        .select('teacher_id,type,timestamp')
        .eq('school_id', schoolId)
        .gte('timestamp', `${from} 00:00:00`)
        .lte('timestamp', `${to} 23:59:59`);
      setRows(data || []);
    }
  };

  useEffect(() => { reload(); }, [role, from, to]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Attendance Records</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/admin')}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={role} onChange={(e)=>setRole(e.target.value as any)} className="rounded-lg border border-white/10 bg-white text-black px-3 py-2">
            <option value="students">Students</option>
            <option value="teachers">Teachers</option>
          </select>
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white" />
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white" />
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left">
                {role==='students' ? (
                  <>
                    <th className="px-4 py-2 text-white/80">Student</th>
                    <th className="px-4 py-2 text-white/80">Class</th>
                    <th className="px-4 py-2 text-white/80">Date</th>
                    <th className="px-4 py-2 text-white/80">Present</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2 text-white/80">Teacher</th>
                    <th className="px-4 py-2 text-white/80">Type</th>
                    <th className="px-4 py-2 text-white/80">Time</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/70">No records</td></tr>
              ) : role==='students' ? rows.map((r:any, idx:number)=> (
                <tr key={idx} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{r.student_id}</td>
                  <td className="px-4 py-2 text-white/90">{r.class_name}</td>
                  <td className="px-4 py-2 text-white/90">{r.date}</td>
                  <td className="px-4 py-2">{r.present ? 'Yes' : 'No'}</td>
                </tr>
              )) : rows.map((r:any, idx:number)=> (
                <tr key={idx} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{r.teacher_id}</td>
                  <td className="px-4 py-2 text-white/90">{r.type}</td>
                  <td className="px-4 py-2 text-white/90">{new Date(r.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



