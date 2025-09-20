"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function RecentPaymentsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      const { data: pays } = await supabase
        .from("payments")
        .select("payment_id,student_id,amount,payment_method,created_at")
        .eq("school_id", data.school_id)
        .order("created_at", { ascending: false });
      const { data: studs } = await supabase
        .from("students")
        .select("student_id,name")
        .eq("school_id", data.school_id);
      const nameMap = new Map((studs || []).map((s: any) => [s.student_id, s.name]));
      setRows((pays || []).map((p: any) => ({ ...p, student_name: nameMap.get(p.student_id) })));
    };
    run();
  }, [router]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      (r.student_name || "").toLowerCase().includes(t) ||
      (r.student_id || "").toLowerCase().includes(t) ||
      (r.payment_method || "").toLowerCase().includes(t)
    );
  }, [q, rows]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Recent Payments</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>

        <div className="mb-4">
          <input className="w-full md:w-1/2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search by student, ID, method" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Student</th>
                <th className="px-4 py-2 text-white/80">Amount</th>
                <th className="px-4 py-2 text-white/80">Method</th>
                <th className="px-4 py-2 text-white/80">Date</th>
                <th className="px-4 py-2 text-white/80">Payment ID</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {filtered.map((r) => (
                <tr key={r.payment_id} id={r.payment_id} className="border-t border-white/10">
                  <td className="px-4 py-2 text-white">{r.student_name || r.student_id}</td>
                  <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.amount)}</td>
                  <td className="px-4 py-2 text-white/90">{r.payment_method}</td>
                  <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white font-mono text-xs">{r.payment_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



