"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeacherAttendanceLanding() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      
      // Resolve teacher_id with multiple fallbacks (same as dashboard)
      let teacherRow = null as any;
      const metaTeacherId = (user as any)?.user_metadata?.teacher_id || (user as any)?.raw_user_meta_data?.teacher_id;
      if (metaTeacherId) {
        const { data: trow } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', u.school_id)
          .eq('teacher_id', metaTeacherId)
          .maybeSingle();
        if (trow) teacherRow = trow;
      }
      if (!teacherRow && user.email) {
        const { data: trow2 } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', u.school_id)
          .eq('email', user.email)
          .maybeSingle();
        if (trow2) teacherRow = trow2;
      }

      // Try to load assignments with multiple fallback strategies
      let tcs: any[] = [];
      
      // Build candidate teacher IDs to try
      const candidateTeacherIds: string[] = [];
      if (teacherRow?.teacher_id) candidateTeacherIds.push(teacherRow.teacher_id);
      candidateTeacherIds.push(user.id);

      // Try each candidate teacher ID
      console.log('Candidate teacher IDs:', candidateTeacherIds);
      for (const candidate of candidateTeacherIds) {
        console.log('Trying teacher_id:', candidate);
        const { data: tcsTry, error: tryErr } = await supabase
          .from('teacher_class_subjects')
          .select('class_name')
          .eq('teacher_id', candidate)
          .eq('school_id', u.school_id);
        console.log('Query result:', { tcsTry, tryErr });
        if (!tryErr && tcsTry && tcsTry.length > 0) {
          tcs = tcsTry;
          break;
        }
      }

      // Fallback: email-based join
      if ((!tcs || tcs.length === 0) && user.email) {
        const { data: tcsJoin, error: joinErr } = await supabase
          .from('teacher_class_subjects')
          .select('class_name, teachers!inner(email)')
          .eq('school_id', u.school_id)
          .ilike('teachers.email', (user.email || '').trim());
        if (!joinErr && tcsJoin && tcsJoin.length > 0) {
          tcs = tcsJoin;
        }
      }

      // Final fallback: RLS-only (relies on RLS policies to filter)
      if (!tcs || tcs.length === 0) {
        const { data: tcsRls } = await supabase
          .from('teacher_class_subjects')
          .select('class_name')
          .eq('school_id', u.school_id);
        if (tcsRls && tcsRls.length > 0) {
          tcs = tcsRls;
        }
      }

      const cls = Array.from(new Set((tcs || []).map((r: any) => r.class_name)));
      console.log('Final classes found:', cls);
      setClasses(cls as string[]);
    };
    load();
  }, [router]);

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Select Class for Attendance</h1>
          <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={()=>router.push('/dashboard/teacher')}>Back to Dashboard</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          {classes.length === 0 ? (
            <div className="text-white/80">No classes assigned.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classes.map(c => (
                <button key={c} onClick={()=>router.push(`/dashboard/teacher/attendance/${encodeURIComponent(c)}`)} className="px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-left">
                  <div className="text-white font-medium">{c}</div>
                  <div className="text-white/70 text-sm">Record attendance</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}



