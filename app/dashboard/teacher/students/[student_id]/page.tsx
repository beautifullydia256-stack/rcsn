'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import GlassBackground from '../../components/GlassBackground';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '../../components/GlassButton';
import { 
  ArrowLeft, 
  User, 
  GraduationCap, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  BookOpen,
  Award,
  AlertCircle,
  Lightbulb,
  Mail,
  Phone,
  FileText,
  BarChart3
} from 'lucide-react';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = decodeURIComponent(Array.isArray(params?.student_id) ? params.student_id[0] : (params?.student_id as string));
  
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [studentId]);

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

      // Fetch student data
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (studentData) {
        setStudent(studentData);
      }

      // Fetch recent exam results
      const { data: results } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade, remarks, created_at, exam_set_id')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (results) {
        setExamResults(results);
      }

      // Fetch attendance data for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendance } = await supabase
        .from('student_attendance')
        .select('date, present')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (attendance) {
        setAttendanceData(attendance);
        const presentCount = attendance.filter(a => a.present).length;
        const totalCount = attendance.length;
        setRecentAttendance(totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate average performance
  const averageScore = useMemo(() => {
    if (examResults.length === 0) return 0;
    const total = examResults.reduce((sum, result) => {
      const percentage = (result.marks_obtained / result.total_marks) * 100;
      return sum + percentage;
    }, 0);
    return Math.round(total / examResults.length);
  }, [examResults]);

  // Get performance trend
  const performanceTrend = useMemo(() => {
    if (examResults.length < 2) return 'neutral';
    const recent = examResults.slice(0, 5);
    const older = examResults.slice(5, 10);
    if (older.length === 0) return 'neutral';
    
    const recentAvg = recent.reduce((sum, r) => sum + (r.marks_obtained / r.total_marks) * 100, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + (r.marks_obtained / r.total_marks) * 100, 0) / older.length;
    
    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'neutral';
  }, [examResults]);

  // Get subject performance
  const subjectPerformance = useMemo(() => {
    const subjectMap = new Map<string, { total: number; count: number }>();
    examResults.forEach(result => {
      const current = subjectMap.get(result.subject) || { total: 0, count: 0 };
      const percentage = (result.marks_obtained / result.total_marks) * 100;
      subjectMap.set(result.subject, {
        total: current.total + percentage,
        count: current.count + 1
      });
    });
    
    return Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        average: Math.round(data.total / data.count)
      }))
      .sort((a, b) => b.average - a.average);
  }, [examResults]);

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading student details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
          <Navbar onSearch={() => {}} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <GlassCard className="p-8 text-center">
              <p className="text-white/85">Student not found</p>
            </GlassCard>
          </main>
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
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => router.push('/dashboard/teacher/students')}
              className="flex items-center gap-2 text-white/85 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Students</span>
            </button>
          </motion.div>

          {/* Student Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className="p-6 relative overflow-hidden" hover>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                  {student.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{student.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-white/85">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      {student.current_class || 'N/A'}
                    </span>
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Admission: {student.admission_number || 'N/A'}
                    </span>
                    {student.student_email && (
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {student.student_email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard className="p-6 relative overflow-hidden" hover>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <Award className="w-6 h-6" style={{ color: '#4dabff' }} />
                  </div>
                  {performanceTrend === 'up' && (
                    <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
                  )}
                  {performanceTrend === 'down' && (
                    <TrendingDown className="w-5 h-5" style={{ color: '#ef4444' }} />
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">{averageScore}%</div>
                <div className="text-sm text-white/85">Average Performance</div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-6 relative overflow-hidden" hover>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <Calendar className="w-6 h-6" style={{ color: '#10b981' }} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{recentAttendance}%</div>
                <div className="text-sm text-white/85">Attendance (30 days)</div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6 relative overflow-hidden" hover>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <FileText className="w-6 h-6" style={{ color: '#ae79ff' }} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{examResults.length}</div>
                <div className="text-sm text-white/85">Exam Records</div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Subject Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: '#4dabff' }} />
                  Subject Performance
                </h2>
                {subjectPerformance.length > 0 ? (
                  <div className="space-y-3">
                    {subjectPerformance.map((item, index) => {
                      const isGood = item.average >= 70;
                      const isAverage = item.average >= 50 && item.average < 70;
                      return (
                        <div
                          key={item.subject}
                          className="p-3 rounded-xl"
                          style={{
                            background: isGood ? 'rgba(16, 185, 129, 0.15)' : isAverage ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            border: `1px solid ${isGood ? 'rgba(16, 185, 129, 0.3)' : isAverage ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{item.subject}</span>
                            <span 
                              className="text-sm font-semibold"
                              style={{ color: isGood ? '#10b981' : isAverage ? '#f59e0b' : '#ef4444' }}
                            >
                              {item.average}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${item.average}%`,
                                background: isGood ? '#10b981' : isAverage ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/55">
                    No exam results available
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Recent Exam Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: '#10b981' }} />
                  Recent Exam Results
                </h2>
                {examResults.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {examResults.slice(0, 10).map((result, index) => {
                      const percentage = Math.round((result.marks_obtained / result.total_marks) * 100);
                      const isGood = percentage >= 70;
                      const isAverage = percentage >= 50 && percentage < 70;
                      return (
                        <div
                          key={index}
                          className="p-3 rounded-xl"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{result.subject}</span>
                            <span 
                              className="text-sm font-semibold"
                              style={{ color: isGood ? '#10b981' : isAverage ? '#f59e0b' : '#ef4444' }}
                            >
                              {percentage}%
                            </span>
                          </div>
                          <div className="text-xs text-white/55">
                            {result.marks_obtained} / {result.total_marks} marks
                            {result.grade && ` • Grade: ${result.grade}`}
                          </div>
                          {result.remarks && (
                            <div className="text-xs text-white/75 mt-1">{result.remarks}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/55">
                    No exam results available
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* AI Insights */}
          {averageScore > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" style={{ color: '#ae79ff' }} />
                  AI Insights & Recommendations
                </h2>
                <div className="space-y-3">
                  {averageScore >= 80 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                        <div>
                          <div className="font-medium text-white mb-1">Excellent Performance</div>
                          <div className="text-sm text-white/85">
                            {student.name} is performing excellently with an average of {averageScore}%. 
                            Continue providing challenging assignments to maintain this momentum.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {averageScore >= 50 && averageScore < 80 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                        <div>
                          <div className="font-medium text-white mb-1">Room for Improvement</div>
                          <div className="text-sm text-white/85">
                            {student.name} has an average of {averageScore}%. Consider providing additional support 
                            in {subjectPerformance.filter(s => s.average < 70).map(s => s.subject).join(', ') || 'weaker subjects'}.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {averageScore < 50 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                        <div>
                          <div className="font-medium text-white mb-1">Needs Attention</div>
                          <div className="text-sm text-white/85">
                            {student.name} is struggling with an average of {averageScore}%. Immediate intervention 
                            recommended. Focus on foundational concepts in {subjectPerformance.filter(s => s.average < 50).map(s => s.subject).join(', ') || 'all subjects'}.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {recentAttendance < 80 && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                        <div>
                          <div className="font-medium text-white mb-1">Low Attendance</div>
                          <div className="text-sm text-white/85">
                            Attendance rate is {recentAttendance}%. Consider contacting parents to address attendance issues.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6"
          >
            <GlassCard className="p-6" hover>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/exam-results/${encodeURIComponent(student.current_class)}?student=${studentId}`)}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <FileText className="w-5 h-5" />
                  <span>View Exam Results</span>
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/attendance/${encodeURIComponent(student.current_class)}`)}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <Calendar className="w-5 h-5" />
                  <span>View Attendance</span>
                </GlassButton>
                {student.guardian_email && (
                  <GlassButton
                    variant="primary"
                    onClick={() => window.location.href = `mailto:${student.guardian_email}`}
                    className="flex items-center justify-center gap-2 p-4"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Contact Guardian</span>
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

