'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ClassCards from '../components/ClassCards';
import GlassBackground from '../components/GlassBackground';
import { motion } from 'framer-motion';

export default function ClassesPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) return;

      setSchoolId(schoolId);

      // Fetch teacher class assignments
      const response = await fetch('/api/teacher/resolve-assignments', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.assignments && Array.isArray(data.assignments)) {
          // Transform API response: group subjects by class_name
          const classMap = new Map<string, { class_name: string; subjects: string[]; student_count: number }>();
          
          data.assignments.forEach((assignment: any) => {
            const className = assignment.class_name;
            const subject = assignment.subject;
            
            if (className && subject) {
              if (!classMap.has(className)) {
                classMap.set(className, {
                  class_name: className,
                  subjects: [],
                  student_count: 0
                });
              }
              
              const classData = classMap.get(className)!;
              if (!classData.subjects.includes(subject)) {
                classData.subjects.push(subject);
              }
            }
          });
          
          // Fetch student counts for each class
          const classNames = Array.from(classMap.keys());
          if (classNames.length > 0 && schoolId) {
            try {
              const { data: studentsData } = await supabase
                .from('students')
                .select('current_class')
                .eq('school_id', schoolId)
                .in('current_class', classNames);
              
              if (studentsData) {
                const counts = new Map<string, number>();
                studentsData.forEach((student: any) => {
                  const className = student.current_class;
                  if (className) {
                    counts.set(className, (counts.get(className) || 0) + 1);
                  }
                });
                
                // Update student counts
                classMap.forEach((classData, className) => {
                  classData.student_count = counts.get(className) || 0;
                });
              }
            } catch (err) {
              console.error('Error fetching student counts:', err);
            }
          }
          
          setAssignments(Array.from(classMap.values()));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
      <GlassBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              My Classes
            </h1>
            <p className="text-white/85 mt-2">
              View and manage your assigned classes
            </p>
          </motion.div>

          <ClassCards assignments={assignments} />
        </main>
      </div>
    </div>
  );
}

