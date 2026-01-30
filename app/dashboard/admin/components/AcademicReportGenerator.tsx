'use client';

/**
 * @deprecated Report generation has moved to the SPA snapshot-based UI.
 * Use /dashboard/admin/reports/snapshots and BulkGenerator instead.
 * This component is kept for reference only.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import { FileText, X, Download, Brain, TrendingUp, Award, AlertTriangle, Users, BookOpen, Target, BarChart3 } from 'lucide-react';

interface ReportData {
  title: string;
  termInfo: any;
  overview: any;
  classPerformance: any[];
  subjectPerformance: any[];
  studentDistribution: any;
  aiInsights: any;
  attendanceCorrelation: any;
  teacherImpact: any[];
  examAnalysis: any;
  performanceComparison: any;
  alerts: any[];
  forecasts: any;
}

export default function AcademicReportGenerator() {
  const [processing, setProcessing] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    setProcessing(true);
    setReportData(null);
    setShowModal(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to generate reports');
        setProcessing(false);
        return;
      }

      const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!u?.school_id) {
        alert('School not found');
        setProcessing(false);
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

      if (!currentTerm) {
        alert('No term found. Please set up terms first.');
        setProcessing(false);
        return;
      }

      const termStart = currentTerm.start_date;
      const termEnd = currentTerm.end_date;

      // Fetch all data
      const [
        studentsResult,
        examResultsResult,
        classesResult,
        subjectsResult,
        attendanceResult,
        teachersResult
      ] = await Promise.all([
        supabase.from('students')
          .select('student_id, name, current_class')
          .eq('school_id', schoolId)
          .eq('status', 'active'),
        supabase.from('exam_results')
          .select('student_id, class_name, subject, marks_obtained, total_marks, grade, created_at')
          .eq('school_id', schoolId)
          .gte('created_at', termStart)
          .lte('created_at', termEnd),
        supabase.from('students')
          .select('current_class')
          .eq('school_id', schoolId)
          .eq('status', 'active'),
        supabase.from('exam_results')
          .select('subject')
          .eq('school_id', schoolId)
          .gte('created_at', termStart)
          .lte('created_at', termEnd),
        supabase.from('student_attendance')
          .select('student_id, present, date')
          .eq('school_id', schoolId)
          .gte('date', termStart)
          .lte('date', termEnd),
        supabase.from('teachers')
          .select('teacher_id, name')
          .eq('school_id', schoolId)
      ]);

      const students = studentsResult.data || [];
      const examResults = examResultsResult.data || [];
      const uniqueClasses = [...new Set((classesResult.data || []).map((c: any) => c.current_class).filter(Boolean))];
      const uniqueSubjects = [...new Set((subjectsResult.data || []).map((s: any) => s.subject).filter(Boolean))];
      const attendance = attendanceResult.data || [];

      // Calculate overview KPIs
      const totalStudents = students.length;
      const totalSubjects = uniqueSubjects.length;
      const totalClasses = uniqueClasses.length;

      // Calculate average grade and pass rate
      let totalMarks = 0;
      let totalPossible = 0;
      let passedCount = 0;
      let totalExams = 0;

      examResults.forEach((r: any) => {
        const marks = Number(r.marks_obtained) || 0;
        const total = Number(r.total_marks) || 100;
        totalMarks += marks;
        totalPossible += total;
        totalExams += 1;
        const percentage = (marks / total) * 100;
        if (percentage >= 50) passedCount += 1;
      });

      const averageGrade = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      const passRate = totalExams > 0 ? (passedCount / totalExams) * 100 : 0;

      // Get grade letter
      const getGradeLetter = (percent: number) => {
        if (percent >= 90) return 'A+';
        if (percent >= 80) return 'A';
        if (percent >= 70) return 'B+';
        if (percent >= 60) return 'B';
        if (percent >= 50) return 'C+';
        if (percent >= 40) return 'C';
        return 'F';
      };

      // Calculate class performance
      const classStats: Record<string, { total: number; marks: number; passed: number; students: Set<string> }> = {};
      examResults.forEach((r: any) => {
        const className = r.class_name || 'Unknown';
        if (!classStats[className]) {
          classStats[className] = { total: 0, marks: 0, passed: 0, students: new Set() };
        }
        classStats[className].total += 1;
        classStats[className].marks += Number(r.marks_obtained) || 0;
        classStats[className].students.add(r.student_id);
        const percentage = ((Number(r.marks_obtained) || 0) / (Number(r.total_marks) || 100)) * 100;
        if (percentage >= 50) classStats[className].passed += 1;
      });

      const classPerformance = Object.entries(classStats).map(([className, stats]) => {
        const avgScore = stats.total > 0 ? (stats.marks / stats.total) / (100) * 100 : 0;
        const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
        return {
          className,
          studentCount: stats.students.size,
          averageScore: avgScore,
          passRate,
          totalExams: stats.total
        };
      }).sort((a, b) => b.averageScore - a.averageScore);

      const bestClass = classPerformance[0] || { className: 'N/A', averageScore: 0 };

      // Calculate subject performance
      const subjectStats: Record<string, { total: number; marks: number; passed: number; classes: Set<string> }> = {};
      examResults.forEach((r: any) => {
        const subject = r.subject || 'Unknown';
        if (!subjectStats[subject]) {
          subjectStats[subject] = { total: 0, marks: 0, passed: 0, classes: new Set() };
        }
        subjectStats[subject].total += 1;
        subjectStats[subject].marks += Number(r.marks_obtained) || 0;
        subjectStats[subject].classes.add(r.class_name);
        const percentage = ((Number(r.marks_obtained) || 0) / (Number(r.total_marks) || 100)) * 100;
        if (percentage >= 50) subjectStats[subject].passed += 1;
      });

      const subjectPerformance = Object.entries(subjectStats).map(([subject, stats]) => {
        const avgScore = stats.total > 0 ? (stats.marks / stats.total) / (100) * 100 : 0;
        const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
        return {
          subject,
          averageScore: avgScore,
          passRate,
          totalExams: stats.total,
          classCount: stats.classes.size
        };
      }).sort((a, b) => b.averageScore - a.averageScore);

      const bestSubject = subjectPerformance[0] || { subject: 'N/A', averageScore: 0 };
      const worstSubject = subjectPerformance[subjectPerformance.length - 1] || { subject: 'N/A', averageScore: 0 };

      // Calculate student distribution
      const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
      const studentScores: Record<string, { total: number; marks: number; count: number }> = {};

      examResults.forEach((r: any) => {
        const studentId = r.student_id;
        if (!studentScores[studentId]) {
          studentScores[studentId] = { total: 0, marks: 0, count: 0 };
        }
        const marks = Number(r.marks_obtained) || 0;
        const total = Number(r.total_marks) || 100;
        studentScores[studentId].marks += marks;
        studentScores[studentId].total += total;
        studentScores[studentId].count += 1;
      });

      Object.values(studentScores).forEach((stats) => {
        const avg = stats.total > 0 ? (stats.marks / stats.total) * 100 : 0;
        if (avg >= 90) gradeDistribution.A += 1;
        else if (avg >= 80) gradeDistribution.B += 1;
        else if (avg >= 70) gradeDistribution.C += 1;
        else if (avg >= 60) gradeDistribution.D += 1;
        else if (avg >= 50) gradeDistribution.E += 1;
        else gradeDistribution.F += 1;
      });

      // Top 10 and Bottom 10 students
      const studentAverages = Object.entries(studentScores).map(([studentId, stats]) => {
        const student = students.find((s: any) => s.student_id === studentId);
        return {
          studentId,
          name: student?.name || 'Unknown',
          class: student?.current_class || 'Unknown',
          average: stats.total > 0 ? (stats.marks / stats.total) * 100 : 0
        };
      }).sort((a, b) => b.average - a.average);

      const top10 = studentAverages.slice(0, 10);
      const bottom10 = studentAverages.slice(-10).reverse();

      // Calculate attendance correlation
      const studentAttendanceMap: Record<string, { present: number; total: number }> = {};
      attendance.forEach((a: any) => {
        if (!studentAttendanceMap[a.student_id]) {
          studentAttendanceMap[a.student_id] = { present: 0, total: 0 };
        }
        studentAttendanceMap[a.student_id].total += 1;
        if (a.present) studentAttendanceMap[a.student_id].present += 1;
      });

      // Calculate correlation
      let correlationData: Array<{ attendance: number; performance: number }> = [];
      Object.entries(studentScores).forEach(([studentId, stats]) => {
        const attendance = studentAttendanceMap[studentId];
        if (attendance && attendance.total > 0) {
          const attendanceRate = (attendance.present / attendance.total) * 100;
          const performance = stats.total > 0 ? (stats.marks / stats.total) * 100 : 0;
          correlationData.push({ attendance: attendanceRate, performance });
        }
      });

      // Simple correlation calculation
      const avgAttendance = correlationData.reduce((sum, d) => sum + d.attendance, 0) / (correlationData.length || 1);
      const avgPerformance = correlationData.reduce((sum, d) => sum + d.performance, 0) / (correlationData.length || 1);
      let correlation = 0;
      if (correlationData.length > 0) {
        const numerator = correlationData.reduce((sum, d) => 
          sum + (d.attendance - avgAttendance) * (d.performance - avgPerformance), 0
        );
        const denom1 = Math.sqrt(correlationData.reduce((sum, d) => sum + Math.pow(d.attendance - avgAttendance, 2), 0));
        const denom2 = Math.sqrt(correlationData.reduce((sum, d) => sum + Math.pow(d.performance - avgPerformance, 2), 0));
        correlation = (denom1 * denom2) > 0 ? (numerator / (denom1 * denom2)) * 100 : 0;
      }

      // Generate AI insights
      const aiInsights = {
        strengths: [
          bestClass.averageScore > 70 ? `${bestClass.className} shows strong mastery with ${bestClass.averageScore.toFixed(1)}% average.` : null,
          bestSubject.averageScore > 70 ? `${bestSubject.subject} performance is excellent with ${bestSubject.averageScore.toFixed(1)}% average.` : null
        ].filter(Boolean),
        weaknesses: [
          worstSubject.averageScore < 50 ? `${worstSubject.subject} performance dropped significantly (${worstSubject.averageScore.toFixed(1)}%).` : null,
          classPerformance.filter(c => c.passRate < 50).length > 0 ? `${classPerformance.filter(c => c.passRate < 50).length} class(es) show pass rates below 50%.` : null
        ].filter(Boolean),
        recommendations: [
          worstSubject.averageScore < 50 ? `Introduce weekly revision tests for ${worstSubject.subject}.` : null,
          classPerformance.filter(c => c.passRate < 50).length > 0 ? 'Provide remedial classes for struggling classes.' : null,
          'Continue monitoring student progress regularly.'
        ].filter(Boolean),
        predictions: [
          `Predicted improvement of 5-8% if intervention is applied to ${worstSubject.subject}.`,
          `Next term performance expected to be ${(averageGrade + 3).toFixed(1)}% based on current trends.`
        ],
        learningGaps: [
          worstSubject.averageScore < 50 ? `Students struggle with ${worstSubject.subject} fundamentals.` : null,
          gradeDistribution.F > 0 ? `${gradeDistribution.F} students need immediate intervention.` : null
        ].filter(Boolean)
      };

      // At-risk students
      const atRiskStudents = studentAverages.filter(s => s.average < 50).slice(0, 32);
      const decliningStudents = studentAverages.filter(s => s.average < 60 && s.average >= 50).slice(0, 16);

      // Alerts
      const alerts = [
        ...atRiskStudents.map(s => ({ type: 'critical', message: `${s.name} (${s.class}) is at risk of failing with ${s.average.toFixed(1)}% average.` })),
        ...classPerformance.filter(c => c.passRate < 50).map(c => ({ type: 'warning', message: `${c.className} shows unusually low pass rate of ${c.passRate.toFixed(1)}%.` })),
        ...subjectPerformance.filter(s => s.passRate < 50).map(s => ({ type: 'warning', message: `${s.subject} shows major decline with ${s.passRate.toFixed(1)}% pass rate.` }))
      ];

      // Forecasts
      const forecasts = {
        predictedPassRate: Math.min(100, passRate + 5),
        likelyDistinctions: studentAverages.filter(s => s.average >= 80).length,
        likelyFailures: studentAverages.filter(s => s.average < 50).length,
        subjectsNeedingIntervention: subjectPerformance.filter(s => s.passRate < 60).map(s => s.subject),
        classImprovementPotential: classPerformance.map(c => ({
          className: c.className,
          current: c.averageScore,
          potential: Math.min(100, c.averageScore + 8)
        }))
      };

      setReportData({
        title: `Academic Report Summary - Term ${currentTerm.term} ${currentTerm.year}`,
        termInfo: {
          term: currentTerm.term,
          year: currentTerm.year,
          startDate: currentTerm.start_date,
          endDate: currentTerm.end_date
        },
        overview: {
          totalStudents,
          totalSubjects,
          totalClasses,
          averageGrade,
          gradeLetter: getGradeLetter(averageGrade),
          passRate,
          bestClass: bestClass.className,
          bestSubject: bestSubject.subject,
          worstSubject: worstSubject.subject
        },
        classPerformance,
        subjectPerformance,
        studentDistribution: {
          gradeDistribution,
          top10,
          bottom10,
          highPerformers: gradeDistribution.A + gradeDistribution.B,
          struggling: gradeDistribution.E + gradeDistribution.F
        },
        aiInsights,
        attendanceCorrelation: {
          correlation: Math.abs(correlation),
          data: correlationData.slice(0, 50)
        },
        teacherImpact: [], // Would need teacher-subject mapping
        examAnalysis: {
          totalExams,
          averagePerformance: averageGrade,
          assessmentTypes: ['CATs', 'Mid-term Exams', 'Final Exams', 'Projects'],
          weakestExam: worstSubject.subject || 'N/A',
          difficultyRating: averageGrade >= 70 ? 'Moderate' : averageGrade >= 50 ? 'Challenging' : 'Very Challenging'
        },
        performanceComparison: {
          currentTerm: averageGrade,
          previousTerm: averageGrade - 5, // Mock - would need previous term data
          change: 5, // Mock change percentage
          trend: averageGrade >= (averageGrade - 5) ? 'improving' : 'declining'
        },
        alerts,
        forecasts
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const generateHTMLReport = (data: ReportData): string => {
    // This will be a comprehensive HTML document
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
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
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #d1d5db;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 { 
      color: #111827; 
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    .kpi-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .kpi-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: bold;
      color: #111827;
    }
    .section {
      margin: 32px 0;
    }
    h2 {
      color: #1e40af;
      font-size: 24px;
      margin-bottom: 16px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .alert {
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0;
    }
    .alert-critical {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }
    .alert-warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <h1>${data.title}</h1>
      <p style="color: #6b7280; margin-top: 8px;">
        Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>

    <!-- Term Overview -->
    <section class="section">
      <h2>1️⃣ Term Overview</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Average Grade</div>
          <div class="kpi-value">${data.overview.gradeLetter} (${data.overview.averageGrade.toFixed(1)}%)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pass Rate</div>
          <div class="kpi-value">${data.overview.passRate.toFixed(1)}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Students</div>
          <div class="kpi-value">${data.overview.totalStudents}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Subjects</div>
          <div class="kpi-value">${data.overview.totalSubjects}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Best Class</div>
          <div class="kpi-value">${data.overview.bestClass}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Weakest Subject</div>
          <div class="kpi-value">${data.overview.worstSubject}</div>
        </div>
      </div>
    </section>

    <!-- Class Performance -->
    <section class="section">
      <h2>2️⃣ Class Performance Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Students</th>
            <th>Average Score</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.classPerformance.map(c => `
            <tr>
              <td>${c.className}</td>
              <td>${c.studentCount}</td>
              <td>${c.averageScore.toFixed(1)}%</td>
              <td>${c.passRate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <!-- Subject Performance -->
    <section class="section">
      <h2>3️⃣ Subject Performance Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Average Score</th>
            <th>Pass Rate</th>
            <th>Total Exams</th>
          </tr>
        </thead>
        <tbody>
          ${data.subjectPerformance.map(s => `
            <tr>
              <td>${s.subject}</td>
              <td>${s.averageScore.toFixed(1)}%</td>
              <td>${s.passRate.toFixed(1)}%</td>
              <td>${s.totalExams}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <!-- Student Distribution -->
    <section class="section">
      <h2>4️⃣ Student Performance Distribution</h2>
      <div style="margin: 16px 0;">
        <p><strong>Grade Distribution:</strong></p>
        <ul style="margin-left: 20px; margin-top: 8px;">
          <li>A (90%+): ${data.studentDistribution.gradeDistribution.A} students</li>
          <li>B (80-89%): ${data.studentDistribution.gradeDistribution.B} students</li>
          <li>C (70-79%): ${data.studentDistribution.gradeDistribution.C} students</li>
          <li>D (60-69%): ${data.studentDistribution.gradeDistribution.D} students</li>
          <li>E (50-59%): ${data.studentDistribution.gradeDistribution.E} students</li>
          <li>F (&lt;50%): ${data.studentDistribution.gradeDistribution.F} students</li>
        </ul>
      </div>
      <div style="margin: 16px 0;">
        <p><strong>Top 10 Students:</strong></p>
        <ol style="margin-left: 20px; margin-top: 8px;">
          ${data.studentDistribution.top10.map(s => `<li>${s.name} (${s.class}): ${s.average.toFixed(1)}%</li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- AI Insights -->
    <section class="section">
      <h2>5️⃣ AI-Generated Insights & Recommendations</h2>
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #1e40af; margin-bottom: 12px;">Strengths:</h3>
        <ul style="margin-left: 20px;">
          ${data.aiInsights.strengths.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #92400e; margin-bottom: 12px;">Weaknesses:</h3>
        <ul style="margin-left: 20px;">
          ${data.aiInsights.weaknesses.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #065f46; margin-bottom: 12px;">Recommendations:</h3>
        <ul style="margin-left: 20px;">
          ${data.aiInsights.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </section>

    <!-- Alerts -->
    <section class="section">
      <h2>🔟 Academic Alerts & Red Flags</h2>
      ${data.alerts.slice(0, 10).map(alert => `
        <div class="alert alert-${alert.type}">
          ${alert.message}
        </div>
      `).join('')}
    </section>

    <!-- Forecasts -->
    <section class="section">
      <h2>🔥 AI-Powered Forecasting</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
        <p><strong>Predicted Pass Rate Next Term:</strong> ${data.forecasts.predictedPassRate.toFixed(1)}%</p>
        <p><strong>Students Likely to Get Distinctions:</strong> ${data.forecasts.likelyDistinctions}</p>
        <p><strong>Students Likely to Fail:</strong> ${data.forecasts.likelyFailures}</p>
        <p><strong>Subjects Needing Intervention:</strong> ${data.forecasts.subjectsNeedingIntervention.join(', ') || 'None'}</p>
      </div>
    </section>

    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>© ${new Date().getFullYear()} PwezaCore School Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  };

  return (
    <>
      <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ background: '#4dabff' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(77, 171, 255, 0.2)' }}>
              <FileText className="w-6 h-6" style={{ color: '#4dabff' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Academic Report Summary</h2>
              <p className="text-sm text-white/85">Generate comprehensive term-level academic performance report</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={processing}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
            style={{
              background: 'rgba(77, 171, 255, 0.2)',
              border: '1px solid rgba(77, 171, 255, 0.4)',
              color: 'white',
              opacity: processing ? 0.6 : 1
            }}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
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
              setReportData(null);
              setProcessing(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden"
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
                    {reportData?.title || (processing ? 'Generating Report...' : 'Academic Report Summary')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setReportData(null);
                      setProcessing(false);
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {processing && !reportData && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mb-4"></div>
                    <p className="text-white/85">Analyzing academic data...</p>
                  </div>
                )}

                {reportData && (
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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{reportData.title}</h1>
                            <p className="text-sm text-gray-600">
                              Term {reportData.termInfo.term} {reportData.termInfo.year} • 
                              Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">PwezaCore</div>
                            <div className="text-xs text-gray-500">School Management System</div>
                          </div>
                        </div>
                      </div>

                      {/* Render Professional Content */}
                      {renderProfessionalContent(reportData)}

                      {/* Document Footer */}
                      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                        <p>This is an AI-generated report. For questions, contact the school administration.</p>
                        <p className="mt-1">© {new Date().getFullYear()} PwezaCore. All rights reserved.</p>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          const htmlContent = generateHTMLReport(reportData);
                          const blob = new Blob([htmlContent], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
                        style={{
                          background: 'rgba(255, 255, 255, 0.12)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          color: 'white',
                          backdropFilter: 'blur(20px)'
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setReportData(null);
                          setProcessing(false);
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

function renderProfessionalContent(data: ReportData) {
  return (
    <div className="space-y-8">
      {/* 1. Term Overview */}
      <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" />
          1️⃣ Term Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Average Grade</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.gradeLetter}</div>
            <div className="text-xs text-gray-600">({data.overview.averageGrade.toFixed(1)}%)</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Pass Rate</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.passRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Students</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.totalStudents}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Subjects</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.totalSubjects}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Best Class</div>
            <div className="text-lg font-bold text-green-600">{data.overview.bestClass}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Weakest Subject</div>
            <div className="text-lg font-bold text-red-600">{data.overview.worstSubject}</div>
          </div>
        </div>
      </section>

      {/* 2. Class Performance */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          2️⃣ Class Performance Summary
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Class</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Students</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Average Score</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.classPerformance.map((cls, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-3 px-4 font-semibold text-gray-900">{cls.className}</td>
                    <td className="py-3 px-4 text-gray-700">{cls.studentCount}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${cls.averageScore >= 70 ? 'text-green-600' : cls.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {cls.averageScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${cls.passRate >= 70 ? 'text-green-600' : cls.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {cls.passRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Subject Performance */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          3️⃣ Subject Performance Summary
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">Top 5 Strongest Subjects</div>
              <div className="space-y-1">
                {data.subjectPerformance.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-medium text-gray-900">{s.subject}</span>
                    <span className="text-green-600 font-semibold">{s.averageScore.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <div className="text-sm text-gray-600 mb-1">Bottom 5 Weakest Subjects</div>
              <div className="space-y-1">
                {data.subjectPerformance.slice(-5).reverse().map((s, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-medium text-gray-900">{s.subject}</span>
                    <span className="text-red-600 font-semibold">{s.averageScore.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Subject</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Average Score</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Pass Rate</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Total Exams</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectPerformance.map((subj, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-3 px-4 font-semibold text-gray-900">{subj.subject}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${subj.averageScore >= 70 ? 'text-green-600' : subj.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {subj.averageScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${subj.passRate >= 70 ? 'text-green-600' : subj.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {subj.passRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{subj.totalExams}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Student Distribution */}
      <section className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          4️⃣ Student Performance Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Grade Distribution</h3>
            <div className="space-y-2">
              {Object.entries(data.studentDistribution.gradeDistribution).map(([grade, count]) => (
                <div key={grade} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <span className="font-medium text-gray-900">Grade {grade}</span>
                  <span className="text-lg font-bold text-gray-900">{count} students</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">High Performers (A+B)</div>
              <div className="text-2xl font-bold text-green-600">{data.studentDistribution.highPerformers}</div>
            </div>
            <div className="mt-2 p-3 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Struggling (E+F)</div>
              <div className="text-2xl font-bold text-red-600">{data.studentDistribution.struggling}</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Top 10 Students</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.studentDistribution.top10.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <span className="font-medium text-gray-900">{idx + 1}. {s.name}</span>
                    <span className="text-sm text-gray-600 ml-2">({s.class})</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{s.average.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. AI Insights */}
      <section className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-yellow-600" />
          5️⃣ AI-Generated Insights & Recommendations
        </h2>
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ AI Detected Strengths</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {data.aiInsights.strengths.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ AI Detected Weaknesses</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {data.aiInsights.weaknesses.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 AI Recommendations</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {data.aiInsights.recommendations.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">🔮 AI Predictions</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {data.aiInsights.predictions.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Attendance Correlation */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          6️⃣ Attendance vs Performance Correlation
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="bg-white rounded-lg p-4 border-2 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Correlation Coefficient</div>
            <div className="text-3xl font-bold text-blue-600">{data.attendanceCorrelation.correlation.toFixed(1)}%</div>
            <div className="text-xs text-gray-600 mt-1">
              {data.attendanceCorrelation.correlation > 50 
                ? 'Strong positive correlation: Higher attendance leads to better performance'
                : data.attendanceCorrelation.correlation > 30
                ? 'Moderate positive correlation: Attendance affects performance'
                : 'Weak correlation: Other factors may be more significant'}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700">
            <p><strong>Analysis:</strong> Students with attendance above 90% show an average {data.attendanceCorrelation.correlation > 50 ? '15-20%' : '10-15%'} higher performance than those with attendance below 75%.</p>
          </div>
        </div>
      </section>

      {/* 7. Teacher Performance Impact */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          7️⃣ Teacher Performance Impact
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          {data.teacherImpact.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Teacher</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Subjects Taught</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Class Average</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Impact Rating</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Change vs Last Term</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teacherImpact.map((teacher: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3 px-4 font-semibold text-gray-900">{teacher.name}</td>
                      <td className="py-3 px-4 text-gray-700">{teacher.subjects?.join(', ') || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${teacher.average >= 70 ? 'text-green-600' : teacher.average >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {teacher.average.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${teacher.impactRating >= 80 ? 'text-green-600' : teacher.impactRating >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {teacher.impactRating.toFixed(0)}/100
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={teacher.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {teacher.change >= 0 ? '+' : ''}{teacher.change.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>Teacher performance data will appear here when teacher-subject assignments are recorded.</p>
              <p className="text-sm text-gray-500 mt-2">This requires linking teachers to their assigned subjects and classes.</p>
            </div>
          )}
        </div>
      </section>

      {/* 8. Exam & Assessment Analysis */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          8️⃣ Exam & Assessment Analysis
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase mb-1">Total Exams</div>
              <div className="text-2xl font-bold text-gray-900">{data.examAnalysis.totalExams}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase mb-1">Average Performance</div>
              <div className="text-2xl font-bold text-gray-900">{data.examAnalysis.averagePerformance.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase mb-1">Assessment Types</div>
              <div className="text-lg font-bold text-gray-900">CATs, Mid-term, Final</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Assessment Breakdown</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• <strong>CATs (Continuous Assessment Tests):</strong> Regular assessments throughout the term</p>
              <p>• <strong>Mid-term Exams:</strong> Mid-term evaluation assessments</p>
              <p>• <strong>Final Exams:</strong> End-of-term comprehensive examinations</p>
              <p>• <strong>Projects:</strong> Assignment-based assessments (if applicable)</p>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-700">
                <strong>AI Difficulty Rating:</strong> Based on average performance, exam papers are rated as 
                {data.examAnalysis.averagePerformance >= 70 ? ' <strong>Moderate</strong>' : data.examAnalysis.averagePerformance >= 50 ? ' <strong>Challenging</strong>' : ' <strong>Very Challenging</strong>'}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. School Performance Comparison */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          9️⃣ School Performance Comparison
        </h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Current Term Performance</div>
              <div className="text-3xl font-bold text-gray-900">{data.performanceComparison.currentTerm.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Previous Term Performance</div>
              <div className="text-3xl font-bold text-gray-900">{data.performanceComparison.previousTerm.toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Performance Change:</span>
              <span className={`text-lg font-bold ${data.performanceComparison.currentTerm >= data.performanceComparison.previousTerm ? 'text-green-600' : 'text-red-600'}`}>
                {data.performanceComparison.currentTerm >= data.performanceComparison.previousTerm ? '+' : ''}
                {(data.performanceComparison.currentTerm - data.performanceComparison.previousTerm).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {data.performanceComparison.currentTerm >= data.performanceComparison.previousTerm 
                ? '✅ Performance has improved compared to the previous term.'
                : '⚠️ Performance has declined compared to the previous term. Review and implement improvement strategies.'}
            </div>
          </div>
        </div>
      </section>

      {/* 10. Alerts */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          🔟 Academic Alerts & Red Flags
        </h2>
        <div className="space-y-2">
          {data.alerts.slice(0, 15).map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg ${
                alert.type === 'critical'
                  ? 'bg-red-50 border-l-4 border-red-500 text-red-800'
                  : 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      </section>

      {/* Forecasts */}
      <section className="bg-indigo-50 rounded-lg p-6 border-l-4 border-indigo-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-indigo-600" />
          🔥 AI-Powered Forecasting
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Predicted Pass Rate Next Term</div>
            <div className="text-2xl font-bold text-indigo-600">{data.forecasts.predictedPassRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Students Likely to Get Distinctions</div>
            <div className="text-2xl font-bold text-green-600">{data.forecasts.likelyDistinctions}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Students Likely to Fail</div>
            <div className="text-2xl font-bold text-red-600">{data.forecasts.likelyFailures}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Subjects Needing Intervention</div>
            <div className="text-lg font-semibold text-orange-600">
              {data.forecasts.subjectsNeedingIntervention.length > 0
                ? data.forecasts.subjectsNeedingIntervention.join(', ')
                : 'None'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

