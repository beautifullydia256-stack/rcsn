"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OldStudentsPage() {
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
        .from('old_students')
        .select('*')
        .eq('school_id', u.school_id)
        .order('graduation_year', { ascending: false });
      setRows(data || []);
    };
    load();
  }, [router]);

  const filtered = useMemo(() => {
    let out = rows;
    if (year) out = out.filter((r:any)=> String(r.graduation_year) === year);
    const term = q.trim().toLowerCase();
    if (term) out = out.filter((r:any)=> (r.name||'').toLowerCase().includes(term));
    return out;
  }, [rows, year, q]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Old Students</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/admin')}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by name" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
          <input type="number" value={year} onChange={(e)=>setYear(e.target.value)} placeholder="Year (e.g., 2025)" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Name</th>
                <th className="px-4 py-2 text-white/80">Final Class</th>
                <th className="px-4 py-2 text-white/80">Graduation Year</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-white/70">No old students found.</td></tr>
              ) : filtered.map((r:any)=> (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{r.name}</td>
                  <td className="px-4 py-2 text-white/90">{r.final_class}</td>
                  <td className="px-4 py-2 text-white/90">{r.graduation_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



