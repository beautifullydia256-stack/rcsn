"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { isValidEmailFormat } from "@/src/lib/emailValidator";

export default function CreateTeacherLoginPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = Array.isArray(params?.teacher_id) ? params?.teacher_id[0] : (params?.teacher_id as string);

  const [teacher, setTeacher] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: t } = await supabase.from('teachers').select('*').eq('teacher_id', teacherId).single();
      setTeacher(t || null);
      if (t?.email) setEmail(t.email);
      setSchoolId(t?.school_id || null);
    };
    if (teacherId) load();
  }, [teacherId, router]);

  const createLogin = async () => {
    setError(null); setSuccess(null);
    if (!teacher || !schoolId) { setError('Missing teacher or school context'); return; }
    if (!isValidEmailFormat(email)) { setError('Enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/create-teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        teacher_id: teacher.teacher_id,
        name: teacher.name,
        school_id: schoolId
      })
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || 'Failed to create login');
      return;
    }
    setSuccess('Teacher login created successfully!');
    setTimeout(() => router.push(`/dashboard/admin/teachers/${teacherId}`), 800);
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Create Teacher Login</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => router.push(`/dashboard/admin/teachers/${teacherId}`)}>Back</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
          {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
          {success && <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>}
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Teacher email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 pr-10" placeholder="Temporary password" value={password} onChange={(e)=>setPassword(e.target.value)} />
              <button type="button" aria-label="Toggle password visibility" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" onClick={()=>setShowPassword(p=>!p)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button disabled={saving} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50" onClick={createLogin}>{saving ? 'Creating...' : 'Create Login'}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


