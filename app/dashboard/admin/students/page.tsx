"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function StudentsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      const { data: sch } = await supabase.from("schools").select("type").eq("school_id", data.school_id).single();
      setSchoolType((sch?.type as any) || null);
      const { data: studs } = await supabase.from("students").select("*").eq("school_id", data.school_id).order("created_at", { ascending: false });
      setRows(studs || []);
      setLoading(false);
    };
    run();
  }, [router]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) {
      out = out.filter((r) => (r.name || "").toLowerCase().includes(t) || (r.current_class || "").toLowerCase().includes(t));
    }
    if (klass) {
      out = out.filter((r) => (r.current_class || "") === klass);
    }
    return out;
  }, [q, klass, rows]);

  const remove = async (id: string, admission_number: string) => {
    if (!confirm("Delete this student? This will also delete their login credentials. This cannot be undone.")) return;
    
    try {
      // Delete student and auth user via API
      const response = await fetch('/api/admin/delete-student', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: id,
          admission_number: admission_number
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete student: ${errorData.error}`);
        return;
      }

      // Update UI
    setRows((prev) => prev.filter((r) => r.student_id !== id));
      alert('Student and all related data deleted successfully');
    } catch (error: any) {
      alert(`Failed to delete student: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">All Students</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <input className="w-full md:w-1/2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search by name or class" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className="w-full md:w-64 rounded-xl border border-white/10 bg-white text-black px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" value={klass} onChange={(e)=>setKlass(e.target.value)}>
            <option value="">All Classes</option>
            {schoolType === 'Nursery/Primary' && (
              <>
                <option value="Nursery /Baby Class">Nursery /Baby Class</option>
                <option value="Baby Class">Baby Class</option>
                <option value="Nursery">Nursery</option>
                <option value="Middle Class">Middle Class</option>
                <option value="Top Class">Top Class</option>
                {Array.from({ length: 7 }).map((_, i) => (
                  <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                ))}
              </>
            )}
            {schoolType === 'Secondary' && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
                ))}
              </>
            )}
          </select>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Name</th>
                <th className="px-4 py-2 text-white/80">Class</th>
                <th className="px-4 py-2 text-white/80">Status</th>
                <th className="px-4 py-2 text-white/80">Enrolled</th>
                <th className="px-4 py-2 text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-white/80">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-white/80">No students found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.student_id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white"><a className="underline-offset-4 hover:underline" href={`/dashboard/admin/students/${r.student_id}`}>{r.name}</a></td>
                    <td className="px-4 py-2 text-white/90">{r.current_class}</td>
                    <td className="px-4 py-2 text-white/90">{r.status}</td>
                    <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 transition-transform hover:scale-105 text-white" onClick={() => router.push(`/dashboard/admin/students/${r.student_id}`)}>View</button>
                        <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white" onClick={() => remove(r.student_id, r.admission_number)}>Delete</button>
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



