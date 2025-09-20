"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ReportRecordsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [year, setYear] = useState<string>("");
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      const { data } = await supabase
        .from('reports')
        .select('report_id, student_id, file_url, created_at, template_name')
        .order('created_at', { ascending: false });
      setRows(data || []);
    };
    load();
  }, [router]);

  const filtered = useMemo(() => {
    let out = rows;
    const t = q.trim().toLowerCase();
    if (t) out = out.filter((r:any)=> (r.template_name||'').toLowerCase().includes(t));
    if (year) out = out.filter((r:any)=> String(new Date(r.created_at).getFullYear()) === year);
    return out;
  }, [rows, q, year]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Report Records</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/admin')}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Filter by template name" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
          <input type="number" value={year} onChange={(e)=>setYear(e.target.value)} placeholder="Year (e.g., 2025)" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Date</th>
                <th className="px-4 py-2 text-white/80">Student</th>
                <th className="px-4 py-2 text-white/80">Template</th>
                <th className="px-4 py-2 text-white/80">File</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/70">No reports found</td></tr>
              ) : filtered.map((r:any)=> (
                <tr key={r.report_id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white">{r.student_id}</td>
                  <td className="px-4 py-2 text-white/90">{r.template_name || '-'}</td>
                  <td className="px-4 py-2"><a href={r.file_url || '#'} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white">Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



