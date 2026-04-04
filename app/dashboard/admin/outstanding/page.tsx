"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { loadOutstandingBalanceAggByStudentAllTerms } from "@/lib/adminFinanceTerm";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Row {
  student_id: string;
  student_name: string;
  current_class: string;
  parent_name?: string;
  parent_email?: string;
  amount_paid: number;
  balance: number;
  has_pending: boolean;
}

export default function OutstandingBalancesPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);

      const balanceByStudent = await loadOutstandingBalanceAggByStudentAllTerms(supabase, data.school_id);
      const owingIds = [...balanceByStudent.entries()]
        .filter(([, a]) => a.balance > 0)
        .map(([id]) => id);

      const { data: studs } =
        owingIds.length > 0
          ? await supabase
              .from("students")
              .select("student_id,name,current_class,status")
              .eq("school_id", data.school_id)
              .in("student_id", owingIds)
          : { data: [] as { student_id: string; name: string; current_class: string; status?: string }[] };

      const { data: parents } = await supabase
        .from("parents")
        .select("student_id,name,email")
        .eq("school_id", data.school_id);

      const parentByStudent = new Map((parents || []).map((p: any) => [p.student_id, { name: p.name, email: p.email }]));
      const studById = new Map((studs || []).map((s: any) => [s.student_id, s]));

      const computed: Row[] = owingIds.map((sid) => {
        const s = studById.get(sid) as { name?: string; current_class?: string; status?: string } | undefined;
        const agg = balanceByStudent.get(sid);
        const balance = agg?.balance ?? 0;
        const paid = agg?.total_paid ?? 0;
        const parent = parentByStudent.get(sid) || {};
        const status = s?.status || "";
        const inactive = status && status !== "active";
        const displayClass = s
          ? [s.current_class || "—", inactive ? `· ${status}` : ""].filter(Boolean).join(" ")
          : "—";
        return {
          student_id: sid,
          student_name: s?.name ?? "Student (not on current roster)",
          current_class: displayClass,
          parent_name: (parent as any).name,
          parent_email: (parent as any).email,
          amount_paid: paid,
          balance,
          has_pending: true,
        };
      });

      setRows(computed);
      setLoading(false);
    };
    run();
  }, [router]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      r.student_name.toLowerCase().includes(t) ||
      r.current_class.toLowerCase().includes(t) ||
      (r.parent_name || "").toLowerCase().includes(t) ||
      (r.parent_email || "").toLowerCase().includes(t)
    );
  }, [q, rows]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-xl font-semibold">Outstanding Balances</h1>
            <p className="text-white/60 text-sm mt-1">All terms combined — includes inactive or former students with unpaid balances.</p>
          </div>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>

        <div className="mb-4">
          <input className="w-full md:w-1/2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search by student, class, parent name/email" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Student</th>
                <th className="px-4 py-2 text-white/80">Class</th>
                <th className="px-4 py-2 text-white/80">Amount Paid</th>
                <th className="px-4 py-2 text-white/80">Balance</th>
                <th className="px-4 py-2 text-white/80">Parent Name</th>
                <th className="px-4 py-2 text-white/80">Parent Email</th>
                <th className="px-4 py-2 text-white/80">Status</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-white/80">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-white/80">No pending balances found.</td></tr>
              ) : (
                filtered.map(r => {
                  const total = r.amount_paid + r.balance;
                  const pct = total > 0 ? Math.round((r.amount_paid / total) * 100) : 0;
                  return (
                  <tr key={r.student_id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white">{r.student_name}</td>
                    <td className="px-4 py-2 text-white/90">{r.current_class}</td>
                    <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.amount_paid)}</td>
                    <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.balance)}</td>
                    <td className="px-4 py-2 text-white/90">{r.parent_name || '-'}</td>
                    <td className="px-4 py-2 text-white/90">{r.parent_email || '-'}</td>
                    <td className="px-4 py-2"><span className="px-2 py-1 text-xs rounded bg-amber-500/30 border border-amber-300/30 text-white">{pct}% paid</span></td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



