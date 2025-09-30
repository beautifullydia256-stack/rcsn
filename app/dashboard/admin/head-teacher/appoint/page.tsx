"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

export default function AppointHeadTeacherPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [emailInvite, setEmailInvite] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      const { data: t } = await supabase.from('teachers').select('teacher_id,name,email').eq('school_id', u.school_id).order('name');
      setTeachers(t || []);
    };
    run();
  }, [router]);

  const appoint = async () => {
    if (!schoolId || !selectedTeacherId) return;
    setCreating(true);
    try {
      // 1) Create or update user with role head_teacher
      const teacher = teachers.find(t => t.teacher_id === selectedTeacherId);
      if (!teacher) throw new Error('Teacher not found');

      let authUserId: string | null = null;
      if (emailInvite) {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(teacher.email, { data: { role: 'head_teacher', school_id: schoolId, teacher_id: selectedTeacherId } as any });
        if (error) throw error;
        authUserId = data?.user?.id || null;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({ email: teacher.email, password: password || Math.random().toString(36).slice(2,10), user_metadata: { role: 'head_teacher', school_id: schoolId, teacher_id: selectedTeacherId } });
        if (error) throw error;
        authUserId = data.user?.id || null;
      }

      // 2) Upsert into users table
      if (authUserId) {
        await supabase.from('users').upsert({ user_id: authUserId, role: 'head_teacher', email: teacher.email, school_id: schoolId, name: teacher.name });
      }

      alert('Head Teacher appointed successfully');
      router.push('/dashboard/head-teacher');
    } catch (e:any) {
      alert(e.message || 'Failed to appoint Head Teacher');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-semibold">Appoint Head Teacher</h1>
            <p className="text-white/70 text-sm">Select a teacher and create their login with the head teacher role.</p>
          </div>
          <button onClick={()=>router.push('/dashboard/admin')} className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Back</button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">Select Teacher</label>
            <select value={selectedTeacherId} onChange={(e)=>setSelectedTeacherId(e.target.value)} className="w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2">
              <option value="">Select...</option>
              {teachers.map(t => (
                <option key={t.teacher_id} value={t.teacher_id}>{t.name} — {t.email}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-white/80 text-sm flex items-center gap-2">
              <input type="checkbox" checked={emailInvite} onChange={(e)=>setEmailInvite(e.target.checked)} />
              Send email invite
            </label>
            {!emailInvite && (
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Set password" className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2" />
            )}
          </div>

          <button disabled={!selectedTeacherId || creating} onClick={appoint} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50">
            {creating ? 'Appointing...' : 'Appoint Head Teacher'}
          </button>
        </div>
      </div>
    </div>
  );
}


