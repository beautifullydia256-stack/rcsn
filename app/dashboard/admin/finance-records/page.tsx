"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function FinanceRecordsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [year, setYear] = useState<string>("");
  const [term, setTerm] = useState<string>("");
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('school_id', u.school_id)
        .order('created_at', { ascending: false });
      setRows(data || []);
    };
    load();
  }, [router]);

  const filtered = useMemo(() => {
    let out = rows;
    const t = q.trim().toLowerCase();
    if (t) out = out.filter((r:any)=> (r.payment_method||'').toLowerCase().includes(t));
    if (year || term) {
      // If term/year provided, filter by school_terms window
      out = out.filter((r:any)=> {
        const dt = new Date(r.created_at).toISOString().slice(0,10);
        if (!year) return true;
        const y = String(new Date(r.created_at).getFullYear());
        if (y !== year) return false;
        if (!term) return true;
        const tm = parseInt(term);
        const m = new Date(r.created_at).getMonth()+1;
        // heuristic windows (1: Jan–Apr, 2: May–Jul, 3: Aug–Dec) for display
        return (tm===1 && m<=4) || (tm===2 && m>=5 && m<=7) || (tm===3 && m>=8);
      });
    }
    return out;
  }, [rows, q, year, term]);

  const fmt = (n:number)=> new Intl.NumberFormat('en-UG',{ style:'currency', currency:'UGX', minimumFractionDigits:0 }).format(n);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Finance Records</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/admin')}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Filter by method" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
          <input type="number" value={year} onChange={(e)=>setYear(e.target.value)} placeholder="Year (e.g., 2025)" className="rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 placeholder:text-white/60" />
          <select value={term} onChange={(e)=>setTerm(e.target.value)} className="rounded-lg border border-white/10 bg-white text-black px-3 py-2">
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Date</th>
                <th className="px-4 py-2 text-white/80">Amount</th>
                <th className="px-4 py-2 text-white/80">Method</th>
                <th className="px-4 py-2 text-white/80">Status</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/70">No records</td></tr>
              ) : filtered.map((r:any)=> (
                <tr key={r.payment_id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white">{fmt(Number(r.amount||0))}</td>
                  <td className="px-4 py-2 text-white/90">{r.payment_method}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      (r.status||'').toLowerCase()==='approved' ? 'bg-green-500/20 text-green-300' :
                      (r.status||'').toLowerCase()==='pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



