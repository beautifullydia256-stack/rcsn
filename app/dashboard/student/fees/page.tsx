"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface PaymentRow {
  payment_id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  status: string;
  receipt_url?: string;
}

export default function StudentFeesPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [expected, setExpected] = useState<number>(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      // derive student_id from metadata or users link
      const meta = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      let sid = meta?.student_id as string | undefined;
      if (!sid) {
        const { data: ur } = await supabase.from('users').select('student_id').eq('user_id', user.id).maybeSingle();
        sid = ur?.student_id;
      }
      if (!sid) return router.push('/login');
      setStudentId(sid);
      const [pay, exp] = await Promise.all([
        supabase.from('payments').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
        supabase.from('students').select('expected_fee_amount').eq('student_id', sid).single()
      ]);
      setRows((pay.data as any[]) || []);
      setExpected(Number((exp.data as any)?.expected_fee_amount || 0));
      setLoading(false);
    };
    load();
  }, [router]);

  const filtered = useMemo(() => {
    let out = rows;
    const term = q.trim().toLowerCase();
    if (term) {
      out = out.filter(r => (r.payment_method || '').toLowerCase().includes(term));
    }
    if (status) out = out.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
    if (from) out = out.filter(r => new Date(r.created_at) >= new Date(from));
    if (to) out = out.filter(r => new Date(r.created_at) <= new Date(to));
    return out;
  }, [rows, q, status, from, to]);

  const approvedSum = filtered.filter(r => (r.status || '').toLowerCase() === 'approved').reduce((s, r) => s + Number(r.amount || 0), 0);
  const outstanding = Math.max(0, expected - approvedSum);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Fees & Receipts</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/student')}>Back to Dashboard</button>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-center">
              <div className="text-white/70 text-sm">Expected Fees</div>
              <div className="text-2xl font-semibold">{new Intl.NumberFormat('en-UG', { style:'currency', currency:'UGX', minimumFractionDigits:0 }).format(expected)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-center">
              <div className="text-white/70 text-sm">Approved Paid</div>
              <div className="text-2xl font-semibold">{new Intl.NumberFormat('en-UG', { style:'currency', currency:'UGX', minimumFractionDigits:0 }).format(approvedSum)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-center">
              <div className="text-white/70 text-sm">Outstanding</div>
              <div className="text-2xl font-semibold">{new Intl.NumberFormat('en-UG', { style:'currency', currency:'UGX', minimumFractionDigits:0 }).format(outstanding)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Filter by method (e.g., Cash, Mobile)" className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60" />
            <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-white text-black px-3 py-2">
              <option value="">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2" />
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left">
                  <th className="px-4 py-2 text-white/80">Date</th>
                  <th className="px-4 py-2 text-white/80">Amount</th>
                  <th className="px-4 py-2 text-white/80">Method</th>
                  <th className="px-4 py-2 text-white/80">Status</th>
                  <th className="px-4 py-2 text-white/80">Receipt</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-white/5">
                {filtered.map(r => (
                  <tr key={r.payment_id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-white">{new Intl.NumberFormat('en-UG',{ style:'currency', currency:'UGX', minimumFractionDigits:0 }).format(Number(r.amount||0))}</td>
                    <td className="px-4 py-2 text-white/90">{r.payment_method}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (r.status||'').toLowerCase()==='approved' ? 'bg-green-500/20 text-green-300' :
                        (r.status||'').toLowerCase()==='pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      {r.receipt_url ? (
                        <a href={r.receipt_url} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white">Download</a>
                      ) : (
                        <span className="text-white/60 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-white/70">No payments found for selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



