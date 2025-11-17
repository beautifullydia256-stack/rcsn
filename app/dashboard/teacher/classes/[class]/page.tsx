'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import GlassBackground from '../../components/GlassBackground';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '../../components/GlassButton';
import { Users, BookOpen, Calendar, FileText, Eye, GraduationCap, ArrowLeft } from 'lucide-react';

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(Array.isArray(params?.class) ? params.class[0] : (params?.class as string));
  
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [className]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) {
        router.push('/login');
        return;
      }

      setSchoolId(schoolId);

      // Fetch students in this class
      const { data: studentsData } = await supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', schoolId)
        .eq('current_class', className)
        .order('name');

      if (studentsData) {
        setStudents(studentsData);
        setStudentCount(studentsData.length);
      }

      // Fetch subjects for this class from teacher assignments
      try {
        const response = await fetch('/api/teacher/resolve-assignments', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.assignments && Array.isArray(data.assignments)) {
            const classSubjects = new Set<string>();
            data.assignments.forEach((assignment: any) => {
              if (assignment.class_name === className && assignment.subject) {
                classSubjects.add(assignment.subject);
              }
            });
            setSubjects(Array.from(classSubjects));
          }
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
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
            <p className="text-white/85">Loading class details...</p>
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => router.push('/dashboard/teacher/classes')}
              className="flex items-center gap-2 mb-4 text-white/85 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Classes</span>
            </button>
            
            <GlassCard className="p-6 relative overflow-hidden" hover>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{className}</h1>
                    <div className="flex items-center gap-4 text-white/85">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {studentCount} Students
                      </span>
                      {subjects.length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <GlassCard className="p-6" hover>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/attendance/${encodeURIComponent(className)}`)}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Take Attendance</span>
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/exam-results/${encodeURIComponent(className)}`)}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <FileText className="w-5 h-5" />
                  <span>Enter Exam Results</span>
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/students?class=${encodeURIComponent(className)}`)}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <Eye className="w-5 h-5" />
                  <span>View Students</span>
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>

          {/* Subjects */}
          {subjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4">Subjects</h2>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{
                        background: 'rgba(77, 171, 255, 0.2)',
                        color: '#4dabff',
                        border: '1px solid rgba(77, 171, 255, 0.4)'
                      }}
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Students List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6" hover>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Students ({studentCount})</h2>
              </div>
              
              {students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.map((student, index) => (
                    <motion.div
                      key={student.student_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onClick={() => router.push(`/dashboard/teacher/students/${student.student_id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {student.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{student.name}</div>
                          <div className="text-xs text-white/55">Student ID: {student.student_id}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/55">
                  No students found in this class.
                </div>
              )}
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

