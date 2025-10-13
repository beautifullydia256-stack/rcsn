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
      
      // Use same logic as exam-results page
      let teacherId = user.user_metadata?.teacher_id as string | undefined;
      const schoolId = u.school_id;
      
      if (!teacherId && user.email && schoolId) {
        const { data: t1 } = await supabase.from('teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .ilike('email', (user.email || '').trim())
          .maybeSingle();
        teacherId = t1?.teacher_id as string | undefined;
      }
      
      console.log('🔍 ATTENDANCE PAGE DEBUG - Teacher resolution (exam-results logic):', { 
        metaTeacherId: user.user_metadata?.teacher_id,
        resolvedTeacherId: teacherId,
        userEmail: user.email,
        schoolId: schoolId
      });

      // Try to load assignments with the resolved teacher_id
      let tcs: any[] = [];
      
      if (teacherId) {
        const { data: tcsTry, error: tryErr } = await supabase
          .from('teacher_class_subjects')
          .select('class_name')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);
        console.log('🔍 ATTENDANCE PAGE DEBUG - Direct query result:', { 
          tcsTry: tcsTry ? JSON.stringify(tcsTry) : 'null', 
          tryErr: tryErr ? JSON.stringify(tryErr) : 'null',
          teacherId: teacherId,
          schoolId: schoolId
        });
        if (!tryErr && tcsTry && tcsTry.length > 0) {
          tcs = tcsTry;
        }
      }
      
      // Fallback: rely on RLS with school scope only
      if (tcs.length === 0) {
        const { data: rlsData } = await supabase
          .from('teacher_class_subjects')
          .select('class_name')
          .eq('school_id', schoolId);
        console.log('🔍 ATTENDANCE PAGE DEBUG - RLS fallback result:', {
          rlsData: rlsData ? JSON.stringify(rlsData) : 'null',
          length: rlsData ? rlsData.length : 0,
          schoolId: schoolId
        });
        if (rlsData && rlsData.length > 0) tcs = rlsData;
      }


      const cls = Array.from(new Set((tcs || []).map((r: any) => r.class_name)));
      console.log('🔍 ATTENDANCE PAGE DEBUG - Final classes found:', cls);
      
      // Force show the data with alert for debugging
      if (cls.length === 0) {
        alert(`DEBUG: No classes found. TeacherId: ${teacherId}, SchoolId: ${schoolId}, TCS length: ${tcs.length}`);
      } else {
        alert(`DEBUG: Classes found: ${cls.join(', ')}`);
      }
      
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



