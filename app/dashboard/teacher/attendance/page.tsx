"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select Class for Attendance</h1>
              <p className="text-gray-600 dark:text-gray-400">Choose a class to record attendance</p>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              {classes.length === 0 ? (
                <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                  No classes assigned.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(c => (
                    <button 
                      key={c} 
                      onClick={()=>router.push(`/dashboard/teacher/attendance/${encodeURIComponent(c)}`)} 
                      className="px-4 py-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-left transition-colors"
                    >
                      <div className="text-blue-900 dark:text-blue-100 font-medium">{c}</div>
                      <div className="text-blue-700 dark:text-blue-300 text-sm mt-1">Record attendance</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}



