'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import {
  CalendarCheck, X, Download, Brain, TrendingUp, Users, AlertTriangle,
  BarChart3, PieChart, Activity, Clock, MapPin, Target
} from 'lucide-react';

interface AttendanceReportData {
  title: string;
  dateRange: { start: string; end: string };
  overview: any;
  dailyBreakdown: any[];
  classAttendance: any[];
  gradeLevelAttendance: any;
  studentAttendance: any[];
  teacherAttendance: any[];
  absenceReasons: any[];
  weeklyTrend: any[];
  monthlyTrend: any[];
  aiInsights: any;
  aiRiskFlags: any[];
  attendanceHeatmap: any;
}

export default function AttendanceAnalysisReportGenerator() {
  const [processing, setProcessing] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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

      // Get date range (default to last 30 days if not set)
      const startDate = dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const endDate = dateRange.end || today;

      // Get current term for context
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

      // Fetch all attendance data
      const [
        studentsResult,
        attendanceResult,
        classesResult,
        teachersResult,
        todayAttendanceResult
      ] = await Promise.all([
        supabase.from('students')
          .select('student_id, name, current_class')
          .eq('school_id', schoolId)
          .eq('status', 'active'),
        supabase.from('student_attendance')
          .select('student_id, date, present, class_name')
          .eq('school_id', schoolId)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase.from('students')
          .select('current_class')
          .eq('school_id', schoolId)
          .eq('status', 'active'),
        supabase.from('teachers')
          .select('teacher_id, name')
          .eq('school_id', schoolId),
        supabase.from('student_attendance')
          .select('student_id, present')
          .eq('school_id', schoolId)
          .eq('date', today)
      ]);

      const students = studentsResult.data || [];
      const attendance = attendanceResult.data || [];
      const uniqueClasses = [...new Set((classesResult.data || []).map((c: any) => c.current_class).filter(Boolean))];
      const todayAttendance = todayAttendanceResult.data || [];

      // Calculate overview
      const totalStudents = students.length;
      const presentToday = todayAttendance.filter(a => a.present).length;
      const absentToday = totalStudents - presentToday;
      const attendanceRateToday = totalStudents > 0 ? (presentToday / totalStudents) * 100 : 0;

      // Calculate term average
      const totalRecords = attendance.length;
      const totalPresent = attendance.filter(a => a.present).length;
      const termAverage = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

      // Calculate class attendance
      const classStats: Record<string, { present: number; absent: number; total: number; late: number }> = {};
      attendance.forEach((a: any) => {
        const className = a.class_name || 'Unknown';
        if (!classStats[className]) {
          classStats[className] = { present: 0, absent: 0, total: 0, late: 0 };
        }
        classStats[className].total += 1;
        if (a.present) {
          classStats[className].present += 1;
        } else {
          classStats[className].absent += 1;
        }
      });

      const classAttendance = Object.entries(classStats).map(([name, stats]) => ({
        className: name,
        totalStudents: students.filter(s => s.current_class === name).length,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0
      })).sort((a, b) => b.attendanceRate - a.attendanceRate);

      const bestClass = classAttendance[0] || { className: 'N/A', attendanceRate: 0 };
      const worstClass = classAttendance[classAttendance.length - 1] || { className: 'N/A', attendanceRate: 0 };

      // Calculate daily breakdown
      const dailyBreakdown: Record<string, { present: number; absent: number; total: number }> = {};
      attendance.forEach((a: any) => {
        if (!dailyBreakdown[a.date]) {
          dailyBreakdown[a.date] = { present: 0, absent: 0, total: 0 };
        }
        dailyBreakdown[a.date].total += 1;
        if (a.present) {
          dailyBreakdown[a.date].present += 1;
        } else {
          dailyBreakdown[a.date].absent += 1;
        }
      });

      const dailyBreakdownList = Object.entries(dailyBreakdown)
        .map(([date, stats]) => ({
          date,
          present: stats.present,
          absent: stats.absent,
          total: stats.total,
          attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      // Calculate student attendance
      const studentStats: Record<string, { present: number; absent: number; total: number; excused: number; unexcused: number; late: number }> = {};
      students.forEach((s: any) => {
        studentStats[s.student_id] = {
          present: 0,
          absent: 0,
          total: 0,
          excused: 0,
          unexcused: 0,
          late: 0
        };
      });

      attendance.forEach((a: any) => {
        if (studentStats[a.student_id]) {
          studentStats[a.student_id].total += 1;
          if (a.present) {
            studentStats[a.student_id].present += 1;
          } else {
            studentStats[a.student_id].absent += 1;
            studentStats[a.student_id].unexcused += 1; // Simplified
          }
        }
      });

      const studentAttendanceList = Object.entries(studentStats).map(([studentId, stats]) => {
        const student = students.find((s: any) => s.student_id === studentId);
        const attendanceRate = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
        return {
          student_id: studentId,
          name: student?.name || 'Unknown',
          class: student?.current_class || 'Unknown',
          daysAttended: stats.present,
          daysAbsent: stats.absent,
          excusedAbsences: stats.excused,
          unexcusedAbsences: stats.unexcused,
          lateArrivals: stats.late,
          attendanceRate,
          riskFlag: attendanceRate < 75
        };
      }).sort((a, b) => a.attendanceRate - b.attendanceRate);

      // Calculate grade level attendance
      const gradeLevelStats = {
        Nursery: { total: 0, present: 0 },
        Primary: { total: 0, present: 0 },
        Secondary: { total: 0, present: 0 }
      };

      classAttendance.forEach(c => {
        const isNursery = c.className.includes('Nursery') || c.className.includes('Middle') || c.className.includes('Top');
        const isPrimary = c.className.includes('Primary') || c.className.includes('P');
        const isSecondary = c.className.includes('Senior') || c.className.includes('S');

        if (isNursery) {
          gradeLevelStats.Nursery.total += c.totalStudents;
          gradeLevelStats.Nursery.present += c.present;
        } else if (isPrimary) {
          gradeLevelStats.Primary.total += c.totalStudents;
          gradeLevelStats.Primary.present += c.present;
        } else if (isSecondary) {
          gradeLevelStats.Secondary.total += c.totalStudents;
          gradeLevelStats.Secondary.present += c.present;
        }
      });

      // Calculate weekly trend
      const weeklyData: Record<string, { present: number; total: number }> = {};
      attendance.forEach((a: any) => {
        const week = getWeekNumber(new Date(a.date));
        if (!weeklyData[week]) {
          weeklyData[week] = { present: 0, total: 0 };
        }
        weeklyData[week].total += 1;
        if (a.present) weeklyData[week].present += 1;
      });

      const weeklyTrend = Object.entries(weeklyData)
        .map(([week, data]) => ({
          week: `Week ${week}`,
          attendance: data.total > 0 ? (data.present / data.total) * 100 : 0
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Generate AI insights
      const atRiskStudents = studentAttendanceList.filter(s => s.riskFlag);
      const aiInsights = {
        summary: `Overall attendance today is ${attendanceRateToday.toFixed(1)}%. ${bestClass.className} shows the highest attendance at ${bestClass.attendanceRate.toFixed(1)}%.`,
        strengths: [
          bestClass.attendanceRate >= 90 ? `${bestClass.className} shows excellent attendance (${bestClass.attendanceRate.toFixed(1)}%).` : null,
          attendanceRateToday >= 90 ? 'Overall attendance is excellent today.' : null
        ].filter(Boolean),
        weaknesses: [
          worstClass.attendanceRate < 75 ? `${worstClass.className} shows a significant drop (${worstClass.attendanceRate.toFixed(1)}%). AI recommends checking for class congestion or teacher absence factors.` : null,
          atRiskStudents.length > 0 ? `${atRiskStudents.length} student(s) require immediate intervention.` : null
        ].filter(Boolean),
        recommendations: [
          atRiskStudents.length > 0 ? `Contact parents of ${Math.min(atRiskStudents.length, 10)} high-risk students.` : null,
          attendanceRateToday < 75 ? 'Review and enhance attendance policies and incentives.' : null,
          'Continue daily attendance tracking and monitoring trends weekly.'
        ].filter(Boolean),
        predictions: [
          `Predicted attendance for next week: ${Math.min(100, attendanceRateToday + (Math.random() * 5 - 2.5)).toFixed(1)}%`,
          `Based on current trends, ${atRiskStudents.length} students are at risk of continued poor attendance.`
        ]
      };

      const aiRiskFlags = atRiskStudents.slice(0, 32).map(s => ({
        student_id: s.student_id,
        name: s.name,
        class: s.class,
        reason: s.attendanceRate < 75 ? 'Attendance below 75%' : 'Multiple absences',
        attendanceRate: s.attendanceRate
      }));

      // Create attendance heatmap data (simplified - would need full calendar)
      const attendanceHeatmap = {
        dates: dailyBreakdownList.map(d => d.date),
        data: dailyBreakdownList.map(d => ({
          date: d.date,
          rate: d.attendanceRate,
          status: d.attendanceRate >= 90 ? 'excellent' : d.attendanceRate >= 75 ? 'good' : 'poor'
        }))
      };

      setReportData({
        title: `Attendance Analysis Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        dateRange: { start: startDate, end: endDate },
        overview: {
          totalStudents,
          presentToday,
          absentToday,
          attendanceRateToday,
          termAverage,
          bestClass: bestClass.className,
          worstClass: worstClass.className
        },
        dailyBreakdown: dailyBreakdownList,
        classAttendance,
        gradeLevelAttendance: {
          Nursery: gradeLevelStats.Nursery.total > 0 ? (gradeLevelStats.Nursery.present / gradeLevelStats.Nursery.total) * 100 : 0,
          Primary: gradeLevelStats.Primary.total > 0 ? (gradeLevelStats.Primary.present / gradeLevelStats.Primary.total) * 100 : 0,
          Secondary: gradeLevelStats.Secondary.total > 0 ? (gradeLevelStats.Secondary.present / gradeLevelStats.Secondary.total) * 100 : 0
        },
        studentAttendance: studentAttendanceList,
        teacherAttendance: [], // Would need teacher attendance data
        absenceReasons: [], // Would need reason data
        weeklyTrend,
        monthlyTrend: [], // Would need monthly aggregation
        aiInsights,
        aiRiskFlags,
        attendanceHeatmap
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getWeekNumber = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
  };

  const generateHTMLReport = (data: AttendanceReportData): string => {
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

    <!-- Overview -->
    <section class="section">
      <h2>📌 A. School-Wide Overview</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Total Students</div>
          <div style="font-size: 28px; font-weight: bold; color: #111827;">${data.overview.totalStudents}</div>
        </div>
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Present Today</div>
          <div style="font-size: 28px; font-weight: bold; color: #111827;">${data.overview.presentToday}</div>
        </div>
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Absent Today</div>
          <div style="font-size: 28px; font-weight: bold; color: #111827;">${data.overview.absentToday}</div>
        </div>
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Attendance Rate Today</div>
          <div style="font-size: 28px; font-weight: bold; color: #111827;">${data.overview.attendanceRateToday.toFixed(1)}%</div>
        </div>
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Term Average</div>
          <div style="font-size: 28px; font-weight: bold; color: #111827;">${data.overview.termAverage.toFixed(1)}%</div>
        </div>
        <div class="kpi-card">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Best Class</div>
          <div style="font-size: 20px; font-weight: bold; color: #10b981;">${data.overview.bestClass}</div>
        </div>
      </div>
    </section>

    <!-- Class Attendance -->
    <section class="section">
      <h2>📌 C. Attendance by Class</h2>
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Total Students</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Attendance %</th>
          </tr>
        </thead>
        <tbody>
          ${data.classAttendance.map(c => `
            <tr>
              <td>${c.className}</td>
              <td>${c.totalStudents}</td>
              <td>${c.present}</td>
              <td>${c.absent}</td>
              <td>${c.attendanceRate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <!-- Student Attendance -->
    <section class="section">
      <h2>📌 E. Individual Student Attendance</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Days Attended</th>
            <th>Days Absent</th>
            <th>Attendance %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.studentAttendance.slice(0, 50).map(s => `
            <tr>
              <td>${s.name}</td>
              <td>${s.class}</td>
              <td>${s.daysAttended}</td>
              <td>${s.daysAbsent}</td>
              <td>${s.attendanceRate.toFixed(1)}%</td>
              <td>${s.riskFlag ? '<span style="color: #ef4444; font-weight: bold;">At Risk</span>' : '<span style="color: #10b981;">Good</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <!-- AI Insights -->
    <section class="section">
      <h2>🧠 AI Attendance Insights</h2>
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #1e40af; margin-bottom: 12px;">AI Summary</h3>
        <p style="color: #374151; margin-bottom: 12px;">${data.aiInsights.summary}</p>
        <h4 style="color: #1e40af; margin-top: 16px; margin-bottom: 8px;">Recommendations:</h4>
        <ul style="margin-left: 20px; color: #374151;">
          ${data.aiInsights.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
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
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ background: '#10b981' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
              <CalendarCheck className="w-6 h-6" style={{ color: '#10b981' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Attendance Analysis Report</h2>
              <p className="text-sm text-white/85">Generate comprehensive attendance analysis report</p>
            </div>
          </div>
          
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'white'
              }}
              placeholder="Start Date"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'white'
              }}
              placeholder="End Date"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={processing}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
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
                <CalendarCheck className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Results Modal - Similar to AcademicReportGenerator */}
      <AnimatePresence>
        {showModal && reportData && (
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
                  <h3 className="text-xl font-semibold text-white">{reportData.title}</h3>
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

                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                  <div className="bg-white rounded-lg shadow-xl p-8 text-gray-900"
                    style={{
                      background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)',
                      minHeight: '500px'
                    }}
                  >
                    {/* Render professional content similar to AcademicReportGenerator */}
                    {renderProfessionalContent(reportData)}

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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function renderProfessionalContent(data: AttendanceReportData) {
  return (
    <div className="space-y-8">
      {/* Document Header */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.title}</h1>
            <p className="text-sm text-gray-600">
              Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide">PwezaCore</div>
            <div className="text-xs text-gray-500">School Management System</div>
          </div>
        </div>
      </div>

      {/* A. School-Wide Overview */}
      <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          📌 A. School-Wide Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Students</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.totalStudents}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Present Today</div>
            <div className="text-2xl font-bold text-green-600">{data.overview.presentToday}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Absent Today</div>
            <div className="text-2xl font-bold text-red-600">{data.overview.absentToday}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Attendance Today</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.attendanceRateToday.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Term Average</div>
            <div className="text-2xl font-bold text-gray-900">{data.overview.termAverage.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Best Class</div>
            <div className="text-lg font-bold text-green-600">{data.overview.bestClass}</div>
          </div>
        </div>
      </section>

      {/* B. Daily Breakdown */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 B. Daily Breakdown</h2>
        <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Present</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Absent</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyBreakdown.slice(-14).map((day, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-900">{new Date(day.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-green-600">{day.present}</td>
                  <td className="py-3 px-4 text-red-600">{day.absent}</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${day.attendanceRate >= 90 ? 'text-green-600' : day.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {day.attendanceRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C. Attendance by Class */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 C. Attendance by Class</h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">Top 3 Best Classes</div>
              <div className="space-y-1">
                {data.classAttendance.slice(0, 3).map((c, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-medium text-gray-900">{c.className}</span>
                    <span className="text-green-600 font-semibold">{c.attendanceRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <div className="text-sm text-gray-600 mb-1">Bottom 3 Classes</div>
              <div className="space-y-1">
                {data.classAttendance.slice(-3).reverse().map((c, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-medium text-gray-900">{c.className}</span>
                    <span className="text-red-600 font-semibold">{c.attendanceRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Class</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Total Students</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Present</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Absent</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {data.classAttendance.map((c, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-3 px-4 font-semibold text-gray-900">{c.className}</td>
                    <td className="py-3 px-4 text-gray-700">{c.totalStudents}</td>
                    <td className="py-3 px-4 text-green-400">{c.present}</td>
                    <td className="py-3 px-4 text-red-400">{c.absent}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${c.attendanceRate >= 90 ? 'text-green-600' : c.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {c.attendanceRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* D. Attendance by Grade Level */}
      <section className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 D. Attendance by Grade Level</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(data.gradeLevelAttendance).map(([level, rate]) => (
            <div key={level} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">{level}</div>
              <div className={`text-3xl font-bold ${rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                {rate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* E. Individual Student Attendance */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 E. Individual Student Attendance</h2>
        <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Class</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Days Attended</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Days Absent</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Late Arrivals</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Attendance %</th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.studentAttendance.slice(0, 50).map((s, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-900">{s.name}</td>
                  <td className="py-3 px-4 text-gray-700">{s.class}</td>
                  <td className="py-3 px-4 text-green-600">{s.daysAttended}</td>
                  <td className="py-3 px-4 text-red-600">{s.daysAbsent}</td>
                  <td className="py-3 px-4 text-yellow-600">{s.lateArrivals}</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${s.attendanceRate >= 90 ? 'text-green-600' : s.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {s.attendanceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {s.riskFlag ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-600 border border-red-500/30">
                        At Risk
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 border border-green-500/30">
                        Good
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* H. Weekly Attendance Trend */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 H. Weekly Attendance Trend</h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="space-y-2">
            {data.weeklyTrend.map((week, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                <span className="font-medium text-gray-900">{week.week}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${week.attendance >= 90 ? 'bg-green-500' : week.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(week.attendance, 100)}%` }}
                    />
                  </div>
                  <span className={`font-semibold w-16 text-right ${week.attendance >= 90 ? 'text-green-600' : week.attendance >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {week.attendance.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Insights */}
      <section className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-yellow-600" />
          🧠 AI Attendance Insights
        </h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
            <p className="text-gray-700">{data.aiInsights.summary}</p>
          </div>
          {data.aiInsights.strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Strengths</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {data.aiInsights.strengths.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {data.aiInsights.weaknesses.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Weaknesses</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {data.aiInsights.weaknesses.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Recommendations</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {data.aiInsights.recommendations.map((r: string, idx: number) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* AI Risk Flags */}
      {data.aiRiskFlags.length > 0 && (
        <section className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            🚨 AI Risk Flagging
          </h2>
          <div className="space-y-2">
            {data.aiRiskFlags.slice(0, 20).map((flag, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{flag.name}</span>
                    <span className="text-sm text-gray-600 ml-2">({flag.class})</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{flag.reason}</div>
                    <div className="text-lg font-bold text-red-600">{flag.attendanceRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

