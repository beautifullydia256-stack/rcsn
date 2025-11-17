'use client';

import { useState, useEffect } from 'react';
import { supabase, Student } from '@/src/lib/supabase';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import { Search, Users, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '@/components/ui/GlassCard';

export default function StudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

      // Fetch teacher assignments to get classes
      const response = await fetch('/api/teacher/resolve-assignments', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.assignments && data.assignments.length > 0) {
          const classes = Array.from(new Set(data.assignments.map((a: any) => a.class_name)));
          
          const { data: studentsData, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .in('current_class', classes);
          
          if (!error && studentsData) {
            setStudents(studentsData || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.current_class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading students...</p>
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
        <Navbar onSearch={setSearchQuery} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                My Students
              </h1>
              <div className="flex items-center gap-2 text-sm text-white/85">
                <Users className="w-5 h-5" />
                <span>{students.length} students</span>
              </div>
            </div>
            <p className="text-white/85">
              View and manage students in your classes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <motion.div
                key={student.student_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard
                  className="p-6 cursor-pointer relative overflow-hidden"
                  hover
                  onClick={() => router.push(`/dashboard/teacher/students/${encodeURIComponent(student.student_id)}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1">
                        {student.name}
                      </h3>
                      <p className="text-sm text-white/85">
                        {student.current_class}
                      </p>
                      {student.admission_number && (
                        <p className="text-xs text-white/55 mt-1">
                          Admission: {student.admission_number}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {student.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/55">Status:</span>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: student.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: student.status === 'active' ? '#10b981' : 'rgba(255, 255, 255, 0.85)',
                        border: `1px solid ${student.status === 'active' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`
                      }}
                    >
                      {student.status}
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <GlassCard className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.55)' }} />
              <p className="text-white/85">
                {searchQuery ? 'No students found matching your search.' : 'No students found.'}
              </p>
            </GlassCard>
          )}
        </main>
      </div>
    </div>
  );
}

