'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/src/lib/studentAttendanceRow';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { validateStudentProfile, forceLogout } from '@/src/lib/studentProfileValidator';
import { 
  Calendar, 
  BookOpen, 
  DollarSign, 
  Bell, 
  TrendingUp, 
  Download, 
  Clock, 
  User,
  GraduationCap,
  FileText,
  MessageSquare,
  Library,
  Search
} from 'lucide-react';

interface Student {
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  admission_number: string;
  current_class: string;
  status: string;
  student_email?: string;
  student_phone?: string;
  date_of_birth?: string;
  gender?: string;
  profile_picture?: string;
}

interface Grade {
  grade_id: string;
  subject: string;
  grade: number;
  term: string;
  created_at: string;
  exam_type?: string;
}

interface Report {
  report_id: string;
  template_name: string;
  file_url: string;
  created_at: string;
}

interface Payment {
  payment_id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  status: string;
  receipt_url?: string;
}

interface Attendance {
  attendance_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  subject?: string;
}

interface Class {
  class_id: string;
  subject: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  room?: string;
}

interface LibraryBook {
  book_id: string;
  title: string;
  author: string;
  due_date: string;
  status: 'borrowed' | 'returned';
}

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expectedFee, setExpectedFee] = useState<number>(0);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileValidationError, setProfileValidationError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  // Add a refresh mechanism to ensure latest fee data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh fee data when user returns to the tab
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchData = async () => {
    try {
      // Refresh session to ensure latest user_metadata after recent account changes
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const returnUrl = encodeURIComponent('/dashboard/student');
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      // Validate student profile first
      const validationResult = await validateStudentProfile(user.id, ((user as any).user_metadata || (user as any).raw_user_meta_data || {}));
      
      if (!validationResult.isValid && validationResult.shouldLogout) {
        // If metadata is incomplete but user is student, continue without forcing logout
        const reason = validationResult.reason || '';
        const isMetadataMissing = reason.toLowerCase().includes('incomplete student metadata') || reason.toLowerCase().includes('no student id') || reason.toLowerCase().includes('admission number');
        if (!isMetadataMissing) {
          console.error('Student profile validation failed:', validationResult.reason);
          setProfileValidationError(validationResult.reason || 'Profile validation failed');
          setTimeout(async () => {
            await forceLogout(user.id);
            router.push('/login');
          }, 3000);
          return;
        }
      }

      // Get student details from user metadata (this should now contain the student data)
      // Supabase v2 exposes user.user_metadata; raw_user_meta_data may be undefined on client
      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const studentId = userMetadata?.student_id;
      const admissionNumber = userMetadata?.admission_number;

      // Fallback: try users table linkage for student_id
      let effectiveStudentId = studentId;
      if (!effectiveStudentId) {
        const { data: userRow } = await supabase
          .from('users')
          .select('student_id')
          .eq('user_id', user.id)
          .single();
        if (userRow?.student_id) effectiveStudentId = userRow.student_id as string;
      }
      
      console.log('=== STUDENT DASHBOARD DEBUG ===');
      console.log('User object:', user);
      console.log('User metadata:', userMetadata);
      console.log('Student ID from metadata:', studentId);
      console.log('Admission number from metadata:', admissionNumber);
      console.log('User email:', user.email);
      
      // Create student object from metadata (we now ensure complete metadata is always created)
      if (userMetadata?.role === 'student') {
        console.log('Found student login with metadata:', userMetadata);
        
        // Create student object from metadata
        const studentFromMetadata = {
          student_id: userMetadata.student_id || studentId || 'temp',
          first_name: userMetadata.student_name?.split(' ')[0] || 'Student',
          middle_name: userMetadata.student_name?.split(' ').slice(1, -1).join(' ') || '',
          last_name: userMetadata.student_name?.split(' ').slice(-1)[0] || 'User',
          admission_number: userMetadata.admission_number || admissionNumber || 'N/A',
          current_class: userMetadata.current_class || 'N/A',
          status: userMetadata.status || 'active',
          student_email: user.email || '',
          student_phone: '',
          date_of_birth: '',
          gender: '',
          profile_picture: ''
        };
        
        setStudent(studentFromMetadata);
        console.log('Student data set from metadata:', studentFromMetadata);
        
        // Always try to load fee data directly since fetchRelatedData might not be called
        console.log('Loading fee data for student_id:', studentFromMetadata.student_id);
        try {
          const { data: feeData, error: feeError } = await supabase
            .from('students')
            .select('expected_fee_amount')
            .eq('student_id', studentFromMetadata.student_id)
            .single();
          
          if (feeError) {
            console.error('Error loading fee data:', feeError);
          } else if (feeData) {
            const feeAmount = Number(feeData.expected_fee_amount || 0);
            console.log('Loaded fee data directly:', feeAmount);
            setExpectedFee(feeAmount);
          } else {
            console.log('No fee data found for student');
          }
        } catch (error) {
          console.error('Failed to load fee data directly:', error);
        }
        
        // Also try fetchRelatedData if we have a valid student_id
        const sid = effectiveStudentId || studentFromMetadata.student_id;
        if (sid && sid !== 'temp') {
          await fetchRelatedData(sid, studentFromMetadata.admission_number);
        }
      } else {
        // Fallback: Try to get student from database (for existing logins)
        console.log('No student data in metadata, trying database lookup...');
        
        if (studentId) {
          // Try to get student by student_id first
          let { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', studentId);

          // If not found by student_id, try by admission_number
          if ((!studentData || studentData.length === 0) && admissionNumber) {
            console.log('Trying to find student by admission number:', admissionNumber);
            const { data: studentByAdmission, error: admissionError } = await supabase
              .from('students')
              .select('*')
              .eq('admission_number', admissionNumber);
            
            if (!admissionError && studentByAdmission && studentByAdmission.length > 0) {
              studentData = studentByAdmission;
              studentError = null;
              console.log('Found student by admission number:', studentByAdmission[0]);
            }
          }

          if (studentError) {
            console.error('Error fetching student data:', studentError);
          } else if (studentData && studentData.length > 0) {
            setStudent(studentData[0]);
            console.log('Student data set from database:', studentData[0]);
            
            // Fetch all related data
            await fetchRelatedData(studentId, studentData[0].admission_number);
          } else {
            console.log('No student data found by student_id or admission_number');
          }
        } else {
          console.log('No student ID in user metadata, trying alternative methods...');
          
          // Try to find student by email (if it's in the format admission_number@school.local)
          const email = user.email;
          if (email && email.includes('@school.local')) {
            const admissionFromEmail = email.split('@')[0];
            console.log('Trying to find student by email admission number:', admissionFromEmail);
            
            const { data: studentByEmail, error: emailError } = await supabase
              .from('students')
              .select('*')
              .eq('admission_number', admissionFromEmail);
            
            if (!emailError && studentByEmail && studentByEmail.length > 0) {
              setStudent(studentByEmail[0]);
              console.log('Found student by email admission number:', studentByEmail[0]);
              await fetchRelatedData(studentByEmail[0].student_id, studentByEmail[0].admission_number);
            } else {
              console.log('No student found by email admission number');
            }
          } else {
            console.log('Email format not recognized for student lookup');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedData = async (studentId: string, admissionNumber: string) => {
    try {
      // Get current term date range for scoping data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get school_id from user metadata instead of users table to avoid 406 errors
      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) return;

      const today = new Date().toISOString().slice(0,10);
      // Fetch all terms and filter in JavaScript to handle NULL dates
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('start_date, end_date')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      
      const currentTerm = (allTerms || []).find((t: any) => 
        t.start_date ? 
          (t.start_date <= today && t.end_date >= today) : 
          (t.end_date >= today)
      ) || null;

      // Fetch all related data in parallel, scoped to current term where applicable
      const [
        gradesResult,
        reportsResult,
        paymentsResult,
        attendanceResult,
        expectedResult
      ] = await Promise.all([
        currentTerm ? 
          supabase.from('grades').select('*').eq('student_id', studentId)
            .gte('created_at', currentTerm.start_date)
            .lte('created_at', currentTerm.end_date) :
        supabase.from('grades').select('*').eq('student_id', studentId),
        currentTerm ?
          supabase.from('reports').select('*').eq('student_id', studentId)
            .gte('created_at', currentTerm.start_date)
            .lte('created_at', currentTerm.end_date) :
        supabase.from('reports').select('*').eq('student_id', studentId),
        supabase.from('student_payments').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }),
        currentTerm ?
          supabase.from('student_attendance').select('*').eq('student_id', studentId)
            .gte('attendance_date', currentTerm.start_date)
            .lte('attendance_date', currentTerm.end_date)
            .order('attendance_date', { ascending: false }) :
          supabase.from('student_attendance').select('*').eq('student_id', studentId).order('attendance_date', { ascending: false }),
        supabase.from('students').select('expected_fee_amount').eq('student_id', studentId).single()
      ]);

      if (gradesResult.data) setGrades(gradesResult.data);
      if (reportsResult.data) setReports(reportsResult.data);
      if (paymentsResult.data) setPayments(paymentsResult.data);
      if (attendanceResult.data) setAttendance(attendanceResult.data);
      if (expectedResult.data) {
        const feeAmount = Number((expectedResult.data as any).expected_fee_amount || 0);
        console.log('Student Dashboard - Expected Fee Amount:', feeAmount);
        setExpectedFee(feeAmount);
      } else {
        console.log('Student Dashboard - No expected fee data found');
      }

      // Mock data for classes and library books (since these tables might not exist yet)
      setClasses([
        {
          class_id: '1',
          subject: 'Mathematics',
          teacher_name: 'Mr. Johnson',
          start_time: '09:00',
          end_time: '10:00',
          room: 'Room 101'
        },
        {
          class_id: '2',
          subject: 'English',
          teacher_name: 'Ms. Smith',
          start_time: '10:30',
          end_time: '11:30',
          room: 'Room 102'
        }
      ]);

      setLibraryBooks([
        {
          book_id: '1',
          title: 'Advanced Mathematics',
          author: 'Dr. Brown',
          due_date: '2024-02-15',
          status: 'borrowed'
        }
      ]);

    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calculate KPIs
  const classesToday = classes.filter(c => {
    const today = new Date().toDateString();
    // Mock logic - in real app, you'd check actual schedule
    return true;
  }).length;

  const [termDays, setTermDays] = useState<{present: number; total: number}>({ present: 0, total: 0 });
  useEffect(() => {
    const loadTerm = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Get school_id from user metadata instead of users table to avoid 406 errors
        const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
        const schoolId = userMetadata.school_id;
        if (!schoolId) return;
        // Find current term (today within start/end) or latest - fetch all and filter in JS
        const today = new Date().toISOString().slice(0,10);
        const { data: terms } = await supabase
          .from('school_terms')
          .select('*')
          .eq('school_id', schoolId)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const term = (terms || []).find((t: any) => 
          t.start_date ? 
            (t.start_date <= today && t.end_date >= today) : 
            (t.end_date >= today)
        ) || null;
        if (!term) { setTermDays({ present: 0, total: 0 }); return; }
        const start = new Date(term.start_date);
        const end = new Date(term.end_date);
        const total = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1);
        // Count present days for this student within term
        const { data: st } = await supabase
          .from('student_attendance')
          .select('present,status')
          .eq('school_id', schoolId)
          .eq('student_id', (student || {}).student_id || 'temp')
          .gte('attendance_date', term.start_date)
          .lte('attendance_date', term.end_date);
        const present = (st || []).filter((r) => studentAttendanceRowIsPresent(r)).length;
        setTermDays({ present, total });
      } catch {}
    };
    // Load when student changes
    if (student) loadTerm();
  }, [student]);

  const outstandingFees = (() => {
    const approved = payments
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const due = Math.max(0, Number(expectedFee || 0) - approved);
    console.log('Student Dashboard - Outstanding Fees Calculation:', {
      expectedFee,
      approved,
      due,
      paymentsCount: payments.length
    });
    return due;
  })();

  const borrowedBooks = libraryBooks.filter(b => b.status === 'borrowed').length;
  const notificationsCount = 3; // Mock data

  const formatCurrency = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // Show profile validation error if user should be logged out
  if (profileValidationError) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w11-card p-8 w-full max-w-2xl text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/70 mb-6">{profileValidationError}</p>
          <div className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">You will be automatically logged out in a few seconds...</p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Create a default student object if none found, so we can still show the dashboard
  const displayStudent = student || {
    student_id: 'temp',
    first_name: 'Student',
    middle_name: '',
    last_name: 'User',
    admission_number: 'N/A',
    current_class: 'N/A',
    status: 'active',
    student_email: '',
    student_phone: '',
    date_of_birth: '',
    gender: '',
    profile_picture: ''
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 bg-white/5 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Student Dashboard</h1>
                <p className="text-sm text-white/70">Welcome back, {displayStudent.first_name}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => {
                  setLoading(true);
                  fetchData();
                }}
                className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Refresh Data
              </button>
              
            <button
              onClick={handleLogout}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* No Data Warning */}
        {!student && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 bg-white/10 backdrop-blur-md p-4 mb-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-yellow-300 font-medium">Student Profile Not Found</p>
                <p className="text-yellow-200/80 text-sm">Please contact your school administrator to set up your student profile. Dashboard is showing with default data.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success Message for New Logins */}
        {student && student.student_id !== 'temp' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/20 to-emerald-600/20 bg-white/10 backdrop-blur-md p-4 mb-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-green-300 font-medium">Welcome to your Student Dashboard!</p>
                <p className="text-green-200/80 text-sm">Your profile has been automatically set up. You can now access your academic information, grades, and school resources.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Student Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-600/20 bg-white/10 backdrop-blur-md p-6 mb-8 shadow-lg shadow-black/20"
        >
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {displayStudent.profile_picture ? (
                <img
                  src={displayStudent.profile_picture}
                  alt={displayStudent.first_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {displayStudent.first_name} {displayStudent.middle_name} {displayStudent.last_name}
              </h2>
              <p className="text-white/80 mb-2">Admission: {displayStudent.admission_number}</p>
              <div className="flex items-center space-x-4 text-sm text-white/70">
                <span>Class: {displayStudent.current_class}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                displayStudent.status === 'active' 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-gray-500/20 text-gray-300'
              }`}>
                {displayStudent.status}
              </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Classes Today</p>
                <p className="text-2xl font-bold text-white">{classesToday}</p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Attendance This Term</p>
                <p className="text-2xl font-bold text-white">{termDays.present} / {termDays.total} days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              router.push('/dashboard/student/fees');
            }}
            className="text-left rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-amber-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Outstanding Fees</p>
                <p className="text-lg font-bold text-white">{formatCurrency.format(outstandingFees)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-400" />
            </div>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-purple-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Library Books</p>
                <p className="text-2xl font-bold text-white">{borrowedBooks}</p>
              </div>
              <Library className="w-8 h-8 text-purple-400" />
            </div>
        </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-red-500/20 to-red-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Notifications</p>
                <p className="text-2xl font-bold text-white">{notificationsCount}</p>
              </div>
              <Bell className="w-8 h-8 text-red-400" />
            </div>
          </motion.div>
          </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts and Widgets */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Classes */}
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-indigo-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Upcoming Classes</h3>
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
                  <div className="space-y-4">
                {classes.map((cls) => (
                  <div key={cls.class_id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div>
                      <p className="font-medium text-white">{cls.subject}</p>
                      <p className="text-sm text-white/70">{cls.teacher_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{cls.start_time} - {cls.end_time}</p>
                      <p className="text-xs text-white/60">{cls.room}</p>
                          </div>
                        </div>
                ))}
                      </div>
            </motion.div>

            {/* Recent Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-green-500/20 to-green-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Results</h3>
                <BookOpen className="w-5 h-5 text-green-400" />
              </div>
              <div className="space-y-4">
                {grades.slice(0, 5).map((grade) => (
                  <div key={grade.grade_id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div>
                      <p className="font-medium text-white">{grade.subject}</p>
                      <p className="text-sm text-white/70">{grade.term}</p>
                          </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        grade.grade >= 80 ? 'bg-green-500/20 text-green-300' :
                        grade.grade >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {grade.grade}%
                      </span>
                        </div>
                      </div>
                ))}
                {grades.length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70">No grades available yet.</p>
                    <p className="text-white/50 text-sm mt-1">Your academic results will appear here once they are recorded.</p>
                  </div>
                )}
                  </div>
            </motion.div>
          </div>

          {/* Right Column - Quick Actions and Info */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-orange-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
            >
              <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-orange-400" />
                  <span className="text-white">Download Receipt</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span className="text-white">View Timetable</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <span className="text-white">View Results</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <GraduationCap className="w-5 h-5 text-orange-400" />
                  <span className="text-white">Request Transcript</span>
                </button>
                </div>
              </motion.div>

            {/* Fee Payment History */}
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-cyan-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Payment History</h3>
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-4">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.payment_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{formatCurrency.format(payment.amount)}</p>
                      <p className="text-xs text-white/70">{payment.payment_method}</p>
                  </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      payment.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                      payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {payment.status}
                              </span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70">No payment history available.</p>
                    <p className="text-white/50 text-sm mt-1">Your fee payments will appear here once they are recorded.</p>
                  </div>
                )}
                  </div>
              </motion.div>

            {/* Messages */}
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-pink-500/20 to-pink-700/10 bg-white/10 backdrop-blur-md p-6 shadow-lg shadow-black/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Messages</h3>
                <MessageSquare className="w-5 h-5 text-pink-400" />
                  </div>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-white">Welcome to the new semester!</p>
                  <p className="text-xs text-white/70">From: School Admin</p>
                          </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-white">Parent-teacher meeting scheduled</p>
                  <p className="text-xs text-white/70">From: Class Teacher</p>
                        </div>
                      </div>
              </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

