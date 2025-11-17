"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

// Secondary School Exam Results
export function SecondaryExamResults() {
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
        // Get school_id from user metadata instead of users table to avoid 406 errors
        const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
        const schoolId = userMetadata.school_id;
        const teacherName = userMetadata.name || userMetadata.teacher_name;
        const userEmail = user.email;
        
        let teacherId = userMetadata.teacher_id as string | undefined;
        if (!teacherId && userEmail && schoolId) {
          const { data: t1 } = await supabase.from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .ilike('email', (userEmail || '').trim())
            .maybeSingle();
          teacherId = t1?.teacher_id as string | undefined;
        }
        if (!teacherId && (teacherName || '').trim() && schoolId) {
          const { data: t2 } = await supabase.from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .ilike('name', (teacherName || '').trim())
            .maybeSingle();
          teacherId = t2?.teacher_id as string | undefined;
        }

        // Get teacher's assigned classes and subjects
        let result: any[] = [];
        try {
          let apiRes = await fetch('/api/teacher/resolve-assignments', { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
          if (!apiRes.ok) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            if (origin) {
              apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
            }
          }
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
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-gray-900 dark:text-white text-2xl font-semibold">Insert Exam Results</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/teacher')}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        <div className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Select a class to input exam results. You can only input results for subjects you are assigned to teach.
        </div>

        {classesAssigned.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center"
          >
            <div className="text-gray-900 dark:text-white text-lg mb-2">No Classes Assigned</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">
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
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                  onClick={() => handleClassSelect(className)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{className}</h3>
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">Subjects you teach:</div>
                    <div className="flex flex-wrap gap-2">
                      {classSubjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs border border-blue-300 dark:border-blue-700"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
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

