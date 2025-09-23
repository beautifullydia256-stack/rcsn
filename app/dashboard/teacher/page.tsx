'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, Student } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Attendance {
  attendance_id: string;
  type: 'punch_in' | 'punch_out';
  timestamp: string;
  ip_address: string;
}

interface Grade {
  grade_id: string;
  student_id: string;
  subject: string;
  grade: number;
  term: string;
  created_at: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [assignments, setAssignments] = useState<{ class_name: string; subject: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeForm, setGradeForm] = useState({ student_id: '', subject: '', grade: '', term: 'Term 1' });
  const [lastPunch, setLastPunch] = useState<'punch_in' | 'punch_out' | null>(null);
  const [teacherName, setTeacherName] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [teacherRowId, setTeacherRowId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    checkLastPunch();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's school_id
      const { data: userData } = await supabase
        .from('users')
        .select('school_id,name')
        .eq('user_id', user.id)
        .single();

      if (!userData?.school_id) {
        router.push('/login');
        return;
      }
      setSchoolId(userData.school_id);
      setTeacherName(userData.name || 'Teacher');

      // Resolve teacher row id: prefer auth metadata; fallback to email match
      let teacherRow = null as any;
      const metaTeacherId = (user as any)?.user_metadata?.teacher_id || (user as any)?.raw_user_meta_data?.teacher_id;
      if (metaTeacherId) {
        const { data: trow } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', userData.school_id)
          .eq('teacher_id', metaTeacherId)
          .maybeSingle();
        if (trow) teacherRow = trow;
      }
      if (!teacherRow && user.email) {
        const { data: trow2 } = await supabase
          .from('teachers')
          .select('teacher_id')
          .eq('school_id', userData.school_id)
          .eq('email', user.email)
          .maybeSingle();
        if (trow2) teacherRow = trow2;
      }
      setTeacherRowId(teacherRow?.teacher_id || null);
      console.log('Teacher resolution:', {
        metaTeacherId,
        teacherRow,
        userEmail: user.email,
        resolvedTeacherId: teacherRow?.teacher_id
      });

      // Load current term window
      const { data: termRows } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', userData.school_id)
        .lte('start_date', new Date().toISOString().slice(0,10))
        .gte('end_date', new Date().toISOString().slice(0,10))
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      const currentTermWindow = termRows && termRows.length > 0 ? termRows[0] : null;

      // Load teacher assignments (classes & subjects) - try both teacher_id and user_id
      let tcs: any[] = [];
      
      // First try with teacher_id from teachers table
      if (teacherRow?.teacher_id) {
        const { data: tcs1, error: error1 } = await supabase
          .from('teacher_class_subjects')
          .select('class_name, subject')
          .eq('teacher_id', teacherRow.teacher_id)
          .eq('school_id', userData.school_id);
        
        if (!error1 && tcs1) {
          tcs = tcs1;
          console.log('Found assignments using teacher_id:', tcs);
        } else {
          console.log('No assignments found with teacher_id, trying user_id...');
          // Fallback: try with user.id (user_id)
          const { data: tcs2, error: error2 } = await supabase
            .from('teacher_class_subjects')
            .select('class_name, subject')
            .eq('teacher_id', user.id)  // Try using user.id as teacher_id
            .eq('school_id', userData.school_id);
          
          if (!error2 && tcs2) {
            tcs = tcs2;
            console.log('Found assignments using user_id:', tcs);
          } else {
            console.log('No assignments found with user_id either:', error2);
          }
        }
      }

      type TCS = { class_name: string; subject: string };
      const tcsData: TCS[] = Array.isArray(tcs) ? (tcs as unknown as TCS[]) : [];
      const classes = Array.from(new Set(tcsData.map((r): string => (r as TCS).class_name)));

      const [studentsResult, attendanceResult, gradesResult] = await Promise.all([
        classes.length > 0
          ? supabase.from('students').select('*').eq('school_id', userData.school_id).in('current_class', classes)
          : Promise.resolve({ data: [] as any[], error: null } as any),
        supabase.from('attendance').select('*').eq('teacher_id', user.id).order('timestamp', { ascending: false }),
        currentTermWindow
          ? supabase.from('grades').select('*')
              .eq('teacher_id', user.id)
              .gte('created_at', `${currentTermWindow.start_date} 00:00:00`)
              .lte('created_at', `${currentTermWindow.end_date} 23:59:59`)
              .order('created_at', { ascending: false })
          : supabase.from('grades').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (gradesResult.error) throw gradesResult.error;

      setAssignments(tcsData.map((r): { class_name: string; subject: string } => ({ class_name: (r as TCS).class_name, subject: (r as TCS).subject })));
      setStudents(studentsResult.data || []);
      setAttendance(attendanceResult.data || []);
      setGrades(gradesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastPunch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('attendance')
        .select('type')
        .eq('teacher_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastPunch(data.type);
      }
    } catch (error) {
      console.error('Error checking last punch:', error);
    }
  };

  const handlePunch = async (type: 'punch_in' | 'punch_out') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.school_id) return;

      // Get current location/IP (simplified)
      const ipAddress = 'School WiFi';

      const { error } = await supabase.from('attendance').insert({
        teacher_id: user.id,
        school_id: userData.school_id,
        type,
        ip_address: ipAddress
      });

      if (error) throw error;

      setLastPunch(type);
      fetchData();
    } catch (error) {
      console.error('Error punching in/out:', error);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('grades').insert({
        student_id: gradeForm.student_id,
        teacher_id: user.id,
        subject: gradeForm.subject,
        grade: parseFloat(gradeForm.grade),
        term: gradeForm.term
      });

      if (error) throw error;

      setGradeForm({ student_id: '', subject: '', grade: '', term: 'Term 1' });
      setShowGradeForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding grade:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const classesAssigned = useMemo(() => Array.from(new Set(assignments.map(a => a.class_name))), [assignments]);
  const subjectsAssigned = useMemo(() => Array.from(new Set(assignments.map(a => a.subject))), [assignments]);
  const totalClassesAssigned = classesAssigned.length;
  const totalStudentsInClasses = students.length;
  const attendanceToday = useMemo(() => {
    const today = new Date();
    const ymd = today.toISOString().slice(0,10);
    return attendance.filter(a => (a.timestamp || '').slice(0,10) === ymd).length;
  }, [attendance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl">👨‍🏫</div>
            <div>
              <div className="text-white text-xl font-semibold">Welcome, {teacherName}</div>
              <div className="text-white/70 text-sm">{subjectsAssigned.length} subjects • {classesAssigned.length} classes</div>
            </div>
          </div>
          <div className="flex-1 md:max-w-xl">
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search students, classes, subjects" className="w-full rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Logout</button>
          </div>
        </div>

      {/* Punch In/Out Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-8 text-white">
          <h2 className="text-xl font-semibold mb-4">Attendance</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePunch('punch_in')}
              disabled={lastPunch === 'punch_in'}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                lastPunch === 'punch_in'
                  ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Punch In
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePunch('punch_out')}
              disabled={lastPunch === 'punch_out'}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                lastPunch === 'punch_out'
                  ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Punch Out
              </div>
            </motion.button>
          </div>
          
          {lastPunch && (
            <p className="text-sm text-white/80 mt-4 text-center">
              Last action: {lastPunch === 'punch_in' ? 'Punched In' : 'Punched Out'}
            </p>
          )}
        </motion.div>

        {/* KPIs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 text-white">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-white/80">Total Classes Assigned</p>
                <p className="text-2xl font-semibold">{totalClassesAssigned}</p>
              </div>
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 text-white">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 11a4 4 0 10-6 0"/></svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-white/80">Students in Your Classes</p>
                <p className="text-2xl font-semibold">{totalStudentsInClasses}</p>
              </div>
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 text-white">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div className="ml-4">
                <button onClick={()=>router.push('/dashboard/teacher/attendance')} className="text-left">
                  <p className="text-sm text-white/80 underline underline-offset-4">Attendance</p>
                  <p className="text-2xl font-semibold">{attendanceToday}</p>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 text-white">
            <div className="text-white font-medium mb-3">Today's Classes</div>
            {classesAssigned.length === 0 ? (
              <div className="text-white/80 text-sm">No classes assigned.</div>
            ) : (
              <ul className="space-y-2">
                {classesAssigned.map(c => (
                  <li key={c} className="flex items-center justify-between">
                    <span className="text-white/90">{c}</span>
                    <span className="text-white/60 text-xs">{assignments.filter(a=>a.class_name===c).map(a=>a.subject).join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 text-white">
            <div className="text-white font-medium mb-3">Assigned Subjects</div>
            {classesAssigned.length === 0 ? (
              <div className="text-white/80 text-sm">No classes assigned.</div>
            ) : (
              <ul className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {classesAssigned.map(c => {
                  const subs = assignments.filter(a => a.class_name === c).map(a => a.subject);
                  if (subs.length === 0) return null;
                  return (
                    <li key={c} className="">
                      <div className="text-white/90 font-medium mb-1">{c}</div>
                      <div className="flex flex-wrap gap-2">
                        {subs.map(s => (
                          <span key={`${c}-${s}`} className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs">{s}</span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 text-white">
            <div className="text-white font-medium mb-3">Exam Results</div>
            <div className="text-white/80 text-sm mb-3">Input exam results for your classes</div>
            <button 
              onClick={() => router.push('/dashboard/teacher/exam-results')}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Insert Exam Results
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 text-white">
            <div className="text-white font-medium mb-3">Messages</div>
            <div className="text-white/80 text-sm">No messages yet.</div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md text-white">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'attendance', name: 'Attendance History' },
                { id: 'grades', name: 'Grades' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'attendance' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium mb-4">Attendance History</h3>
                {attendance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/70">No attendance records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Location
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/0 divide-y divide-white/10">
                        {attendance.map((record) => (
                          <tr key={record.attendance_id} className="hover:bg-white/5">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.type === 'punch_in' 
                                  ? 'bg-green-500/20 text-green-200' 
                                  : 'bg-red-500/20 text-red-200'
                              }`}>
                                {record.type === 'punch_in' ? 'Punch In' : 'Punch Out'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                              {new Date(record.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                              {record.ip_address}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'grades' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Student Grades</h3>
                  <button onClick={() => setShowGradeForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Add Grade
                  </button>
                </div>

                {/* Add Grade Form Modal */}
                {showGradeForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  >
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl border border-white/10 bg-white p-6 w-full max-w-md mx-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Add Grade</h3>
                      <form onSubmit={handleGradeSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Student
                          </label>
                          <select
                            value={gradeForm.student_id}
                            onChange={(e) => setGradeForm({ ...gradeForm, student_id: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select Student</option>
                            {students.map((student) => (
                              <option key={student.student_id} value={student.student_id}>
                                {student.name} - {student.current_class}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={gradeForm.subject}
                            onChange={(e) => setGradeForm({ ...gradeForm, subject: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Grade
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={gradeForm.grade}
                            onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Term
                          </label>
                          <select
                            value={gradeForm.term}
                            onChange={(e) => setGradeForm({ ...gradeForm, term: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                          </select>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Add Grade
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowGradeForm(false)}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}

                {grades.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/70">No grades entered yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Grade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Term
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/0 divide-y divide-white/10">
                        {grades.map((grade) => {
                          const student = students.find(s => s.student_id === grade.student_id);
                          return (
                            <tr key={grade.grade_id} className="hover:bg-white/5">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                {student ? student.name : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {grade.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {grade.grade}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {grade.term}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {new Date(grade.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

