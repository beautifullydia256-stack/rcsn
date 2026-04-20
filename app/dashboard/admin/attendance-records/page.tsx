"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Users, UserCheck, UserX, Search, Download, GraduationCap, Filter } from "lucide-react";
import { studentAttendanceRowIsPresent } from "@/src/lib/studentAttendanceRow";
import { schoolCalendarTodayIso } from "@/src/lib/schoolCalendarDate";

export default function AttendanceRecordsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'students'|'teachers'>('students');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<'all'|'present'|'absent'>('all');

  // Cache for student and teacher names
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return router.push('/login');
      setSchoolId(u.school_id);
      
      // Load all students, teachers, and classes
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from('students').select('student_id, name, current_class').eq('school_id', u.school_id),
        supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id),
        supabase.from('classes').select('class_name').eq('school_id', u.school_id).order('class_name')
      ]);
      
      // Create lookup maps
      const studentMap: Record<string, string> = {};
      (studentsRes.data || []).forEach((s: any) => {
        studentMap[s.student_id] = s.name;
      });
      setStudentNames(studentMap);
      
      const teacherMap: Record<string, string> = {};
      (teachersRes.data || []).forEach((t: any) => {
        teacherMap[t.teacher_id] = t.name;
      });
      setTeacherNames(teacherMap);

      // Get unique classes
      const classes = (classesRes.data || []).map((c: any) => c.class_name);
      setAvailableClasses(classes);
      
      // default: load today
      const today = schoolCalendarTodayIso();
      setFrom(today); 
      setTo(today);
      
      const { data } = await supabase
        .from('student_attendance')
        .select('student_id,class_name,date,attendance_date,present,status')
        .eq('school_id', u.school_id)
        .eq('attendance_date', today)
        .order('class_name')
        .order('attendance_date', { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, [router]);

  const reload = async () => {
    if (!schoolId || !from || !to) return;
    setLoading(true);
    
    if (role === 'students') {
      let query = supabase
        .from('student_attendance')
        .select('student_id,class_name,date,attendance_date,present,status')
        .eq('school_id', schoolId)
        .gte('attendance_date', from)
        .lte('attendance_date', to);
      
      // Apply class filter at database level for better performance
      if (selectedClass) {
        query = query.eq('class_name', selectedClass);
      }
      
      const { data } = await query
        .order('class_name')
        .order('attendance_date', { ascending: false });
      setRows(data || []);
    } else {
      const { data } = await supabase
        .from('attendance')
        .select('teacher_id,type,timestamp')
        .eq('school_id', schoolId)
        .gte('timestamp', `${from} 00:00:00`)
        .lte('timestamp', `${to} 23:59:59`)
        .order('timestamp', { ascending: false });
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (schoolId) reload(); 
  }, [role, from, to, schoolId, selectedClass]);

  // Filter rows based on search and status
  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      // Status filter
      if (role === 'students' && statusFilter !== 'all') {
        if (statusFilter === "present" && !studentAttendanceRowIsPresent(r)) return false;
        if (statusFilter === "absent" && studentAttendanceRowIsPresent(r)) return false;
      }
      
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      
      if (role === 'students') {
        const name = studentNames[r.student_id] || '';
        return name.toLowerCase().includes(query) || 
               r.class_name?.toLowerCase().includes(query);
      } else {
        const name = teacherNames[r.teacher_id] || '';
        return name.toLowerCase().includes(query);
      }
    });
  }, [rows, searchQuery, statusFilter, role, studentNames, teacherNames]);

  // Calculate stats
  const stats = {
    total: filteredRows.length,
    present: filteredRows.filter((r: any) => studentAttendanceRowIsPresent(r)).length,
    absent: filteredRows.filter((r: any) => !studentAttendanceRowIsPresent(r)).length,
  };

  // Get student/teacher name from ID
  const getStudentName = (id: string) => studentNames[id] || 'Unknown Student';
  const getTeacherName = (id: string) => teacherNames[id] || 'Unknown Teacher';

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Records</h1>
          <p className="text-white/70 text-sm mt-1">View and track attendance history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-blue-400/20 bg-blue-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Records</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-green-400/20 bg-green-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Present</p>
              <p className="text-xl font-bold text-white">{stats.present}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-red-400/20 bg-red-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Absent</p>
              <p className="text-xl font-bold text-white">{stats.absent}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Row 1: Type, Class, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <select 
              value={role} 
              onChange={(e)=>setRole(e.target.value as any)} 
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="students" className="bg-slate-800">👨‍🎓 Students</option>
              <option value="teachers" className="bg-slate-800">👨‍🏫 Teachers</option>
            </select>
          </div>
          
          {role === 'students' && (
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select 
                value={selectedClass} 
                onChange={(e)=>setSelectedClass(e.target.value)} 
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-800">All Classes</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls} className="bg-slate-800">{cls}</option>
                ))}
              </select>
            </div>
          )}
          
          {role === 'students' && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select 
                value={statusFilter} 
                onChange={(e)=>setStatusFilter(e.target.value as any)} 
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800">All Status</option>
                <option value="present" className="bg-slate-800">✅ Present Only</option>
                <option value="absent" className="bg-slate-800">❌ Absent Only</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Row 2: Date Range and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="date" 
              value={from} 
              onChange={(e)=>setFrom(e.target.value)} 
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none" 
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="date" 
              value={to} 
              onChange={(e)=>setTo(e.target.value)} 
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none" 
            />
          </div>
        
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden"
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/60">Loading records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-left">
                  {role==='students' ? (
                    <>
                      <th className="px-4 py-3 text-white/80 font-medium">Student Name</th>
                      <th className="px-4 py-3 text-white/80 font-medium">Class</th>
                      <th className="px-4 py-3 text-white/80 font-medium">Date</th>
                      <th className="px-4 py-3 text-white/80 font-medium">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-white/80 font-medium">Teacher Name</th>
                      <th className="px-4 py-3 text-white/80 font-medium">Type</th>
                      <th className="px-4 py-3 text-white/80 font-medium">Time</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No attendance records found</p>
                      <p className="text-sm mt-1">Try adjusting your date range or filters</p>
                    </td>
                  </tr>
                ) : role==='students' ? filteredRows.map((r:any, idx:number)=> (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {getStudentName(r.student_id).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{getStudentName(r.student_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/80">{r.class_name}</td>
                    <td className="px-4 py-3 text-white/80">
                      {new Date((r.attendance_date || r.date) + "T12:00:00").toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {studentAttendanceRowIsPresent(r) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-400/30">
                          <UserCheck className="w-3 h-3" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-400/30">
                          <UserX className="w-3 h-3" /> Absent
                        </span>
                      )}
                    </td>
                  </tr>
                )) : filteredRows.map((r:any, idx:number)=> (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                          {getTeacherName(r.teacher_id).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{getTeacherName(r.teacher_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                        r.type === 'check_in' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-orange-500/20 text-orange-300'
                      }`}>
                        {r.type === 'check_in' ? 'Check In' : 'Check Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/80">{new Date(r.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      {filteredRows.length > 0 && (
        <p className="text-center text-white/40 text-sm mt-4">
          Showing {filteredRows.length} records
        </p>
      )}
    </>
  );
}



