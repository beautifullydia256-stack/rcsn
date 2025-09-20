"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase, School } from "@/src/lib/supabase";

export function Widgets() {
  const [latestSchools, setLatestSchools] = useState<School[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      const [s, j, l, n] = await Promise.all([
        supabase.from("schools").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("library").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setLatestSchools(s.data || []);
      setJobs(j.data || []);
      setLibrary(l.data || []);
      setNotes(n.data || []);
    };
    run();
  }, []);

  const approveJob = async (job_id: string, status: "Approved" | "Rejected") => {
    await supabase.from("jobs").update({ status }).eq("job_id", job_id);
    setJobs((prev) => prev.map((j) => (j.job_id === job_id ? { ...j, status } : j)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-sky-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm font-medium mb-2 text-white">Latest Schools</div>
        <div className="space-y-2">
          {latestSchools.map((s) => (
            <div key={s.school_id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-white">{s.name}</div>
                <div className="text-xs text-white/80">{s.location} • {s.type}</div>
              </div>
              <div className="text-xs text-white/70">{new Date(s.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm font-medium mb-2 text-white">Job Board Management</div>
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.job_id} className="border rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{j.title}</div>
                  <div className="text-xs text-white/80">{j.location}</div>
                </div>
                <div className="text-xs text-white/80">{j.status || "Pending"}</div>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="px-2 py-1 text-xs rounded bg-green-500 hover:bg-green-400 transition-transform hover:scale-105 text-white" onClick={() => approveJob(j.job_id, "Approved")}>Approve</button>
                <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white" onClick={() => approveJob(j.job_id, "Rejected")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-rose-500/20 to-rose-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm font-medium mb-2 text-white">Notifications</div>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className="text-sm text-white/80">No notifications.</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="text-sm">
                <div className="font-medium text-white">{n.title}</div>
                <div className="text-xs text-white/80">{n.message}</div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}



