"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AddParentPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      const { data: studs } = await supabase.from("students").select("student_id,name,current_class").eq("school_id", data.school_id);
      setStudents(studs || []);
    };
    run();
  }, [router]);

  const save = async () => {
    if (!schoolId || !name || !email || !phone || !studentId) return;
    setSaving(true);
    await supabase.from("parents").insert({ school_id: schoolId, name, email, phone, student_id: studentId });
    setSaving(false);
    setName("");
    setEmail("");
    setPhone("");
    setStudentId("");
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Add Parent</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/dashboard/admin')}>Back to Dashboard</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <select className="w-full rounded-lg border border-white/10 bg-white text-black px-3 py-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>{s.name} - {s.current_class}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-50" disabled={saving} onClick={save}>{saving?"Saving...":"Save & Add Another"}</button>
            <button className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white" onClick={async ()=>{ await save(); router.push('/dashboard/admin'); }}>Save & Return</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



