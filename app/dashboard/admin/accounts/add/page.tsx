"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AddAccountsManagerPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
    };
    run();
  }, [router]);

  const save = async () => {
    if (!schoolId || !email || !name) return;
    setSaving(true);
    try {
      // Create auth user invite (send magic link or temp password in real app). For demo, just add profile row.
      // The accounts manager role is 'admin' scoped to this school via school_id.
      const { error } = await supabase.from('users').insert({
        email,
        role: 'admin',
        name,
        school_id: schoolId
      });
      if (error) throw error;
      alert('Accounts manager added. Ensure they have a Supabase Auth user with this email.');
      setEmail(""); setName("");
    } catch (e: any) {
      alert(`Failed to add accounts manager: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Add Accounts Manager</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-50" disabled={saving} onClick={save}>{saving?"Saving...":"Save"}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



