"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

export default function TeacherExamResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const returnUrl = encodeURIComponent('/dashboard/teacher/exam-results');
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        // Resolve teacher_id within this school (metadata -> teachers by email -> teachers by name)
        const { data: userRow } = await supabase.from('users').select('school_id,name,email').eq('user_id', user.id).single();
        let teacherId = user.user_metadata?.teacher_id as string | undefined;
        const schoolId = userRow?.school_id as string | undefined;
        if (!teacherId && userRow?.email && schoolId) {
          const { data: t1 } = await supabase.from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .ilike('email', (userRow.email || '').trim())
            .maybeSingle();
          teacherId = t1?.teacher_id as string | undefined;
        }
        if (!teacherId && (userRow?.name || '').trim() && schoolId) {
          const { data: t2 } = await supabase.from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .ilike('name', (userRow?.name || '').trim())
            .maybeSingle();
          teacherId = t2?.teacher_id as string | undefined;
        }

        // Get teacher's assigned classes and subjects
        let result: any[] = [];
        try {
          const apiRes = await fetch('/api/teacher/resolve-assignments', { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
          if (apiRes.ok) {
            const payload = await apiRes.json();
            if (Array.isArray(payload?.assignments)) result = payload.assignments;
          }
        } catch {}

        if (!result || result.length === 0) {
          const { data, error } = await supabase
            .from('teacher_class_subjects')
            .select('class_name, subject')
            .eq('school_id', schoolId)
            .eq('teacher_id', teacherId);
          if (error) throw error;
          result = data || [];
        }

        // Final fallback: rely on RLS with school scope only
        if (result.length === 0) {
          const { data: rlsData } = await supabase
            .from('teacher_class_subjects')
            .select('class_name, subject')
            .eq('school_id', schoolId);
          if (rlsData && rlsData.length > 0) result = rlsData;
        }

        setAssignments(result);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load your assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const classesAssigned = Array.from(new Set(assignments.map(a => a.class_name)));

  const handleClassSelect = (className: string) => {
    router.push(`/dashboard/teacher/exam-results/${encodeURIComponent(className)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-2xl font-semibold">Insert Exam Results</h1>
          <button
            onClick={() => router.push('/dashboard/teacher')}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        <div className="text-white/80 text-sm mb-6">
          Select a class to input exam results. You can only input results for subjects you are assigned to teach.
        </div>

        {classesAssigned.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-8 text-center"
          >
            <div className="text-white/80 text-lg mb-2">No Classes Assigned</div>
            <div className="text-white/60 text-sm">
              You haven't been assigned to any classes yet. Contact your administrator.
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classesAssigned.map((className) => {
              const classSubjects = assignments
                .filter(a => a.class_name === className)
                .map(a => a.subject);
              
              return (
                <motion.div
                  key={className}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 text-white cursor-pointer hover:bg-white/15 transition-all"
                  onClick={() => handleClassSelect(className)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{className}</h3>
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-white/80 text-sm mb-2">Subjects you teach:</div>
                    <div className="flex flex-wrap gap-2">
                      {classSubjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs border border-blue-500/30"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-white/60 text-sm">
                    Click to input exam results for {className}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

