"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { Users, BookOpen, User, ArrowRight } from "lucide-react";

export default function ClassesSettingsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Array<{ name: string; studentCount: number; teacherName?: string }>>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        
        // Try to get school_id from users table
        const { data: u, error: userError } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        
        let schoolIdValue: string | null = null;
        
        if (userError || !u?.school_id) {
          // Fallback to user metadata
          const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
          schoolIdValue = userMetadata.school_id;
        } else {
          schoolIdValue = u.school_id;
        }
        
        if (!schoolIdValue) {
          setLoading(false);
          return;
        }
        
        setSchoolId(schoolIdValue);
        
        // Get school type
        const { data: sch } = await supabase
          .from('schools')
          .select('type')
          .eq('school_id', schoolIdValue)
          .single();
        
        if (sch?.type) {
          setSchoolType(sch.type as 'Nursery/Primary' | 'Secondary');
        }
        
        // Generate class options based on school type
        const classOptions: string[] = [];
        if (sch?.type === 'Nursery/Primary') {
          classOptions.push('Nursery', 'Middle Class', 'Top Class');
          for (let i = 1; i <= 7; i++) classOptions.push(`Primary ${i}`);
        } else if (sch?.type === 'Secondary') {
          for (let i = 1; i <= 6; i++) classOptions.push(`Senior ${i}`);
        }
        
        // Get student counts for each class
        const { data: students } = await supabase
          .from('students')
          .select('current_class')
          .eq('school_id', schoolIdValue);
        
        const classCounts: Record<string, number> = {};
        (students || []).forEach((s: any) => {
          if (s.current_class) {
            classCounts[s.current_class] = (classCounts[s.current_class] || 0) + 1;
          }
        });
        
        // Get class teachers (if available)
        const { data: classTeachers } = await supabase
          .from('classes')
          .select('class_name, class_teacher_id')
          .eq('school_id', schoolIdValue);
        
        const teacherMap: Record<string, string> = {};
        (classTeachers || []).forEach((ct: any) => {
          if (ct.class_name && ct.class_teacher_id) {
            teacherMap[ct.class_name] = ct.class_teacher_id;
          }
        });
        
        // Get teacher names
        const teacherIds = Object.values(teacherMap);
        const { data: teachers } = teacherIds.length > 0
          ? await supabase
              .from('teachers')
              .select('teacher_id, name')
              .eq('school_id', schoolIdValue)
              .in('teacher_id', teacherIds)
          : { data: [] };
        
        const teacherNameMap: Record<string, string> = {};
        (teachers || []).forEach((t: any) => {
          teacherNameMap[t.teacher_id] = t.name;
        });
        
        // Build classes array
        const classesData = classOptions.map(className => ({
          name: className,
          studentCount: classCounts[className] || 0,
          teacherName: teacherMap[className] ? teacherNameMap[teacherMap[className]] : undefined
        }));
        
        setClasses(classesData);
      } catch (error) {
        console.error('Error loading classes:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div className="text-white">Loading classes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold">Class Management</h1>
            <p className="text-white/70 text-sm mt-1">Manage settings for all classes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/admin/settings')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Settings
            </button>
            <button
              onClick={() => router.push('/dashboard/admin')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-8 text-center text-white"
          >
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/50" />
            <p className="text-white/70">No classes available. Please set your school type in settings.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem, index) => (
              <motion.div
                key={classItem.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white hover:bg-white/15 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/settings/classes/${encodeURIComponent(classItem.name)}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{classItem.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{classItem.studentCount} students</span>
                      </div>
                      {classItem.teacherName && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{classItem.teacherName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/50" />
                </div>
                <div className="pt-4 border-t border-white/10">
                  <span className="text-xs text-white/60">Click to manage class settings</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

