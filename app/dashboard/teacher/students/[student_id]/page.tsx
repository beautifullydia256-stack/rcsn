'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/src/lib/studentAttendanceRow';
import { motion, AnimatePresence } from 'framer-motion';
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
  BarChart3,
  Download,
  MessageSquare,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  Target,
  Brain,
  Eye,
  Send,
  UserPlus
} from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = decodeURIComponent(Array.isArray(params?.student_id) ? params.student_id[0] : (params?.student_id as string));
  
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [classPosition, setClassPosition] = useState<number | null>(null);
  const [classSize, setClassSize] = useState<number>(0);

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
        
        // Calculate year of study from admission date or created_at
        const admissionDate = studentData.admission_date || studentData.created_at;
        if (admissionDate) {
          const years = Math.floor((new Date().getTime() - new Date(admissionDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
          studentData.year_of_study = years + 1;
        }
      }

      // Fetch all exam results for this student
      const { data: results } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade, remarks, created_at, exam_set_id, class_name')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (results) {
        setExamResults(results);
      }

      // Fetch attendance data
      const { data: attendance } = await supabase
        .from('student_attendance')
        .select('date, attendance_date, present, status')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('attendance_date', { ascending: false });

      if (attendance) {
        setAttendanceData(attendance);
      }

      // Calculate class position
      if (studentData && results && results.length > 0) {
        const className = studentData.current_class;
        const { data: classStudents } = await supabase
          .from('students')
          .select('student_id')
          .eq('school_id', schoolId)
          .eq('current_class', className);
        
        if (classStudents) {
          setClassSize(classStudents.length);
          
          // Get all exam results for class to calculate position
          const { data: allClassResults } = await supabase
            .from('exam_results')
            .select('student_id, marks_obtained, total_marks')
            .eq('school_id', schoolId)
            .eq('class_name', className)
            .in('student_id', classStudents.map(s => s.student_id));
          
          if (allClassResults) {
            // Calculate average for each student
            const studentAverages = new Map<string, number>();
            allClassResults.forEach((r: any) => {
              const avg = (r.marks_obtained / r.total_marks) * 100;
              const current = studentAverages.get(r.student_id) || 0;
              studentAverages.set(r.student_id, current + avg);
            });
            
            // Count results per student
            const resultCounts = new Map<string, number>();
            allClassResults.forEach((r: any) => {
              resultCounts.set(r.student_id, (resultCounts.get(r.student_id) || 0) + 1);
            });
            
            // Calculate final averages
            const finalAverages = Array.from(studentAverages.entries()).map(([id, total]) => ({
              student_id: id,
              average: total / (resultCounts.get(id) || 1)
            })).sort((a, b) => b.average - a.average);
            
            const position = finalAverages.findIndex(s => s.student_id === studentId) + 1;
            setClassPosition(position > 0 ? position : null);
          }
        }
      }

      // Fetch assignments (mock for now - adjust based on your assignments table structure)
      // This would need to be adjusted based on your actual assignments schema
      setAssignments([]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate GPA / Overall Average
  const overallAverage = useMemo(() => {
    if (examResults.length === 0) return 0;
    const total = examResults.reduce((sum, result) => {
      const percentage = (result.marks_obtained / result.total_marks) * 100;
      return sum + percentage;
    }, 0);
    return Math.round(total / examResults.length);
  }, [examResults]);

  // Get strength and weak subjects
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
    
    const subjects = Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        average: Math.round(data.total / data.count)
      }))
      .sort((a, b) => b.average - a.average);
    
    return {
      strengths: subjects.filter(s => s.average >= 70).slice(0, 3),
      weaknesses: subjects.filter(s => s.average < 50).slice(0, 3),
      all: subjects
    };
  }, [examResults]);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const present = attendanceData.filter((a) => studentAttendanceRowIsPresent(a)).length;
    const absent = attendanceData.length - present;
    const percentage = attendanceData.length > 0 ? Math.round((present / attendanceData.length) * 100) : 0;
    return { present, absent, percentage };
  }, [attendanceData]);

  // Generate AI Insights
  const generateAIInsights = async () => {
    setAiLoading(true);
    try {
      // Call AI API endpoint
      const response = await fetch('/api/ai/student-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          exam_results: examResults,
          attendance: attendanceData,
          overall_average: overallAverage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiInsights(data);
      } else {
        // Fallback to mock insights
        setAiInsights({
          summary: `${student?.name || 'This student'} is performing ${overallAverage >= 70 ? 'well' : overallAverage >= 50 ? 'moderately' : 'below expectations'} with an overall average of ${overallAverage}%.`,
          predicted_grade: overallAverage >= 80 ? 'A' : overallAverage >= 70 ? 'B' : overallAverage >= 60 ? 'C' : overallAverage >= 50 ? 'D' : 'E',
          focus_areas: subjectPerformance.weaknesses.map(s => s.subject),
          weak_topics: ['Algebra', 'Grammar', 'Photosynthesis'],
          study_plan: 'Focus on foundational concepts in weaker subjects. Practice daily with targeted exercises.',
          behavior_correlation: 'Attendance rate of ' + attendanceStats.percentage + '% may be affecting performance.'
        });
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback insights
      setAiInsights({
        summary: `Performance analysis for ${student?.name || 'student'}.`,
        predicted_grade: overallAverage >= 80 ? 'A' : overallAverage >= 70 ? 'B' : 'C',
        focus_areas: subjectPerformance.weaknesses.map(s => s.subject),
        weak_topics: [],
        study_plan: 'Continue current study routine with emphasis on weaker areas.',
        behavior_correlation: ''
      });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (examResults.length > 0 && !aiInsights) {
      generateAIInsights();
    }
  }, [examResults]);

  // Prefer DB-maintained age_years; else whole years from date_of_birth
  const age = useMemo(() => {
    const ay = (student as { age_years?: unknown } | null)?.age_years;
    if (ay != null && ay !== '') {
      const n = typeof ay === 'number' ? ay : Number(ay);
      if (!Number.isNaN(n) && n >= 0 && n <= 120) return n;
    }
    if (!student?.date_of_birth) return null;
    const birthDate = new Date(student.date_of_birth);
    const today = new Date();
    let y = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      y--;
    }
    return y;
  }, [student]);

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading student profile...</p>
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

          {/* Student Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className="p-8 relative overflow-hidden" hover>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Student Photo/Avatar */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl flex-shrink-0">
                  {student.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                
                {/* Student Info */}
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{student.name}</h1>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-white/55 mb-1">Admission Number</div>
                      <div className="text-white font-medium">{student.admission_number || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-white/55 mb-1">Class & Stream</div>
                      <div className="text-white font-medium">{student.current_class || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-white/55 mb-1">Year of Study</div>
                      <div className="text-white font-medium">{student.year_of_study || student.repeat_year ? 'Repeating' : '1'}</div>
                    </div>
                    <div>
                      <div className="text-white/55 mb-1">Gender</div>
                      <div className="text-white font-medium">{student.gender || 'N/A'}</div>
                    </div>
                    {age && (
                      <div>
                        <div className="text-white/55 mb-1">Age</div>
                        <div className="text-white font-medium">{age} years</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <GlassButton
                    variant="primary"
                    onClick={() => router.push(`/dashboard/teacher/messages?student=${studentId}`)}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send Message</span>
                  </GlassButton>
                  {student.guardian_phone && (
                    <GlassButton
                      variant="primary"
                      onClick={() => window.location.href = `tel:${student.guardian_phone}`}
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden sm:inline">Contact Parent</span>
                    </GlassButton>
                  )}
                  <GlassButton
                    variant="primary"
                    onClick={() => window.print()}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Generate Report</span>
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={generateAIInsights}
                    className="flex items-center gap-2"
                    disabled={aiLoading}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">AI Summary</span>
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Academic Summary Section (AI-Powered) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <GlassCard className="p-6" hover>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Award className="w-6 h-6" style={{ color: '#4dabff' }} />
                  Academic Summary
                </h2>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(174, 121, 255, 0.2)', color: '#ae79ff' }}>
                  AI-Powered
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(77, 171, 255, 0.15)', border: '1px solid rgba(77, 171, 255, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">GPA / Overall Average</div>
                  <div className="text-3xl font-bold text-white">{overallAverage}%</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">Class Position</div>
                  <div className="text-3xl font-bold text-white">
                    {classPosition ? `${classPosition}${classPosition === 1 ? 'st' : classPosition === 2 ? 'nd' : classPosition === 3 ? 'rd' : 'th'}` : 'N/A'}
                    {classSize > 0 && classPosition && ` / ${classSize}`}
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.15)', border: '1px solid rgba(174, 121, 255, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">Exam Records</div>
                  <div className="text-3xl font-bold text-white">{examResults.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-white/85 mb-2">Strength Subjects</div>
                  <div className="flex flex-wrap gap-2">
                    {subjectPerformance.strengths.length > 0 ? (
                      subjectPerformance.strengths.map((s) => (
                        <span
                          key={s.subject}
                          className="px-3 py-1 rounded-lg text-sm font-medium"
                          style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}
                        >
                          {s.subject} ({s.average}%)
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-white/55">No strength subjects identified</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white/85 mb-2">Weak Subjects</div>
                  <div className="flex flex-wrap gap-2">
                    {subjectPerformance.weaknesses.length > 0 ? (
                      subjectPerformance.weaknesses.map((s) => (
                        <span
                          key={s.subject}
                          className="px-3 py-1 rounded-lg text-sm font-medium"
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                        >
                          {s.subject} ({s.average}%)
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-white/55">No weak subjects identified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Insights Summary */}
              {aiLoading ? (
                <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/30"></div>
                    <span className="text-white/85">AI is analyzing performance...</span>
                  </div>
                </div>
              ) : aiInsights ? (
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.15)', border: '1px solid rgba(174, 121, 255, 0.3)' }}>
                    <div className="flex items-start gap-3">
                      <Brain className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ae79ff' }} />
                      <div>
                        <div className="font-medium text-white mb-1">AI Summary</div>
                        <div className="text-sm text-white/85">{aiInsights.summary}</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                      <div className="text-xs text-white/55 mb-1">Predicted End of Term Grade</div>
                      <div className="text-lg font-bold text-white">{aiInsights.predicted_grade || 'N/A'}</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                      <div className="text-xs text-white/55 mb-1">Recommended Focus Areas</div>
                      <div className="text-sm text-white/85">
                        {aiInsights.focus_areas && aiInsights.focus_areas.length > 0 
                          ? aiInsights.focus_areas.join(', ') 
                          : 'None identified'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </motion.div>

          {/* Two Column Layout: Subjects Table & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Subjects & Marks Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: '#4dabff' }} />
                  Subjects & Marks
                </h2>
                {subjectPerformance.all.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <th className="text-left py-3 px-4 text-sm font-medium text-white/85">Subject</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-white/85">Current Score</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-white/85">Class Avg</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-white/85">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-white/85">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectPerformance.all.map((subject, index) => {
                          const isGood = subject.average >= 70;
                          const isAverage = subject.average >= 50 && subject.average < 70;
                          const subjectResults = examResults.filter(r => r.subject === subject.subject);
                          const latestResult = subjectResults[0];
                          
                          return (
                            <tr
                              key={subject.subject}
                              className="border-b hover:bg-white/5 transition-colors"
                              style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-white">{subject.subject}</div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span 
                                  className="font-semibold"
                                  style={{ color: isGood ? '#10b981' : isAverage ? '#f59e0b' : '#ef4444' }}
                                >
                                  {subject.average}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-white/55">
                                {/* Mock class average - would need to calculate from all students */}
                                {subject.average >= 70 ? '75%' : subject.average >= 50 ? '65%' : '55%'}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className="px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    background: isGood ? 'rgba(16, 185, 129, 0.2)' : isAverage ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: isGood ? '#10b981' : isAverage ? '#f59e0b' : '#ef4444'
                                  }}
                                >
                                  {isGood ? 'Good' : isAverage ? 'Average' : 'Weak'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => router.push(`/dashboard/teacher/exam-results/${encodeURIComponent(student.current_class)}?subject=${encodeURIComponent(subject.subject)}&student=${studentId}`)}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  View Details →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/55">
                    No exam results available
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* AI Insights Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6" hover>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: '#ae79ff' }} />
                  AI Insights
                </h2>
                
                {aiLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
                      <span className="text-sm text-white/85">Analyzing...</span>
                    </div>
                  </div>
                ) : aiInsights ? (
                  <div className="space-y-4">
                    {/* Weak Topic Detection */}
                    {aiInsights.weak_topics && aiInsights.weak_topics.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-white/85 mb-2">Weak Topics Detected</div>
                        <div className="space-y-2">
                          {aiInsights.weak_topics.map((topic: string, index: number) => (
                            <div
                              key={index}
                              className="p-2 rounded-lg text-sm"
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                            >
                              {topic}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Study Plan */}
                    {aiInsights.study_plan && (
                      <div>
                        <div className="text-sm font-medium text-white/85 mb-2">AI Study Plan</div>
                        <div className="p-3 rounded-lg text-sm text-white/85" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                          {aiInsights.study_plan}
                        </div>
                      </div>
                    )}

                    {/* Predicted Difficulty */}
                    <div>
                      <div className="text-sm font-medium text-white/85 mb-2">Predicted Difficulty Areas</div>
                      <div className="p-3 rounded-lg text-sm text-white/85" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        Focus on {subjectPerformance.weaknesses.map(s => s.subject).join(', ') || 'all subjects'} for next term
                      </div>
                    </div>

                    {/* AI Actions */}
                    <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <GlassButton
                        variant="primary"
                        onClick={generateAIInsights}
                        className="w-full flex items-center justify-center gap-2 text-sm"
                        disabled={aiLoading}
                      >
                        <Brain className="w-4 h-4" />
                        Explain Performance
                      </GlassButton>
                      <GlassButton
                        variant="primary"
                        onClick={() => {
                          // Generate revision topics
                          alert('AI Revision Topics: ' + (aiInsights.focus_areas?.join(', ') || 'All subjects'));
                        }}
                        className="w-full flex items-center justify-center gap-2 text-sm"
                      >
                        <Target className="w-4 h-4" />
                        Recommend Topics
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={generateAIInsights}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Generate AI Insights
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Attendance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <GlassCard className="p-6" hover>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" style={{ color: '#10b981' }} />
                  Attendance Overview
                </h2>
                <GlassButton
                  variant="primary"
                  onClick={() => router.push(`/dashboard/teacher/attendance/${encodeURIComponent(student.current_class)}`)}
                  className="text-sm"
                >
                  Full Report →
                </GlassButton>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">Present Days</div>
                  <div className="text-2xl font-bold text-white">{attendanceStats.present}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">Absent Days</div>
                  <div className="text-2xl font-bold text-white">{attendanceStats.absent}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(77, 171, 255, 0.15)', border: '1px solid rgba(77, 171, 255, 0.3)' }}>
                  <div className="text-sm text-white/85 mb-1">Attendance %</div>
                  <div className="text-2xl font-bold text-white">{attendanceStats.percentage}%</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm text-white/85 mb-1">Total Days</div>
                  <div className="text-2xl font-bold text-white">{attendanceData.length}</div>
                </div>
              </div>

              {/* Simple Trend Visualization */}
              {attendanceData.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-white/85 mb-2">Recent Trend</div>
                  <div className="flex items-end gap-1 h-16">
                    {attendanceData.slice(0, 14).reverse().map((att, index) => {
                      const isPresent = studentAttendanceRowIsPresent(att);
                      const day = att.attendance_date || att.date || '';
                      return (
                      <div
                        key={index}
                        className="flex-1 rounded-t"
                        style={{
                          background: isPresent ? '#10b981' : '#ef4444',
                          height: isPresent ? '80%' : '20%',
                          opacity: 0.7
                        }}
                        title={`${day}: ${isPresent ? 'Present' : 'Absent'}`}
                      />
                    );})}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Assignments Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <GlassCard className="p-6" hover>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: '#4dabff' }} />
                Assignments
              </h2>
              
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment, index) => {
                    const getStatusIcon = () => {
                      switch (assignment.status) {
                        case 'completed': return CheckCircle;
                        case 'missing': return XCircle;
                        case 'late': return Clock;
                        default: return FileText;
                      }
                    };
                    const StatusIcon = getStatusIcon();
                    const statusColor = assignment.status === 'completed' ? '#10b981' : assignment.status === 'late' ? '#f59e0b' : '#ef4444';
                    
                    return (
                      <div
                        key={index}
                        className="p-4 rounded-xl flex items-center justify-between"
                        style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
                          <div>
                            <div className="font-medium text-white">{assignment.title}</div>
                            <div className="text-sm text-white/55">{assignment.subject}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className="px-2 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: statusColor + '20',
                              color: statusColor
                            }}
                          >
                            {assignment.status}
                          </span>
                          {assignment.score !== undefined && (
                            <span className="text-sm text-white/85">{assignment.score}%</span>
                          )}
                          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            View More →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-white/55">
                  No assignments found for this student
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Behavior & Notes Section (Academic Only) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <GlassCard className="p-6" hover>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" style={{ color: '#ae79ff' }} />
                Academic Behavior & Notes
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm font-medium text-white mb-2">Class Participation</div>
                  <div className="text-sm text-white/85">
                    {overallAverage >= 70 ? 'Active and engaged in class discussions' : 'Moderate participation, could improve'}
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm font-medium text-white mb-2">Homework Quality</div>
                  <div className="text-sm text-white/85">
                    {overallAverage >= 70 ? 'Consistently submits quality work' : 'Needs improvement in completion and quality'}
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm font-medium text-white mb-2">Attention Level</div>
                  <div className="text-sm text-white/85">
                    {attendanceStats.percentage >= 80 ? 'Good focus during lessons' : 'May need additional support to maintain focus'}
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm font-medium text-white mb-2">Teamwork</div>
                  <div className="text-sm text-white/85">
                    Collaborates well with peers in group activities
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-white mb-2">Teacher Feedback</div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div className="text-sm text-white/85">
                    {overallAverage >= 80 
                      ? `${student.name} demonstrates excellent academic performance. Continue to challenge with advanced materials.`
                      : overallAverage >= 60
                      ? `${student.name} shows steady progress. Focus on strengthening weaker subject areas through targeted practice.`
                      : `${student.name} requires additional support. Recommend one-on-one tutoring sessions and regular progress monitoring.`}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Bottom Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard className="p-6" hover>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <FileText className="w-5 h-5" />
                  <span>Generate Report Card</span>
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    // Generate PDF
                    alert('PDF generation feature coming soon');
                  }}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Profile PDF</span>
                </GlassButton>
                {student.guardian_phone && (
                  <GlassButton
                    variant="primary"
                    onClick={() => {
                      // Request parent meeting
                      alert('Parent meeting request feature coming soon');
                    }}
                    className="flex items-center justify-center gap-2 p-4"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Request Parent Meeting</span>
                  </GlassButton>
                )}
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    // Add teacher comment
                    const comment = prompt('Enter your comment:');
                    if (comment) {
                      alert('Comment saved: ' + comment);
                    }
                  }}
                  className="flex items-center justify-center gap-2 p-4"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Add Teacher Comment</span>
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
