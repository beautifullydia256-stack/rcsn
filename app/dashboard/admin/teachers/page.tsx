"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeachersListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      const { data: tchs } = await supabase.from("teachers").select("*").eq("school_id", data.school_id).order("created_at", { ascending: false });
      setRows(tchs || []);
      setLoading(false);
    };
    run();
  }, [router]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(t) || (r.email || "").toLowerCase().includes(t));
  }, [q, rows]);

  const remove = async (id: string) => {
    if (!confirm("Delete this teacher? This cannot be undone.")) return;
    await supabase.from("teachers").delete().eq("teacher_id", id);
    setRows((prev) => prev.filter((r) => r.teacher_id !== id));
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">All Teachers</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin/teachers/add')}>Add Teacher</button>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
          </div>
        </div>
        <div className="mb-4">
          <input className="w-full md:w-1/2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search by name or email" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Name</th>
                <th className="px-4 py-2 text-white/80">Phone</th>
                <th className="px-4 py-2 text-white/80">Email</th>
                <th className="px-4 py-2 text-white/80">Hired</th>
                <th className="px-4 py-2 text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/80">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/80">No teachers found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.teacher_id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white"><a className="underline-offset-4 hover:underline" href={`/dashboard/admin/teachers/${r.teacher_id}`}>{r.name}</a></td>
                    <td className="px-4 py-2 text-white/90">{r.phone || '-'}</td>
                    <td className="px-4 py-2 text-white/90">{r.email}</td>
                    <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 transition-transform hover:scale-105 text-white" onClick={() => router.push(`/dashboard/admin/teachers/${r.teacher_id}`)}>View</button>
                      <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white" onClick={() => remove(r.teacher_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}



