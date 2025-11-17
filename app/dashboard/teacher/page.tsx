'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Student } from '@/src/lib/supabase';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import QuickActions from './components/QuickActions';
import TodayOverview from './components/TodayOverview';
import AttendanceCard from './components/AttendanceCard';
import StatsCards from './components/StatsCards';
import AIInsights from './components/AIInsights';
import TimetableWidget from './components/TimetableWidget';
import ClassCards from './components/ClassCards';
import AssignmentsCard from './components/AssignmentsCard';
import MessagesCard from './components/MessagesCard';
import NotificationsCard from './components/NotificationsCard';
import SubjectsCard from './components/SubjectsCard';
import GlassBackground from './components/GlassBackground';
import GlassCard from '@/components/ui/GlassCard';
import { User } from 'lucide-react';

interface Assignment {
  class_name: string;
  subject: string;
}

interface TodayClass {
  time: string;
  subject: string;
  class_name: string;
  room?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherRowId, setTeacherRowId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Teacher');
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentsAttendedToday, setStudentsAttendedToday] = useState<number>(0);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    strugglingStudents: Array<{ name: string; status: string; subject: string; recommendation: string }>;
    improvingStudents: Array<{ name: string; status: string; subject: string; recommendation: string }>;
    performanceData: Array<{ name: string; average: number; attendance: number }>;
    attendanceData: Array<{ week: string; attendance: number }>;
  } | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (schoolId && students.length > 0 && assignments.length > 0) {
      fetchAIInsights();
    }
  }, [schoolId, students.length, assignments.length]);

  const fetchStudentAttendanceToday = async () => {
    try {
      if (!schoolId || assignments.length === 0) return;

      const classesList = Array.from(new Set(assignments.map(a => a.class_name)));
      if (classesList.length === 0) return;

      const today = new Date().toISOString().slice(0, 10);
      
      const { data: attendanceData, error } = await supabase
        .from('student_attendance')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('date', today)
        .eq('present', true)
        .in('class_name', classesList);

      if (error) {
        console.error('Error fetching student attendance:', error);
        return;
      }

      const uniqueStudents = new Set(attendanceData?.map(a => a.student_id) || []);
      setStudentsAttendedToday(uniqueStudents.size);
    } catch (error) {
      console.error('Error fetching student attendance:', error);
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const returnUrl = encodeURIComponent('/dashboard/teacher');
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      // Get school_id from user metadata
      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      const teacherName = userMetadata.name || userMetadata.teacher_name || 'Teacher';

      if (!schoolId) {
        const returnUrl = encodeURIComponent('/dashboard/teacher');
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      setSchoolId(schoolId);
      setTeacherId(user.id);
      setTeacherName(teacherName);

      // Resolve teacher row id
		let teacherRow = null as any;
      const metaTeacherId = userMetadata.teacher_id;
      if (metaTeacherId) {
        const { data: trow } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .eq('teacher_id', metaTeacherId)
          .maybeSingle();
        if (trow) teacherRow = trow;
      }
      if (!teacherRow && user.email) {
        const { data: trow2 } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .eq('email', user.email)
          .maybeSingle();
        if (trow2) teacherRow = trow2;
      }
		if (!teacherRow && (teacherName || '').trim()) {
			const { data: trow3 } = await supabase
				.from('teachers')
				.select('teacher_id')
				.eq('school_id', schoolId)
				.ilike('name', teacherName.trim())
				.maybeSingle();
			if (trow3) teacherRow = trow3;
		}
      setTeacherRowId(teacherRow?.teacher_id || null);

      // Check if class teacher
      try {
        if (schoolId && (teacherRow?.teacher_id || user.id)) {
          const teacherIdToCheck = teacherRow?.teacher_id || user.id;
          const { data: ct } = await supabase
            .from('class_teachers')
            .select('id')
        .eq('school_id', schoolId)
            .eq('teacher_id', teacherIdToCheck)
            .limit(1);
          setIsClassTeacher(!!(ct && ct.length > 0));
        }
      } catch {}

      // Load teacher assignments
      let tcs: any[] = [];
      try {
        let apiRes = await fetch('/api/teacher/resolve-assignments', { 
          credentials: 'include', 
          cache: 'no-store' as any, 
          headers: { 'Cache-Control': 'no-store' } 
        });
        if (!apiRes.ok) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          if (origin) {
            apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { 
              credentials: 'include', 
              cache: 'no-store' as any, 
              headers: { 'Cache-Control': 'no-store' } 
            });
          }
        }
        if (apiRes.ok) {
          const payload = await apiRes.json();
          if (Array.isArray(payload?.assignments)) {
            tcs = payload.assignments;
          }
        }
      } catch {}

      const candidateTeacherIds: string[] = [];
      if (teacherRow?.teacher_id) candidateTeacherIds.push(teacherRow.teacher_id);
      candidateTeacherIds.push(user.id);

      if (!tcs || tcs.length === 0) {
        for (const candidate of candidateTeacherIds) {
          const { data: tcsTry, error: tryErr } = await supabase
            .from('teacher_class_subjects')
            .select('class_name, subject')
            .eq('teacher_id', candidate)
            .eq('school_id', schoolId);
          if (!tryErr && tcsTry && tcsTry.length > 0) {
            tcs = tcsTry;
            break;
          }
        }
      }

      type TCS = { class_name: string; subject: string };
      const tcsData: TCS[] = Array.isArray(tcs) ? (tcs as unknown as TCS[]) : [];
      const classes = Array.from(new Set(tcsData.map((r): string => (r as TCS).class_name)));

      // Load students
      if (classes.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', schoolId)
          .in('current_class', classes);
        
        if (!studentsError && studentsData) {
          setStudents(studentsData || []);
        }
      }

      setAssignments(tcsData.map((r): Assignment => ({ 
        class_name: (r as TCS).class_name, 
        subject: (r as TCS).subject 
      })));

      // Fetch student attendance count
      setTimeout(() => fetchStudentAttendanceToday(), 100);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    if (!schoolId || students.length === 0 || assignments.length === 0) return;
    
    // Calculate classes assigned from assignments
    const classesAssignedList = Array.from(new Set(assignments.map(a => a.class_name)));
    if (classesAssignedList.length === 0) return;
    
    setAiInsightsLoading(true);
    try {
      // Fetch exam results for students in assigned classes
      const { data: examResults, error: examError } = await supabase
        .from('exam_results')
        .select('student_id, subject, marks_obtained, total_marks, class_name, created_at')
        .eq('school_id', schoolId)
        .in('class_name', classesAssignedList)
        .in('student_id', students.map(s => s.student_id))
        .order('created_at', { ascending: false })
        .limit(500); // Limit to recent results

      if (examError) {
        console.error('Error fetching exam results:', examError);
      }

      // Fetch attendance data for the last 5 weeks
      const today = new Date();
      const attendancePromises = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        const weekStart = date.toISOString().slice(0, 10);
        
        attendancePromises.push(
          supabase
            .from('student_attendance')
            .select('student_id, present')
            .eq('school_id', schoolId)
            .eq('date', weekStart)
            .in('class_name', classesAssignedList)
            .in('student_id', students.map(s => s.student_id))
        );
      }

      const attendanceResults = await Promise.all(attendancePromises);
      
      // Process exam results to calculate student performance
      const studentPerformanceMap: Record<string, {
        name: string;
        results: Array<{ subject: string; percentage: number; date: string }>;
        averageScore: number;
      }> = {};

      students.forEach(student => {
        studentPerformanceMap[student.student_id] = {
          name: student.name,
          results: [],
          averageScore: 0,
        };
      });

      if (examResults) {
        examResults.forEach(result => {
          const percentage = (result.marks_obtained / result.total_marks) * 100;
          if (studentPerformanceMap[result.student_id]) {
            studentPerformanceMap[result.student_id].results.push({
              subject: result.subject,
              percentage,
              date: result.created_at,
            });
          }
        });

        // Calculate average scores
        Object.keys(studentPerformanceMap).forEach(studentId => {
          const perf = studentPerformanceMap[studentId];
          if (perf.results.length > 0) {
            perf.averageScore = perf.results.reduce((sum, r) => sum + r.percentage, 0) / perf.results.length;
          }
        });
      }

      // Process attendance data
      const weeklyAttendance: Array<{ week: string; attendance: number }> = [];
      attendanceResults.forEach((result, index) => {
        if (result.data && result.data.length > 0) {
          const presentCount = result.data.filter(a => a.present).length;
          const totalCount = result.data.length;
          const attendancePercentage = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
          weeklyAttendance.push({
            week: `Week ${5 - index}`,
            attendance: Math.round(attendancePercentage),
          });
        }
      });

      // Prepare student data for AI
      const studentDataForAI = Object.values(studentPerformanceMap).map(perf => ({
        name: perf.name,
        averageScore: perf.averageScore,
        results: perf.results,
        recentResults: perf.results.slice(0, 5), // Last 5 results
      }));

      // Call AI Insights API
      try {
        const response = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            students: studentDataForAI,
            class_name: classesAssignedList.join(', '),
            performance_data: {
              average: Object.values(studentPerformanceMap).reduce((sum, p) => sum + p.averageScore, 0) / Object.keys(studentPerformanceMap).length || 0,
              totalStudents: students.length,
            },
            attendance_data: weeklyAttendance,
          }),
        });

        const aiData = await response.json();

        if (aiData.success && aiData.insights) {
          // Process performance data for charts
          const performanceData = weeklyAttendance.map((week, index) => ({
            name: week.week,
            average: Object.values(studentPerformanceMap).reduce((sum, p) => sum + p.averageScore, 0) / Object.keys(studentPerformanceMap).length || 0,
            attendance: week.attendance,
          }));

          setAiInsights({
            strugglingStudents: aiData.insights.strugglingStudents || [],
            improvingStudents: aiData.insights.improvingStudents || [],
            performanceData,
            attendanceData: weeklyAttendance,
        });
      } else {
          console.error('AI Insights API error:', aiData.error);
          // Fallback to empty insights if AI fails
          setAiInsights({
            strugglingStudents: [],
            improvingStudents: [],
            performanceData: [],
            attendanceData: weeklyAttendance,
          });
        }
      } catch (aiError) {
        console.error('Error calling AI Insights API:', aiError);
        // Fallback to empty insights if AI fails
        setAiInsights({
          strugglingStudents: [],
          improvingStudents: [],
          performanceData: [],
          attendanceData: weeklyAttendance,
        });
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setAiInsights(null);
    } finally {
      setAiInsightsLoading(false);
    }
  };

  const classesAssigned = useMemo(() => 
    Array.from(new Set(assignments.map(a => a.class_name))), 
    [assignments]
  );
  
  const subjectsAssigned = useMemo(() => 
    Array.from(new Set(assignments.map(a => a.subject))), 
    [assignments]
  );

  const totalClassesAssigned = classesAssigned.length;
  const totalStudentsInClasses = students.length;

  // Prepare today's classes data
  const todayClasses: TodayClass[] = useMemo(() => {
    // Mock timetable data - in production, fetch from database
    return classesAssigned.map((className, index) => ({
      time: ['08:00', '10:00', '14:00'][index % 3] || '08:00',
      subject: assignments.find(a => a.class_name === className)?.subject || 'Subject',
      class_name: className,
      room: `Room ${101 + index}`
    }));
  }, [classesAssigned, assignments]);

  // Prepare class assignments data for ClassCards
  const classAssignmentsData = useMemo(() => {
    const classMap: Record<string, { subjects: string[]; student_count: number }> = {};
    
    assignments.forEach(assignment => {
      if (!classMap[assignment.class_name]) {
        classMap[assignment.class_name] = {
          subjects: [],
          student_count: students.filter(s => s.current_class === assignment.class_name).length
        };
      }
      if (!classMap[assignment.class_name].subjects.includes(assignment.subject)) {
        classMap[assignment.class_name].subjects.push(assignment.subject);
      }
    });

    return Object.entries(classMap).map(([class_name, data]) => ({
      class_name,
      subjects: data.subjects,
      student_count: data.student_count
    }));
  }, [assignments, students]);

  // Prepare subjects data for SubjectsCard
  const subjectsData = useMemo(() => {
    const subjectMap: Record<string, string[]> = {};
    
    assignments.forEach(assignment => {
      if (!subjectMap[assignment.subject]) {
        subjectMap[assignment.subject] = [];
      }
      if (!subjectMap[assignment.subject].includes(assignment.class_name)) {
        subjectMap[assignment.subject].push(assignment.class_name);
      }
    });

    return Object.entries(subjectMap).map(([subject, classes]) => ({
      subject,
      classes
    }));
  }, [assignments]);

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
      {/* Glassmorphism Background */}
      <GlassBackground />

      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onCollapse={setIsSidebarCollapsed} 
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 relative z-10 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
      }`}>
        {/* Navbar */}
        <Navbar 
          onSearch={(query) => {
            setSearchQuery(query);
            setShowSearchResults(query.trim().length > 0);
          }}
          searchQuery={searchQuery}
          showSearchResults={showSearchResults}
          onCloseSearch={() => setShowSearchResults(false)}
          searchData={{
            students: students,
            assignments: assignments
          }}
        />

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8 relative z-10">
          {/* Welcome Header */}
          <div className="mb-8">
            <GlassCard 
              className="p-8 relative overflow-hidden" 
              hover
              style={{
                background: 'linear-gradient(135deg, rgba(77, 171, 255, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)',
              }}
            >
              {/* Decorative gradient blob */}
              <div 
                className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20 blur-3xl"
                style={{ background: '#4dabff' }}
              />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                    <User className="w-8 h-8" />
                  </div>
              <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                    Welcome, {teacherName}
                    {isClassTeacher && (
                        <span 
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                          style={{
                            background: 'rgba(174, 121, 255, 0.25)',
                            border: '1px solid rgba(174, 121, 255, 0.4)',
                            color: '#c4b5fd'
                          }}
                        >
                        ⭐ Class Teacher
                      </span>
                    )}
                  </h1>
                    <div className="flex items-center gap-4 text-white/85 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: '#4dabff' }}></span>
                        {subjectsAssigned.length} Subjects
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }}></span>
                        {totalClassesAssigned} Classes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: '#ae79ff' }}></span>
                        {totalStudentsInClasses} Students
                      </span>
              </div>
              </div>
          </div>
              </div>
            </GlassCard>
        </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Stats Cards */}
          <StatsCards
            totalClasses={totalClassesAssigned}
            totalStudents={totalStudentsInClasses}
            studentsAttendedToday={studentsAttendedToday}
            subjectsAssigned={subjectsAssigned.length}
            assignmentsDue={0}
            examsPending={0}
          />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Today Overview & Attendance */}
            <div className="lg:col-span-2 space-y-6">
              <TodayOverview
                classes={todayClasses}
                tasks={3}
                messages={5}
                events={2}
                nextClass={todayClasses[0]}
              />
              
              {schoolId && teacherId && (
                <AttendanceCard
                  schoolId={schoolId}
                  teacherId={teacherId}
                />
              )}
                </div>

            {/* Right Column - Timetable Widget */}
                        <div>
              <TimetableWidget
                todaySchedule={todayClasses}
                nextClass={todayClasses[0]}
              />
            </div>
                        </div>
                        
          {/* AI Insights */}
          <AIInsights 
            strugglingStudents={aiInsights?.strugglingStudents}
            improvingStudents={aiInsights?.improvingStudents}
            performanceData={aiInsights?.performanceData}
            attendanceData={aiInsights?.attendanceData}
            loading={aiInsightsLoading}
          />

          {/* Class Cards */}
          <ClassCards assignments={classAssignmentsData} />

          {/* Two Column Layout - Subjects, Assignments, Messages, Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SubjectsCard subjects={subjectsData} />
            <AssignmentsCard />
                        </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MessagesCard />
            <NotificationsCard />
                        </div>

          {/* Footer */}
          <footer className="mt-12 py-6 text-center text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
            <p>© 2025 PwezaCore School Management System. Powered by AI.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
