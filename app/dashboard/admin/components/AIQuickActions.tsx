'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { Sparkles, FileText, BarChart3, Mail, AlertTriangle, X, CalendarCheck, Award, BookOpen, Target, Users, TrendingUp, Brain } from 'lucide-react';

interface AnalysisResult {
  title: string;
  content: string;
  action?: string;
  data?: any;
}

export default function AIQuickActions() {
  const [processing, setProcessing] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const actions = [
    { icon: FileText, label: 'Generate Academic Report Summary', color: '#4dabff', action: 'academic-report' },
    { icon: BarChart3, label: 'Generate Attendance Analysis Report', color: '#10b981', action: 'attendance-report' },
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
        case 'academic-report':
          analysisResult = await generateAcademicReportSummary(schoolId, currentTerm);
          break;
        case 'attendance-report':
          analysisResult = await generateAttendanceAnalysisReport(schoolId, currentTerm);
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

  const generateAcademicReportSummary = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
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
📊 ACADEMIC REPORT SUMMARY - ${termLabel}

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
      title: `Academic Report Summary - ${termLabel}`,
      content,
      action: 'academic-report',
      data: { totalStudents, avgMarks, attendanceRate, subjectPerformance }
    };
  };

  const generateAttendanceAnalysisReport = async (schoolId: string, currentTerm: any): Promise<AnalysisResult> => {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    const startDate = last30Days.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    // Fetch comprehensive attendance data
    const [studentsResult, attendanceResult, todayAttendanceResult] = await Promise.all([
      supabase.from('students')
        .select('student_id, name, current_class')
        .eq('school_id', schoolId)
        .eq('status', 'active'),
      supabase.from('student_attendance')
        .select('student_id, date, present, class_name')
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase.from('student_attendance')
        .select('student_id, present')
        .eq('school_id', schoolId)
        .eq('date', endDate)
    ]);

    const students = studentsResult.data || [];
    const attendance = attendanceResult.data || [];
    const todayAttendance = todayAttendanceResult.data || [];

    // Calculate overview
    const totalStudents = students.length;
    const presentToday = todayAttendance.filter(a => a.present).length;
    const absentToday = totalStudents - presentToday;
    const attendanceRateToday = totalStudents > 0 ? (presentToday / totalStudents) * 100 : 0;

    // Calculate term average
    const totalRecords = attendance.length;
    const totalPresent = attendance.filter(a => a.present).length;
    const overallRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Find students with poor attendance
    const studentAttendance: Record<string, { present: number; total: number; percentage: number; name: string; class: string }> = {};
    students.forEach((s: any) => {
      studentAttendance[s.student_id] = { present: 0, total: 0, percentage: 0, name: s.name, class: s.current_class };
    });
    attendance.forEach((a: any) => {
      if (studentAttendance[a.student_id]) {
        studentAttendance[a.student_id].total += 1;
        if (a.present) studentAttendance[a.student_id].present += 1;
      }
    });
    Object.keys(studentAttendance).forEach(sid => {
      const stats = studentAttendance[sid];
      stats.percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
    });

    const poorAttendance = Object.entries(studentAttendance)
      .filter(([_, stats]) => stats.total >= 5 && stats.percentage < 75)
      .sort((a, b) => a[1].percentage - b[1].percentage)
      .slice(0, 10);

    const content = `
📊 ATTENDANCE ANALYSIS REPORT
Date Range: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}

📈 OVERVIEW:
• Total Students: ${totalStudents}
• Present Today: ${presentToday}
• Absent Today: ${absentToday}
• Attendance Rate Today: ${attendanceRateToday.toFixed(1)}%
• Overall Rate: ${overallRate.toFixed(1)}%

⚠️ STUDENTS AT RISK: ${poorAttendance.length} student(s) with attendance below 75%

💡 RECOMMENDATIONS:
${poorAttendance.length > 0 ? '• Contact parents of students with poor attendance\n' : ''}${overallRate < 75 ? '• Review attendance policies and incentives\n' : ''}• Continue daily attendance tracking
• Monitor trends weekly
    `.trim();

    return {
      title: `Attendance Analysis Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
      content,
      action: 'attendance-report',
      data: { overallRate, poorAttendance, totalStudents, presentToday, absentToday, attendanceRateToday }
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
      action: 'analyze-attendance',
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
      action: 'newsletter',
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
      action: 'at-risk',
      data: { highRisk, mediumRisk, lowRisk, totalAtRisk: studentRisks.length }
    };
  };

  const renderProfessionalContent = (result: AnalysisResult) => {
    if (!result.data) {
      return (
        <div className="text-gray-700">
          <p>No data available. Please try again.</p>
        </div>
      );
    }

    if (result.action === 'term-report') {
      const data = result.data;
      return (
        <div className="space-y-6">
          {/* Overview Section */}
          <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Total Students</div>
                <div className="text-2xl font-bold text-gray-900">{data.totalStudents}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Average Performance</div>
                <div className="text-2xl font-bold text-gray-900">{data.avgMarks.toFixed(1)}%</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Attendance Rate</div>
                <div className="text-2xl font-bold text-gray-900">{data.attendanceRate.toFixed(1)}%</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Status</div>
                <div className={`text-lg font-semibold ${data.avgMarks >= 70 ? 'text-green-600' : data.avgMarks >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.avgMarks >= 70 ? 'Excellent' : data.avgMarks >= 50 ? 'Good' : 'Needs Attention'}
                </div>
              </div>
            </div>
          </section>

          {/* Subject Performance */}
          {data.subjectPerformance && Object.keys(data.subjectPerformance).length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Subject Performance Analysis
              </h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-3">
                  {Object.entries(data.subjectPerformance)
                    .sort((a, b) => b[1].avg - a[1].avg)
                    .map(([subject, stats]: [string, any]) => (
                      <div key={subject} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{subject}</span>
                          <span className={`text-lg font-bold ${stats.avg >= 70 ? 'text-green-600' : stats.avg >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stats.avg.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${stats.avg >= 70 ? 'bg-green-500' : stats.avg >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(stats.avg, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{stats.count} exam(s) recorded</div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* Key Insights */}
          <section className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-600" />
              Key Insights & Recommendations
            </h2>
            <div className="space-y-2 text-gray-700">
              {data.avgMarks >= 70 ? (
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Overall academic performance is <strong>excellent</strong>. Continue maintaining high standards.</span>
                </p>
              ) : data.avgMarks >= 50 ? (
                <p className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">⚠</span>
                  <span>Overall performance is <strong>average</strong>. There is room for improvement through targeted interventions.</span>
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>Overall performance <strong>needs immediate attention</strong>. Implement comprehensive support programs.</span>
                </p>
              )}
              {data.attendanceRate >= 90 ? (
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Attendance rate is <strong>excellent</strong>. Students are highly engaged.</span>
                </p>
              ) : data.attendanceRate >= 75 ? (
                <p className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">⚠</span>
                  <span>Attendance is <strong>good</strong> but can be improved with better engagement strategies.</span>
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">✗</span>
                  <span>Attendance <strong>needs improvement</strong>. Consider implementing attendance improvement strategies and parent communication.</span>
                </p>
              )}
            </div>
          </section>
        </div>
      );
    }

    if (result.action === 'analyze-attendance') {
      const data = result.data;
      return (
        <div className="space-y-6">
          {/* Statistics */}
          <section className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              Attendance Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Overall Rate</div>
                <div className={`text-3xl font-bold ${data.overallRate >= 90 ? 'text-green-600' : data.overallRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.overallRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Average Daily</div>
                <div className="text-3xl font-bold text-gray-900">
                  {data.avgDailyRate ? data.avgDailyRate.toFixed(1) : '0'}%
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-xs text-gray-500 uppercase mb-1">Students At Risk</div>
                <div className="text-3xl font-bold text-red-600">{data.poorAttendance?.length || 0}</div>
              </div>
            </div>
          </section>

          {/* Students Needing Attention */}
          {data.poorAttendance && data.poorAttendance.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Students Requiring Attention
              </h2>
              <div className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
                <div className="space-y-3">
                  {data.poorAttendance.map((item: any, idx: number) => {
                    const [_, stats] = item;
                    return (
                      <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{stats.name}</div>
                            <div className="text-sm text-gray-600">{stats.class}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${stats.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {stats.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{stats.present}/{stats.total} days</div>
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${stats.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Recommendations */}
          <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Recommendations
            </h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              {data.poorAttendance && data.poorAttendance.length > 0 && (
                <li>Contact parents of students with poor attendance to discuss concerns and develop improvement plans.</li>
              )}
              {data.overallRate < 75 && (
                <li>Review and enhance attendance policies and incentives to encourage better student engagement.</li>
              )}
              <li>Continue daily attendance tracking and monitoring trends on a weekly basis.</li>
              <li>Implement early intervention programs for students showing declining attendance patterns.</li>
            </ul>
          </section>
        </div>
      );
    }

    if (result.action === 'newsletter') {
      const data = result.data;
      return (
        <div className="space-y-6">
          {/* Header */}
          <section className="text-center border-b-2 border-gray-300 pb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">{data.school?.name || 'School'} Newsletter</h2>
            <p className="text-lg text-gray-600">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Edition
            </p>
          </section>

          {/* Highlights */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">School Highlights</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-3xl font-bold text-blue-600">{data.totalStudents}</div>
                <div className="text-sm text-gray-600 mt-1">Total Students</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className={`text-3xl font-bold ${data.avgPerformance >= 70 ? 'text-green-600' : data.avgPerformance >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.avgPerformance.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg Performance</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className={`text-3xl font-bold ${data.attendanceRate >= 90 ? 'text-green-600' : data.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Attendance</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {data.avgPerformance >= 70 ? '⭐' : '📈'}
                </div>
                <div className="text-sm text-gray-600 mt-1">Status</div>
              </div>
            </div>
          </section>

          {/* Message */}
          <section className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Message from Administration</h2>
            <p className="text-gray-700 leading-relaxed">
              We are committed to providing quality education and ensuring every student reaches their full potential. 
              This month, we have seen {data.avgPerformance >= 70 ? 'excellent' : data.avgPerformance >= 50 ? 'good' : 'improving'} 
              {' '}academic performance and {data.attendanceRate >= 90 ? 'outstanding' : data.attendanceRate >= 75 ? 'good' : 'improving'} 
              {' '}attendance rates. Thank you for your continued support and partnership in your child's education journey.
            </p>
          </section>
        </div>
      );
    }

    if (result.action === 'at-risk') {
      const data = result.data;
      return (
        <div className="space-y-6">
          {/* Summary */}
          <section className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Risk Assessment Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-2xl font-bold text-red-600">{data.highRisk?.length || 0}</div>
                <div className="text-xs text-gray-600 mt-1">High Risk</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-2xl font-bold text-yellow-600">{data.mediumRisk?.length || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Medium Risk</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-2xl font-bold text-orange-600">{data.lowRisk?.length || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Low Risk</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="text-2xl font-bold text-gray-900">{data.totalAtRisk || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Total At Risk</div>
              </div>
            </div>
          </section>

          {/* High Risk Students */}
          {data.highRisk && data.highRisk.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                High Risk Students (Immediate Attention Required)
              </h2>
              <div className="space-y-3">
                {data.highRisk.map((student: any, idx: number) => (
                  <div key={idx} className="bg-red-50 rounded-lg p-5 border-2 border-red-200 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.class}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">Risk: {student.riskScore}/100</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Performance</div>
                        <div className={`text-lg font-semibold ${student.avgPerformance >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.avgPerformance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Attendance</div>
                        <div className={`text-lg font-semibold ${student.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.attendanceRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-xs text-gray-500 uppercase mb-1">Identified Issues</div>
                      <div className="flex flex-wrap gap-2">
                        {student.reasons.map((reason: string, rIdx: number) => (
                          <span key={rIdx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Medium Risk */}
          {data.mediumRisk && data.mediumRisk.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-yellow-600 mb-4">Medium Risk Students (Monitor Closely)</h2>
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <div className="space-y-2">
                  {data.mediumRisk.slice(0, 10).map((student: any, idx: number) => (
                    <div key={idx} className="bg-white rounded p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900">{student.name}</span>
                        <span className="text-sm text-gray-600 ml-2">({student.class})</span>
                      </div>
                      <span className="text-yellow-600 font-semibold">Risk: {student.riskScore}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recommendations */}
          <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Recommended Actions
            </h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              {data.highRisk && data.highRisk.length > 0 && (
                <li>Schedule immediate parent meetings for {data.highRisk.length} high-risk student(s) to discuss intervention strategies.</li>
              )}
              {data.mediumRisk && data.mediumRisk.length > 0 && (
                <li>Provide additional academic support and monitoring for {data.mediumRisk.length} medium-risk student(s).</li>
              )}
              <li>Implement targeted intervention programs focusing on both academic performance and attendance improvement.</li>
              <li>Establish regular monitoring and follow-up schedules for at-risk students.</li>
              <li>Consider counseling services and mentorship programs where appropriate.</li>
            </ul>
          </section>
        </div>
      );
    }

    // Fallback for other content
    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-gray-700">{result.content}</pre>
      </div>
    );
  };

  const generateHTMLReport = (result: AnalysisResult): string => {
    const generateContentHTML = () => {
      if (!result.data) return '<p>No data available.</p>';

      if (result.action === 'term-report') {
        const data = result.data;
        return `
          <section style="background: #eff6ff; border-radius: 8px; padding: 24px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-bottom: 16px; font-size: 20px;">📊 Overview</h2>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Total Students</div>
                <div style="font-size: 24px; font-weight: bold; color: #111827;">${data.totalStudents || 0}</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Average Performance</div>
                <div style="font-size: 24px; font-weight: bold; color: #111827;">${(data.avgMarks || 0).toFixed(1)}%</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Attendance Rate</div>
                <div style="font-size: 24px; font-weight: bold; color: #111827;">${(data.attendanceRate || 0).toFixed(1)}%</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Status</div>
                <div style="font-size: 18px; font-weight: bold; color: ${(data.avgMarks || 0) >= 70 ? '#10b981' : (data.avgMarks || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                  ${(data.avgMarks || 0) >= 70 ? 'Excellent' : (data.avgMarks || 0) >= 50 ? 'Good' : 'Needs Attention'}
                </div>
              </div>
            </div>
          </section>
          ${data.subjectPerformance && Object.keys(data.subjectPerformance).length > 0 ? `
          <section style="margin: 20px 0;">
            <h2 style="color: #1e40af; margin-bottom: 16px; font-size: 20px;">📚 Subject Performance Analysis</h2>
            <div style="background: #f9fafb; border-radius: 8px; padding: 24px;">
              ${Object.entries(data.subjectPerformance)
                .sort((a: any, b: any) => b[1].avg - a[1].avg)
                .map(([subject, stats]: [string, any]) => `
                <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #111827;">${subject}</span>
                    <span style="font-size: 18px; font-weight: bold; color: ${stats.avg >= 70 ? '#10b981' : stats.avg >= 50 ? '#f59e0b' : '#ef4444'};">
                      ${stats.avg.toFixed(1)}%
                    </span>
                  </div>
                  <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 10px; margin-bottom: 4px;">
                    <div style="width: ${Math.min(stats.avg, 100)}%; height: 10px; border-radius: 4px; background: ${stats.avg >= 70 ? '#10b981' : stats.avg >= 50 ? '#f59e0b' : '#ef4444'};"></div>
                  </div>
                  <div style="font-size: 12px; color: #6b7280;">${stats.count} exam(s) recorded</div>
                </div>
              `).join('')}
            </div>
          </section>
          ` : ''}
          <section style="background: #fef3c7; border-radius: 8px; padding: 24px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h2 style="color: #92400e; margin-bottom: 16px; font-size: 20px;">💡 Key Insights & Recommendations</h2>
            <div style="color: #374151; line-height: 1.8;">
              ${(data.avgMarks || 0) >= 70 ? 
                '<p style="margin: 8px 0;">✓ Overall academic performance is <strong>excellent</strong>. Continue maintaining high standards.</p>' : 
                (data.avgMarks || 0) >= 50 ? 
                '<p style="margin: 8px 0;">⚠ Overall performance is <strong>average</strong>. There is room for improvement through targeted interventions.</p>' : 
                '<p style="margin: 8px 0;">✗ Overall performance <strong>needs immediate attention</strong>. Implement comprehensive support programs.</p>'}
              ${(data.attendanceRate || 0) >= 90 ? 
                '<p style="margin: 8px 0;">✓ Attendance rate is <strong>excellent</strong>. Students are highly engaged.</p>' : 
                (data.attendanceRate || 0) >= 75 ? 
                '<p style="margin: 8px 0;">⚠ Attendance is <strong>good</strong> but can be improved with better engagement strategies.</p>' : 
                '<p style="margin: 8px 0;">✗ Attendance <strong>needs improvement</strong>. Consider implementing attendance improvement strategies and parent communication.</p>'}
            </div>
          </section>
        `;
      }

      if (result.action === 'analyze-attendance') {
        const data = result.data;
        return `
          <section style="background: #d1fae5; border-radius: 8px; padding: 24px; border-left: 4px solid #10b981; margin: 20px 0;">
            <h2 style="color: #065f46; margin-bottom: 16px; font-size: 20px;">📊 Attendance Statistics</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Overall Rate</div>
                <div style="font-size: 32px; font-weight: bold; color: ${(data.overallRate || 0) >= 90 ? '#10b981' : (data.overallRate || 0) >= 75 ? '#f59e0b' : '#ef4444'};">
                  ${(data.overallRate || 0).toFixed(1)}%
                </div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Average Daily</div>
                <div style="font-size: 32px; font-weight: bold; color: #111827;">
                  ${(data.avgDailyRate || 0).toFixed(1)}%
                </div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Students At Risk</div>
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${data.poorAttendance?.length || 0}</div>
              </div>
            </div>
          </section>
          ${data.poorAttendance && data.poorAttendance.length > 0 ? `
          <section style="margin: 20px 0;">
            <h2 style="color: #dc2626; margin-bottom: 16px; font-size: 20px;">⚠️ Students Requiring Attention</h2>
            <div style="background: #fee2e2; border-radius: 8px; padding: 24px; border-left: 4px solid #ef4444;">
              ${data.poorAttendance.map((item: any, idx: number) => {
                const [_, stats] = item;
                return `
                <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                      <div style="font-weight: 600; color: #111827;">${stats.name}</div>
                      <div style="font-size: 14px; color: #6b7280;">${stats.class}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 24px; font-weight: bold; color: ${stats.percentage >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${stats.percentage.toFixed(1)}%
                      </div>
                      <div style="font-size: 12px; color: #6b7280;">${stats.present}/${stats.total} days</div>
                    </div>
                  </div>
                  <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 8px;">
                    <div style="width: ${Math.min(stats.percentage, 100)}%; height: 8px; border-radius: 4px; background: ${stats.percentage >= 60 ? '#f59e0b' : '#ef4444'};"></div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </section>
          ` : ''}
          <section style="background: #dbeafe; border-radius: 8px; padding: 24px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-bottom: 16px; font-size: 20px;">💡 Recommendations</h2>
            <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
              ${data.poorAttendance && data.poorAttendance.length > 0 ? '<li>Contact parents of students with poor attendance to discuss concerns and develop improvement plans.</li>' : ''}
              ${(data.overallRate || 0) < 75 ? '<li>Review and enhance attendance policies and incentives to encourage better student engagement.</li>' : ''}
              <li>Continue daily attendance tracking and monitoring trends on a weekly basis.</li>
              <li>Implement early intervention programs for students showing declining attendance patterns.</li>
            </ul>
          </section>
        `;
      }

      if (result.action === 'newsletter') {
        const data = result.data;
        return `
          <section style="text-align: center; border-bottom: 2px solid #d1d5db; padding-bottom: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 36px; font-weight: bold; color: #111827; margin-bottom: 8px;">${data.school?.name || 'School'} Newsletter</h2>
            <p style="font-size: 18px; color: #6b7280;">
              ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Edition
            </p>
          </section>
          <section style="background: linear-gradient(to right, #dbeafe, #e9d5ff); border-radius: 8px; padding: 24px; margin: 20px 0;">
            <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px;">School Highlights</h2>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${data.totalStudents || 0}</div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Total Students</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 32px; font-weight: bold; color: ${(data.avgPerformance || 0) >= 70 ? '#10b981' : (data.avgPerformance || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                  ${(data.avgPerformance || 0).toFixed(1)}%
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Avg Performance</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 32px; font-weight: bold; color: ${(data.attendanceRate || 0) >= 90 ? '#10b981' : (data.attendanceRate || 0) >= 75 ? '#f59e0b' : '#ef4444'};">
                  ${(data.attendanceRate || 0).toFixed(1)}%
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Attendance</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 32px; font-weight: bold; color: #a855f7;">
                  ${(data.avgPerformance || 0) >= 70 ? '⭐' : '📈'}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Status</div>
              </div>
            </div>
          </section>
          <section style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 12px;">Message from Administration</h2>
            <p style="color: #374151; line-height: 1.8;">
              We are committed to providing quality education and ensuring every student reaches their full potential. 
              This month, we have seen ${(data.avgPerformance || 0) >= 70 ? 'excellent' : (data.avgPerformance || 0) >= 50 ? 'good' : 'improving'} 
              academic performance and ${(data.attendanceRate || 0) >= 90 ? 'outstanding' : (data.attendanceRate || 0) >= 75 ? 'good' : 'improving'} 
              attendance rates. Thank you for your continued support and partnership in your child's education journey.
            </p>
          </section>
        `;
      }

      if (result.action === 'at-risk') {
        const data = result.data;
        return `
          <section style="background: #fee2e2; border-radius: 8px; padding: 24px; border-left: 4px solid #ef4444; margin: 20px 0;">
            <h2 style="color: #991b1b; margin-bottom: 16px; font-size: 20px;">🚨 Risk Assessment Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.highRisk?.length || 0}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">High Risk</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${data.mediumRisk?.length || 0}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Medium Risk</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #f97316;">${data.lowRisk?.length || 0}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Low Risk</div>
              </div>
              <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: bold; color: #111827;">${data.totalAtRisk || 0}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total At Risk</div>
              </div>
            </div>
          </section>
          ${data.highRisk && data.highRisk.length > 0 ? `
          <section style="margin: 20px 0;">
            <h2 style="color: #dc2626; margin-bottom: 16px; font-size: 20px;">🔴 High Risk Students (Immediate Attention Required)</h2>
            ${data.highRisk.map((student: any, idx: number) => `
              <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin-bottom: 12px; border: 2px solid #fecaca; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                  <div>
                    <div style="font-weight: bold; font-size: 18px; color: #111827;">${student.name}</div>
                    <div style="font-size: 14px; color: #6b7280;">${student.class}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">Risk: ${student.riskScore}/100</div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 12px;">
                  <div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Performance</div>
                    <div style="font-size: 18px; font-weight: 600; color: ${student.avgPerformance >= 60 ? '#f59e0b' : '#ef4444'};">
                      ${student.avgPerformance.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Attendance</div>
                    <div style="font-size: 18px; font-weight: 600; color: ${student.attendanceRate >= 75 ? '#f59e0b' : '#ef4444'};">
                      ${student.attendanceRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div style="background: white; border-radius: 6px; padding: 12px;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Identified Issues</div>
                  <div style="display: flex; flex-wrap: gap: 8px;">
                    ${student.reasons.map((reason: string) => `
                      <span style="padding: 4px 12px; background: #fee2e2; color: #991b1b; font-size: 12px; border-radius: 12px;">
                        ${reason}
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </section>
          ` : ''}
          ${data.mediumRisk && data.mediumRisk.length > 0 ? `
          <section style="margin: 20px 0;">
            <h2 style="color: #f59e0b; margin-bottom: 16px; font-size: 20px;">🟡 Medium Risk Students (Monitor Closely)</h2>
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
              ${data.mediumRisk.slice(0, 10).map((student: any) => `
                <div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-weight: 600; color: #111827;">${student.name}</span>
                    <span style="font-size: 14px; color: #6b7280; margin-left: 8px;">(${student.class})</span>
                  </div>
                  <span style="color: #f59e0b; font-weight: 600;">Risk: ${student.riskScore}/100</span>
                </div>
              `).join('')}
            </div>
          </section>
          ` : ''}
          <section style="background: #dbeafe; border-radius: 8px; padding: 24px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-bottom: 16px; font-size: 20px;">💡 Recommended Actions</h2>
            <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
              ${data.highRisk && data.highRisk.length > 0 ? `<li>Schedule immediate parent meetings for ${data.highRisk.length} high-risk student(s) to discuss intervention strategies.</li>` : ''}
              ${data.mediumRisk && data.mediumRisk.length > 0 ? `<li>Provide additional academic support and monitoring for ${data.mediumRisk.length} medium-risk student(s).</li>` : ''}
              <li>Implement targeted intervention programs focusing on both academic performance and attendance improvement.</li>
              <li>Establish regular monitoring and follow-up schedules for at-risk students.</li>
              <li>Consider counseling services and mentorship programs where appropriate.</li>
            </ul>
          </section>
        `;
      }

      return '<p>Report content not available.</p>';
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${result.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; 
      padding: 40px; 
      background: #f8f9fa; 
      color: #111827;
      line-height: 1.6;
    }
    .document { 
      background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%); 
      padding: 48px; 
      border-radius: 12px; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #d1d5db;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    h1 { 
      color: #111827; 
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .date {
      font-size: 14px;
      color: #6b7280;
    }
    .branding {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 { 
      color: #1e40af; 
      margin-top: 32px;
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 600;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div>
        <h1>${result.title}</h1>
        <p class="date">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="branding">
        <div>PwezaCore</div>
        <div>School Management System</div>
      </div>
    </div>
    ${generateContentHTML()}
    <div class="footer">
      <p>This is an AI-generated report. For questions, contact the school administration.</p>
      <p style="margin-top: 8px;">© ${new Date().getFullYear()} PwezaCore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
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
                  <div className="bg-white rounded-lg shadow-xl p-8 text-gray-900"
                    style={{
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)',
                      minHeight: '500px'
                    }}
                  >
                    {/* Document Header */}
                    <div className="border-b-2 border-gray-300 pb-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2">{result.title}</h1>
                          <p className="text-sm text-gray-600">
                            Generated on {new Date().toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">PwezaCore</div>
                          <div className="text-xs text-gray-500">School Management System</div>
                        </div>
                      </div>
                    </div>

                    {/* Document Content */}
                    <div className="prose prose-lg max-w-none">
                      {renderProfessionalContent(result)}
                    </div>

                    {/* Document Footer */}
                    <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                      <p>This is an AI-generated report. For questions, contact the school administration.</p>
                      <p className="mt-1">© {new Date().getFullYear()} PwezaCore. All rights reserved.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        // Generate HTML content for download
                        const htmlContent = generateHTMLReport(result);
                        const blob = new Blob([htmlContent], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${result.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: 'white',
                        backdropFilter: 'blur(20px)'
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
                      className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: 'white',
                        backdropFilter: 'blur(20px)'
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

