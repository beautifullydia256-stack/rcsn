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
      
      // Get school_id from user metadata instead of users table to avoid 406 errors
      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) return router.push('/login');
      setSchoolId(schoolId);
      
      // Use same logic as exam-results page
      let teacherId = userMetadata.teacher_id as string | undefined;
      
      if (!teacherId && user.email && schoolId) {
        const { data: t1 } = await supabase.from('teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .ilike('email', (user.email || '').trim())
          .maybeSingle();
        teacherId = t1?.teacher_id as string | undefined;
      }
      

      // Use API endpoint like exam-results page does
      let tcs: any[] = [];
      
      try {
        let apiRes = await fetch('/api/teacher/resolve-assignments', { 
          credentials: 'include', 
          cache: 'no-store' as any, 
          headers: { 'Cache-Control': 'no-store' } 
        });
        if (!apiRes.ok) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          if (origin) {
            apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { 
              credentials: 'include', 
              cache: 'no-store' as any, 
              headers: { 'Cache-Control': 'no-store' } 
            });
          }
        }
        if (apiRes.ok) {
          const payload = await apiRes.json();
          if (Array.isArray(payload?.assignments)) {
            tcs = payload.assignments;
          }
        }
      } catch (err) {
      }

      // Fallback: direct query if API fails
      if (tcs.length === 0 && teacherId) {
        const { data: tcsTry, error: tryErr } = await supabase
          .from('teacher_class_subjects')
          .select('class_name')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);
        if (!tryErr && tcsTry && tcsTry.length > 0) {
          tcs = tcsTry;
        }
      }


      const cls = Array.from(new Set((tcs || []).map((r: any) => r.class_name)));
      
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



