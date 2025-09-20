"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function AdminQuickActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const router = useRouter();
  const [wifi, setWifi] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      setSchoolId(data?.school_id || null);
    };
    run();
  }, []);

  const saveWifi = async () => {
    if (!schoolId) return;
    setBusy("wifi");
    try {
      await supabase.from("schools").update({ wifi_ssid: wifi }).eq("school_id", schoolId);
      alert("WiFi SSID saved");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
      <div className="text-sm font-medium mb-3 text-white">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/students/add')}>Add Student</button>
        <button className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/teachers/add')}>Add Teacher</button>
        <button className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/parents/add')}>Add Parent</button>
        <button className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/accounts/add')}>Add Accounts Manager</button>
        <button className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/reports/generate')}>Generate Reports</button>
        <button className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/receipts/generate')}>Generate Receipts</button>
        <button className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/jobs/post')}>Post Job Vacancy</button>
        <button className="px-3 py-2 rounded-lg bg-slate-500 hover:bg-slate-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/settings')}>System Settings</button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input className="flex-1 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="WiFi SSID for teacher attendance" value={wifi} onChange={(e) => setWifi(e.target.value)} />
        <button className="px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 transition-transform hover:scale-105 text-white text-sm disabled:opacity-50" disabled={busy==="wifi"} onClick={saveWifi}>{busy==="wifi"?"Saving...":"Save"}</button>
      </div>

      {/* creation moved to dedicated pages */}
    </div>
  );
}



