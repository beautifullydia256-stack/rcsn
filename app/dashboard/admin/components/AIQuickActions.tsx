'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { Sparkles, FileText, BarChart3, Mail, AlertTriangle, X } from 'lucide-react';

interface AnalysisResult {
  title: string;
  content: string;
  data?: any;
}

export default function AIQuickActions() {
  const [processing, setProcessing] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const actions = [
    { icon: FileText, label: 'Generate Term Report Summary', color: '#4dabff', action: 'term-report' },
    { icon: BarChart3, label: 'Auto-Analyze Attendance', color: '#10b981', action: 'analyze-attendance' },
    { icon: Mail, label: 'Generate School Newsletter', color: '#ae79ff', action: 'newsletter' },
    { icon: AlertTriangle, label: 'Detect Students At Risk', color: '#ef4444', action: 'at-risk' },
  ];

  const handleAction = async (action: string) => {
    setProcessing(action);
    setResult(null);
    setShowModal(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to use AI features');
        setProcessing(null);
        return;
      }

      const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!u?.school_id) {
        alert('School not found');
        setProcessing(null);
        return;
      }

      const schoolId = u.school_id;
      const today = new Date().toISOString().slice(0, 10);

      // Get current term
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('id, year, term, start_date, end_date')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });

      const currentTerm = (allTerms || []).find((t: any) => {
        if (!t.start_date || !t.end_date) return false;
        return t.start_date <= today && t.end_date >= today;
      }) || (allTerms && allTerms[0]) || null;

      let analysisResult: AnalysisResult | null = null;

      switch (action) {
        case 'term-report':
          analysisResult = await generateTermReportSummary(schoolId, currentTerm);
          break;
        case 'analyze-attendance':
          analysisResult = await autoAnalyzeAttendance(schoolId, currentTerm);
          break;
        case 'newsletter':
          analysisResult = await generateSchoolNewsletter(schoolId, currentTerm);
          break;
        case 'at-risk':
          analysisResult = await detectStudentsAtRisk(schoolId, currentTerm);
          break;
      }

      if (analysisResult) {
        setResult(analysisResult);
      }
    } catch (error) {
      console.error('Error processing AI action:', error);
      alert('Error processing request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const generateTermReportSummary = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
    const today = new Date().toISOString().slice(0, 10);
    const termStart = currentTerm?.start_date || today;
    const termEnd = currentTerm?.end_date || today;

    // Fetch data
    const [studentsResult, examResultsResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('student_id, name, current_class').eq('school_id', schoolId).eq('status', 'active'),
      currentTerm ? supabase.from('exam_results')
        .select('student_id, subject, marks_obtained, total_marks, class_name')
        .eq('school_id', schoolId)
        .gte('created_at', termStart)
        .lte('created_at', termEnd) : { data: [] },
      supabase.from('student_attendance')
        .select('student_id, date, present')
        .eq('school_id', schoolId)
        .gte('date', termStart)
        .lte('date', termEnd)
    ]);

    const students = studentsResult.data || [];
    const examResults = examResultsResult.data || [];
    const attendance = attendanceResult.data || [];

    // Calculate statistics
    const totalStudents = students.length;
    const totalExams = examResults.length;
    const avgMarks = examResults.length > 0
      ? examResults.reduce((sum: number, r: any) => sum + (Number(r.marks_obtained) / Number(r.total_marks) * 100), 0) / examResults.length
      : 0;

    // Attendance statistics
    const totalAttendanceRecords = attendance.length;
    const presentCount = attendance.filter((a: any) => a.present).length;
    const attendanceRate = totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

    // Subject performance
    const subjectPerformance: Record<string, { total: number; avg: number; count: number }> = {};
    examResults.forEach((r: any) => {
      if (!subjectPerformance[r.subject]) {
        subjectPerformance[r.subject] = { total: 0, avg: 0, count: 0 };
      }
      subjectPerformance[r.subject].total += (Number(r.marks_obtained) / Number(r.total_marks)) * 100;
      subjectPerformance[r.subject].count += 1;
    });
    Object.keys(subjectPerformance).forEach(subject => {
      subjectPerformance[subject].avg = subjectPerformance[subject].total / subjectPerformance[subject].count;
    });

    const topSubject = Object.entries(subjectPerformance).sort((a, b) => b[1].avg - a[1].avg)[0];
    const weakSubject = Object.entries(subjectPerformance).sort((a, b) => a[1].avg - b[1].avg)[0];

    const termLabel = currentTerm ? `Term ${currentTerm.term} ${currentTerm.year}` : 'Current Period';

    const content = `
📊 TERM REPORT SUMMARY - ${termLabel}

📈 OVERVIEW:
• Total Active Students: ${totalStudents}
• Total Exams Conducted: ${totalExams}
• Average Performance: ${avgMarks.toFixed(1)}%
• Overall Attendance Rate: ${attendanceRate.toFixed(1)}%

📚 SUBJECT PERFORMANCE:
${topSubject ? `• Best Performing: ${topSubject[0]} (${topSubject[1].avg.toFixed(1)}% avg)` : '• No exam data available'}
${weakSubject && weakSubject[0] !== topSubject?.[0] ? `• Needs Attention: ${weakSubject[0]} (${weakSubject[1].avg.toFixed(1)}% avg)` : ''}

✅ KEY INSIGHTS:
${avgMarks >= 70 ? '• Overall performance is GOOD' : avgMarks >= 50 ? '• Overall performance is AVERAGE - Room for improvement' : '• Overall performance needs IMMEDIATE attention'}
${attendanceRate >= 90 ? '• Attendance is EXCELLENT' : attendanceRate >= 75 ? '• Attendance is GOOD' : '• Attendance needs improvement - Consider interventions'}

💡 RECOMMENDATIONS:
${avgMarks < 70 ? '• Focus on improving academic performance through targeted interventions\n' : ''}${attendanceRate < 75 ? '• Implement attendance improvement strategies\n' : ''}${weakSubject ? `• Provide extra support for ${weakSubject[0]} subject\n` : ''}• Continue monitoring student progress regularly
    `.trim();

    return {
      title: `Term Report Summary - ${termLabel}`,
      content,
      data: { totalStudents, avgMarks, attendanceRate, subjectPerformance }
    };
  };

  const autoAnalyzeAttendance = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    const startDate = last30Days.toISOString().slice(0, 10);

    // Fetch attendance data
    const { data: attendance } = await supabase
      .from('student_attendance')
      .select('student_id, date, present')
      .eq('school_id', schoolId)
      .gte('date', startDate);

    const { data: students } = await supabase
      .from('students')
      .select('student_id, name, current_class')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const attendanceData = attendance || [];
    const studentsList = students || [];

    // Calculate attendance per student
    const studentAttendance: Record<string, { present: number; total: number; percentage: number; name: string; class: string }> = {};
    
    studentsList.forEach((s: any) => {
      studentAttendance[s.student_id] = { present: 0, total: 0, percentage: 0, name: s.name, class: s.current_class };
    });

    attendanceData.forEach((a: any) => {
      if (studentAttendance[a.student_id]) {
        studentAttendance[a.student_id].total += 1;
        if (a.present) {
          studentAttendance[a.student_id].present += 1;
        }
      }
    });

    Object.keys(studentAttendance).forEach(sid => {
      const stats = studentAttendance[sid];
      stats.percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
    });

    // Find students with poor attendance
    const poorAttendance = Object.entries(studentAttendance)
      .filter(([_, stats]) => stats.total >= 5 && stats.percentage < 75)
      .sort((a, b) => a[1].percentage - b[1].percentage)
      .slice(0, 10);

    // Overall statistics
    const totalRecords = attendanceData.length;
    const totalPresent = attendanceData.filter(a => a.present).length;
    const overallRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Daily trends
    const dailyAttendance: Record<string, { present: number; total: number }> = {};
    attendanceData.forEach((a: any) => {
      if (!dailyAttendance[a.date]) {
        dailyAttendance[a.date] = { present: 0, total: 0 };
      }
      dailyAttendance[a.date].total += 1;
      if (a.present) dailyAttendance[a.date].present += 1;
    });

    const avgDailyRate = Object.values(dailyAttendance).length > 0
      ? Object.values(dailyAttendance).reduce((sum, day) => sum + (day.present / day.total * 100), 0) / Object.values(dailyAttendance).length
      : 0;

    const content = `
📊 ATTENDANCE ANALYSIS (Last 30 Days)

📈 OVERALL STATISTICS:
• Total Attendance Records: ${totalRecords}
• Overall Attendance Rate: ${overallRate.toFixed(1)}%
• Average Daily Attendance: ${avgDailyRate.toFixed(1)}%
• Students Tracked: ${studentsList.length}

⚠️ STUDENTS NEEDING ATTENTION (Attendance < 75%):
${poorAttendance.length > 0 ? poorAttendance.map(([_, stats], idx) => 
  `${idx + 1}. ${stats.name} (${stats.class}) - ${stats.percentage.toFixed(1)}% (${stats.present}/${stats.total} days)`
).join('\n') : '• No students with critical attendance issues'}

✅ INSIGHTS:
${overallRate >= 90 ? '• Attendance is EXCELLENT - Keep up the good work!' : overallRate >= 75 ? '• Attendance is GOOD - Minor improvements possible' : '• Attendance needs IMMEDIATE attention'}
${poorAttendance.length > 0 ? `• ${poorAttendance.length} student(s) require intervention` : '• All students maintaining good attendance'}

💡 RECOMMENDATIONS:
${poorAttendance.length > 0 ? '• Contact parents of students with poor attendance\n' : ''}${overallRate < 75 ? '• Review attendance policies and incentives\n' : ''}• Continue daily attendance tracking
• Monitor trends weekly
    `.trim();

    return {
      title: 'Attendance Analysis Report',
      content,
      data: { overallRate, poorAttendance, dailyAttendance }
    };
  };

  const generateSchoolNewsletter = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const startDate = lastMonth.toISOString().slice(0, 10);

    // Fetch data
    const [schoolResult, studentsResult, examResultsResult, attendanceResult] = await Promise.all([
      supabase.from('schools').select('name').eq('school_id', schoolId).single(),
      supabase.from('students').select('student_id').eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('exam_results')
        .select('student_id, subject, marks_obtained, total_marks')
        .eq('school_id', schoolId)
        .gte('created_at', startDate),
      supabase.from('student_attendance')
        .select('student_id, date, present')
        .eq('school_id', schoolId)
        .gte('date', startDate)
    ]);

    const school = schoolResult.data;
    const students = studentsResult.data || [];
    const examResults = examResultsResult.data || [];
    const attendance = attendanceResult.data || [];

    // Calculate achievements
    const totalStudents = students.length;
    const totalExams = examResults.length;
    const avgPerformance = examResults.length > 0
      ? examResults.reduce((sum: number, r: any) => sum + (Number(r.marks_obtained) / Number(r.total_marks) * 100), 0) / examResults.length
      : 0;

    const attendanceRate = attendance.length > 0
      ? (attendance.filter((a: any) => a.present).length / attendance.length) * 100
      : 0;

    // Top performers
    const studentScores: Record<string, { total: number; count: number; avg: number }> = {};
    examResults.forEach((r: any) => {
      if (!studentScores[r.student_id]) {
        studentScores[r.student_id] = { total: 0, count: 0, avg: 0 };
      }
      studentScores[r.student_id].total += (Number(r.marks_obtained) / Number(r.total_marks)) * 100;
      studentScores[r.student_id].count += 1;
    });
    Object.keys(studentScores).forEach(sid => {
      studentScores[sid].avg = studentScores[sid].total / studentScores[sid].count;
    });

    const termLabel = currentTerm ? `Term ${currentTerm.term} ${currentTerm.year}` : 'Current Period';
    const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    const content = `
📰 ${school?.name || 'School'} NEWSLETTER
${monthName} Edition

🎓 SCHOOL HIGHLIGHTS:

📊 ACADEMIC PERFORMANCE:
• Total Students: ${totalStudents}
• Exams Conducted This Month: ${totalExams}
• Average Performance: ${avgPerformance.toFixed(1)}%
• Attendance Rate: ${attendanceRate.toFixed(1)}%

🏆 ACHIEVEMENTS:
${avgPerformance >= 70 ? '✅ Excellent academic performance maintained' : '📈 Continuous improvement in academic standards'}
${attendanceRate >= 90 ? '✅ Outstanding attendance record' : attendanceRate >= 75 ? '✅ Good attendance maintained' : '📊 Working on improving attendance'}

📚 CURRENT TERM: ${termLabel}
${currentTerm ? `• Term Period: ${new Date(currentTerm.start_date).toLocaleDateString()} - ${new Date(currentTerm.end_date).toLocaleDateString()}` : ''}

💡 MESSAGE FROM ADMINISTRATION:
We are committed to providing quality education and ensuring every student reaches their full potential. Thank you for your continued support and partnership in your child's education journey.

📞 CONTACT:
For any inquiries, please contact the school administration.

---
Generated on ${today.toLocaleDateString()}
    `.trim();

    return {
      title: 'School Newsletter',
      content,
      data: { school, totalStudents, avgPerformance, attendanceRate }
    };
  };

  const detectStudentsAtRisk = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
    const today = new Date().toISOString().slice(0, 10);
    const termStart = currentTerm?.start_date || today;
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const attendanceStart = last30Days.toISOString().slice(0, 10);

    // Fetch data
    const [studentsResult, examResultsResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('student_id, name, current_class').eq('school_id', schoolId).eq('status', 'active'),
      currentTerm ? supabase.from('exam_results')
        .select('student_id, subject, marks_obtained, total_marks')
        .eq('school_id', schoolId)
        .gte('created_at', termStart) : { data: [] },
      supabase.from('student_attendance')
        .select('student_id, date, present')
        .eq('school_id', schoolId)
        .gte('date', attendanceStart)
    ]);

    const students = studentsResult.data || [];
    const examResults = examResultsResult.data || [];
    const attendance = attendanceResult.data || [];

    // Calculate risk factors per student
    const studentRisks: Array<{
      student_id: string;
      name: string;
      class: string;
      riskScore: number;
      reasons: string[];
      avgPerformance: number;
      attendanceRate: number;
    }> = [];

    students.forEach((student: any) => {
      const studentExams = examResults.filter((r: any) => r.student_id === student.student_id);
      const studentAttendance = attendance.filter((a: any) => a.student_id === student.student_id);

      // Calculate performance
      const avgPerformance = studentExams.length > 0
        ? studentExams.reduce((sum: number, r: any) => sum + (Number(r.marks_obtained) / Number(r.total_marks) * 100), 0) / studentExams.length
        : 100; // If no exams, assume good

      // Calculate attendance
      const attendanceRate = studentAttendance.length > 0
        ? (studentAttendance.filter((a: any) => a.present).length / studentAttendance.length) * 100
        : 100; // If no attendance records, assume good

      // Calculate risk score (0-100, higher = more at risk)
      let riskScore = 0;
      const reasons: string[] = [];

      if (avgPerformance < 50) {
        riskScore += 40;
        reasons.push('Very low academic performance');
      } else if (avgPerformance < 60) {
        riskScore += 25;
        reasons.push('Below average performance');
      }

      if (attendanceRate < 60) {
        riskScore += 40;
        reasons.push('Poor attendance');
      } else if (attendanceRate < 75) {
        riskScore += 20;
        reasons.push('Below average attendance');
      }

      if (studentExams.length === 0 && attendance.length > 0) {
        riskScore += 15;
        reasons.push('No exam results recorded');
      }

      if (riskScore >= 30) {
        studentRisks.push({
          student_id: student.student_id,
          name: student.name,
          class: student.current_class,
          riskScore,
          reasons,
          avgPerformance,
          attendanceRate
        });
      }
    });

    // Sort by risk score
    studentRisks.sort((a, b) => b.riskScore - a.riskScore);

    const highRisk = studentRisks.filter(s => s.riskScore >= 60);
    const mediumRisk = studentRisks.filter(s => s.riskScore >= 40 && s.riskScore < 60);
    const lowRisk = studentRisks.filter(s => s.riskScore >= 30 && s.riskScore < 40);

    const content = `
🚨 STUDENTS AT RISK DETECTION REPORT

📊 SUMMARY:
• Total Students Analyzed: ${students.length}
• Students At Risk: ${studentRisks.length}
  - High Risk (≥60): ${highRisk.length} students
  - Medium Risk (40-59): ${mediumRisk.length} students
  - Low Risk (30-39): ${lowRisk.length} students

🔴 HIGH RISK STUDENTS (Immediate Attention Required):
${highRisk.length > 0 ? highRisk.map((s, idx) => 
  `${idx + 1}. ${s.name} (${s.class})
   Risk Score: ${s.riskScore}/100
   Performance: ${s.avgPerformance.toFixed(1)}%
   Attendance: ${s.attendanceRate.toFixed(1)}%
   Issues: ${s.reasons.join(', ')}`
).join('\n\n') : '• No high-risk students identified'}

🟡 MEDIUM RISK STUDENTS (Monitor Closely):
${mediumRisk.length > 0 ? mediumRisk.slice(0, 5).map((s, idx) => 
  `${idx + 1}. ${s.name} (${s.class}) - Risk: ${s.riskScore}/100`
).join('\n') : '• No medium-risk students'}

💡 RECOMMENDATIONS:
${highRisk.length > 0 ? '• Schedule immediate parent meetings for high-risk students\n' : ''}${mediumRisk.length > 0 ? '• Provide additional academic support for medium-risk students\n' : ''}• Implement intervention programs
• Regular monitoring and follow-up
• Consider counseling services where needed

⚠️ ACTION REQUIRED:
${studentRisks.length > 0 ? `Please review and take action for ${studentRisks.length} student(s) identified above.` : 'No immediate action required - all students performing well.'}
    `.trim();

    return {
      title: 'Students At Risk Detection',
      content,
      data: { highRisk, mediumRisk, lowRisk, totalAtRisk: studentRisks.length }
    };
  };

  return (
    <>
      <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
          style={{ background: '#ff6bcb' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255, 107, 203, 0.2)' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#ff6bcb' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Quick Actions</h2>
              <p className="text-sm text-white/85">Automated tasks powered by AI</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.action}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction(action.action)}
                  disabled={processing === action.action}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: `${action.color}20`,
                    border: `1px solid ${action.color}40`,
                    opacity: processing === action.action ? 0.6 : 1
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" style={{ color: action.color }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{action.label}</div>
                    {processing === action.action && (
                      <div className="text-xs text-white/70 mt-1">Processing...</div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Results Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setResult(null);
              setProcessing(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '18px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {result?.title || (processing ? 'Processing...' : 'AI Analysis')}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setResult(null);
                    setProcessing(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {processing && !result && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mb-4"></div>
                  <p className="text-white/85">Analyzing data...</p>
                </div>
              )}

              {result && (
                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                  <pre className="text-sm text-white/90 whitespace-pre-wrap font-mono leading-relaxed p-4 rounded-lg"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {result.content}
                  </pre>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => {
                        const blob = new Blob([result.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${result.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: 'white'
                      }}
                    >
                      Download Report
                    </button>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setResult(null);
                        setProcessing(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: 'white'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

