import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { supabase } from '@/lib/supabase';
import {
  fetchCourseRegistrationsBySchool,
  approveRegistration,
  rejectRegistration,
  assignManualCourseRegistration,
  CourseUnitRegistration,
} from '@/features/tertiary/services/courseRegistrationService';
import { UHPAB_CERTIFICATE_NURSING_UNITS } from '@/features/tertiary/data/unmebCurriculumDefaults';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const ACADEMIC_YEAR_OPTIONS = [
  { value: '2026/2027', label: '2026/2027' },
  { value: '2025/2026', label: '2025/2026' },
];

const SEMESTER_OPTIONS = [
  { value: 'Semester 1', label: 'Semester 1' },
  { value: 'Semester 2', label: 'Semester 2' },
];

const PREV_GRADE_OPTIONS = [
  { value: 'F', label: 'F (Fail)' },
  { value: 'D', label: 'D (Pass Upgrade)' },
];
import {
  Repeat,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  BookOpen,
  GraduationCap,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface StudentSummary {
  student_id: string;
  name: string;
  admission_number: string;
  current_class: string;
}

export default function RetakesRegistrationsPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [activeTab, setActiveTab] = useState<'pending' | 'matrix' | 'outstanding' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<CourseUnitRegistration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCohort, setFilterCohort] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('Semester 1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026/2027');

  // Matrix tab selection
  const [matrixCourseCode, setMatrixCourseCode] = useState<string>(
    UHPAB_CERTIFICATE_NURSING_UNITS[0]?.code || 'NUR 1101'
  );

  // Manual Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [studentList, setStudentList] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assignCourseCode, setAssignCourseCode] = useState(
    UHPAB_CERTIFICATE_NURSING_UNITS[0]?.code || 'NUR 1101'
  );
  const [assignRegType, setAssignRegType] = useState<'regular' | 'retake'>('retake');
  const [assignPrevScore, setAssignPrevScore] = useState<string>('');
  const [assignPrevGrade, setAssignPrevGrade] = useState<string>('F');
  const [assignNotes, setAssignNotes] = useState('');

  // Reject Modal
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCourseRegistrationsBySchool();
      setRegistrations(data);

      // Load students list for assignment dropdown
      const { data: studentsData } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

      if (studentsData) {
        setStudentList(studentsData);
        if (studentsData.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsData[0].student_id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      showFeedback('Failed to load course unit registrations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [schoolId]);

  // Handlers
  const handleApprove = async (id: string) => {
    try {
      await approveRegistration(id, user?.id || 'academic-registrar');
      showFeedback('Registration approved successfully.');
      void loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Approval failed.', 'error');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalId) return;
    try {
      await rejectRegistration(rejectModalId, rejectReason);
      showFeedback('Registration rejected.');
      setRejectModalId(null);
      setRejectReason('');
      void loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Rejection failed.', 'error');
    }
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showFeedback('Please select a student.', 'error');
      return;
    }
    const selectedCourse = UHPAB_CERTIFICATE_NURSING_UNITS.find((u) => u.code === assignCourseCode);
    const courseTitle = selectedCourse?.title || assignCourseCode;
    const st = studentList.find((s) => s.student_id === selectedStudentId);

    setAssignLoading(true);
    try {
      await assignManualCourseRegistration({
        student_id: selectedStudentId,
        course_unit_code: assignCourseCode,
        course_unit_title: courseTitle,
        cohort_class: st?.current_class || 'General',
        offering_semester: selectedSemester,
        registration_type: assignRegType,
        previous_score: assignRegType === 'retake' && assignPrevScore ? parseFloat(assignPrevScore) : undefined,
        previous_grade: assignRegType === 'retake' ? assignPrevGrade : undefined,
        notes: assignNotes || (assignRegType === 'retake' ? 'Registered for retake sitting' : 'Direct enrollment'),
        approved_by: user?.id || 'academic-registrar',
      });

      showFeedback(`Successfully enrolled ${st?.name || 'student'} in ${assignCourseCode}.`);
      setIsAssignModalOpen(false);
      setAssignNotes('');
      setAssignPrevScore('');
      void loadData();
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || 'Enrolment failed.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  // Filtered views
  const pendingRegistrations = useMemo(() => {
    return registrations.filter((r) => r.status === 'pending');
  }, [registrations]);

  const retakeRegistrations = useMemo(() => {
    return registrations.filter((r) => r.registration_type === 'retake');
  }, [registrations]);

  const matrixEnrolledStudents = useMemo(() => {
    return registrations.filter(
      (r) =>
        r.course_unit_code === matrixCourseCode &&
        (selectedSemester === 'all' || r.offering_semester.toLowerCase() === selectedSemester.toLowerCase()) &&
        r.status !== 'rejected'
    );
  }, [registrations, matrixCourseCode, selectedSemester]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        (r.student_name && r.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.admission_number && r.admission_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.course_unit_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.course_unit_title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = filterType === 'all' || r.registration_type === filterType;
      const matchCohort = filterCohort === 'all' || r.cohort_class === filterCohort;
      return matchSearch && matchType && matchCohort;
    });
  }, [registrations, searchQuery, filterType, filterCohort]);

  // Unique cohorts for filtering
  const availableCohorts = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => {
      if (r.cohort_class) set.add(r.cohort_class);
    });
    studentList.forEach((s) => {
      if (s.current_class) set.add(s.current_class);
    });
    return Array.from(set).sort();
  }, [registrations, studentList]);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 min-h-screen"
      style={{
        background: t.screenBg,
        color: t.textPrimary,
        fontFamily: "'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 uppercase font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Tertiary Academic Registrar
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">
              UNMEB / UHPAB Standard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Retakes & Course Registrations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage student course unit enrolments, push-backs, and cross-cohort retake allocations for unified marksheets & lesson rosters.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: t.border, background: t.card }}
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Course / Retake</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div
          className="p-4 rounded-2xl border transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingRegistrations.length}</div>
          <p className="text-xs text-gray-400 mt-1">Students waiting for approval</p>
        </div>

        <div
          className="p-4 rounded-2xl border transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Enrolled Retakes</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{retakeRegistrations.length}</div>
          <p className="text-xs text-gray-400 mt-1">Cross-cohort sitting units</p>
        </div>

        <div
          className="p-4 rounded-2xl border transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Registrations</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{registrations.length}</div>
          <p className="text-xs text-gray-400 mt-1">Total registered unit slots</p>
        </div>

        <div
          className="p-4 rounded-2xl border transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Trainees Enrolled</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400">{studentList.length}</div>
          <p className="text-xs text-gray-400 mt-1">Active nursing cohort students</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b mb-6 overflow-x-auto" style={{ borderColor: t.border }}>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'pending'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingRegistrations.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-black font-bold">
              {pendingRegistrations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'matrix'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Unit Enrolment Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'all'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>All Registrations Log</span>
        </button>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: t.card, borderColor: t.border }}>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>
                Review course registrations and retake enrollments submitted by students or departmental coordinators.
              </span>
            </div>
            {pendingRegistrations.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {pendingRegistrations.length} requests pending review
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading registrations...</div>
          ) : pendingRegistrations.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl border"
              style={{ background: t.card, borderColor: t.border }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-semibold">Queue is Clean!</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                There are no pending course registrations or retake applications awaiting Academic Registrar approval.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden shadow-sm"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className="text-xs uppercase tracking-wider font-semibold border-b text-gray-400"
                    style={{ background: isDark ? '#1e2430' : '#f8fafc', borderColor: t.border }}
                  >
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Cohort</th>
                      <th className="py-3.5 px-4">Course Unit</th>
                      <th className="py-3.5 px-4">Sitting Type</th>
                      <th className="py-3.5 px-4">Prev Score</th>
                      <th className="py-3.5 px-4">Semester</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: t.border }}>
                    {pendingRegistrations.map((item) => (
                      <tr key={item.id} className="hover:bg-purple-500/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{item.student_name}</div>
                          <div className="text-xs text-gray-400">{item.admission_number}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 text-xs rounded-md bg-gray-500/15 text-gray-300 font-mono">
                            {item.cohort_class}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <span className="font-mono text-purple-400 font-semibold">{item.course_unit_code}</span>
                            <span>{item.course_unit_title}</span>
                          </div>
                          <div className="text-xs text-gray-400">{item.credit_units ?? 3} Credit Units (CU)</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.registration_type === 'retake' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <Repeat className="w-3 h-3" />
                              RETAKE
                            </span>
                          ) : item.registration_type === 'deferred' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              DEFERRED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              REGULAR
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.previous_score !== undefined && item.previous_score !== null ? (
                            <span className="text-xs font-medium text-rose-400">
                              {item.previous_score}% ({item.previous_grade || 'F'})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-300">
                          <div>{item.offering_semester}</div>
                          <div className="text-gray-500">{item.academic_year}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModalId(item.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE UNIT ENROLMENT MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div
            className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Academic Year</label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500"
                  style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
                >
                  <option value="2026/2027">2026/2027</option>
                  <option value="2025/2026">2025/2026</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500"
                  style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="all">All Semesters</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-gray-400 block mb-1">Target Course Unit</label>
                <select
                  value={matrixCourseCode}
                  onChange={(e) => setMatrixCourseCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500 font-medium"
                  style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
                >
                  {UHPAB_CERTIFICATE_NURSING_UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code}: {u.title} ({u.defaultSemester} • {u.creditUnits} CU)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400">Total Enrolled Trainees</div>
                <div className="text-lg font-bold text-purple-400">
                  {matrixEnrolledStudents.length}{' '}
                  <span className="text-xs text-gray-400 font-normal">
                    ({matrixEnrolledStudents.filter((s) => s.registration_type === 'retake').length} retakes)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Trainees Sheet */}
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span className="text-purple-400 font-mono">{matrixCourseCode}</span>
                  <span>
                    {UHPAB_CERTIFICATE_NURSING_UNITS.find((u) => u.code === matrixCourseCode)?.title ||
                      'Enrolled Roster'}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Both regular cohort trainees and cross-cohort retake students are unified on this exact roster for attendance and assessment marksheets.
                </p>
              </div>
            </div>

            {matrixEnrolledStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <AlertTriangle className="w-10 h-10 text-amber-400/60 mx-auto mb-2" />
                <p className="font-medium">No registrations recorded for this unit yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click "Assign Course / Retake" above to enroll regular or retake students into this unit.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className="text-xs uppercase tracking-wider font-semibold border-b text-gray-400"
                    style={{ background: isDark ? '#1e2430' : '#f8fafc', borderColor: t.border }}
                  >
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Trainee Name</th>
                      <th className="py-3 px-4">Admission No.</th>
                      <th className="py-3 px-4">Home Cohort</th>
                      <th className="py-3 px-4">Enrolment Type</th>
                      <th className="py-3 px-4">Sitting Details</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: t.border }}>
                    {matrixEnrolledStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-purple-500/5 transition-colors">
                        <td className="py-3 px-4 text-xs text-gray-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-white">{st.student_name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-300">{st.admission_number}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-500/15 text-gray-300 font-mono">
                            {st.cohort_class}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {st.registration_type === 'retake' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <Repeat className="w-3 h-3" />
                              RETAKE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                              REGULAR
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">
                          {st.registration_type === 'retake' ? (
                            <span className="text-rose-400">
                              Prev Score: {st.previous_score ?? 0}% ({st.previous_grade || 'F'})
                            </span>
                          ) : (
                            <span>1st Sitting</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              st.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : st.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {st.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ALL REGISTRATIONS LOG */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div
            className="p-4 rounded-2xl border flex flex-col md:flex-row gap-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, admission number, or course unit code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500"
                style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500"
                style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="retake">Retake</option>
                <option value="deferred">Deferred</option>
              </select>

              <select
                value={filterCohort}
                onChange={(e) => setFilterCohort(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-purple-500"
                style={{ background: t.screenBg, borderColor: t.border, color: t.textPrimary }}
              >
                <option value="all">All Cohorts</option>
                {availableCohorts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead
                  className="text-xs uppercase tracking-wider font-semibold border-b text-gray-400"
                  style={{ background: isDark ? '#1e2430' : '#f8fafc', borderColor: t.border }}
                >
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Cohort</th>
                    <th className="py-3.5 px-4">Course Unit</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: t.border }}>
                  {filteredRegistrations.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-500/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.student_name}</div>
                        <div className="text-xs text-gray-400">{item.admission_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-500/15 text-gray-300 font-mono">
                          {item.cohort_class}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span className="font-mono text-purple-400 font-semibold">{item.course_unit_code}</span>
                          <span>{item.course_unit_title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-300">
                        <div>{item.offering_semester}</div>
                        <div className="text-gray-500">{item.academic_year}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.registration_type === 'retake' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <Repeat className="w-3 h-3" />
                            RETAKE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                            REGULAR
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : item.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 max-w-xs truncate">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT ASSIGNMENT */}
      <NativeModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Direct Course / Retake Enrolment"
        subtitle="Enrol trainee into curricular course unit or cross-cohort retake sitting."
        icon={BookOpen}
        size="lg"
      >
        <form onSubmit={handleManualAssign} className="space-y-4">
          <div className="relative z-[40] focus-within:z-[60]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Select Trainee *
            </label>
            <LiquidGlassSelect
              value={selectedStudentId}
              onChange={(val) => setSelectedStudentId(val)}
              options={studentList.map((s) => ({
                value: s.student_id,
                label: `${s.name} (${s.admission_number}) — ${s.current_class}`,
              }))}
              placeholder="Search / Select Trainee..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative z-[30] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Academic Year *
              </label>
              <LiquidGlassSelect
                value={selectedAcademicYear}
                onChange={(val) => setSelectedAcademicYear(val)}
                options={ACADEMIC_YEAR_OPTIONS}
                placeholder="Select Academic Year..."
              />
            </div>

            <div className="relative z-[30] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Semester *
              </label>
              <LiquidGlassSelect
                value={selectedSemester === 'all' ? 'Semester 1' : selectedSemester}
                onChange={(val) => setSelectedSemester(val)}
                options={SEMESTER_OPTIONS}
                placeholder="Select Semester..."
              />
            </div>
          </div>

          <div className="relative z-[20] focus-within:z-[40]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Course Unit *
            </label>
            <LiquidGlassSelect
              value={assignCourseCode}
              onChange={(val) => setAssignCourseCode(val)}
              options={UHPAB_CERTIFICATE_NURSING_UNITS.map((u) => ({
                value: u.code,
                label: `${u.code}: ${u.title} (${u.defaultSemester} • ${u.creditUnits} CU)`,
              }))}
              placeholder="Select Course Unit..."
            />
          </div>

          <div className="relative z-[10]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Registration Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssignRegType('regular')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  assignRegType === 'regular'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                    : 'border-white/15 bg-white/5 text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Regular (1st Sitting)
              </button>

              <button
                type="button"
                onClick={() => setAssignRegType('retake')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  assignRegType === 'retake'
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-md shadow-rose-500/20'
                    : 'border-white/15 bg-white/5 text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Retake (2nd+ Sitting)
              </button>
            </div>
          </div>

          {assignRegType === 'retake' && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3 relative z-[10]">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Enrolling as cross-cohort retake. Student will appear on this unit's marksheet and lesson attendance.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Previous Score (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="49.9"
                    step="0.1"
                    placeholder="e.g. 38.5"
                    value={assignPrevScore}
                    onChange={(e) => setAssignPrevScore(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
                  />
                </div>
                <div className="relative z-[15] focus-within:z-[30]">
                  <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Previous Grade
                  </label>
                  <LiquidGlassSelect
                    value={assignPrevGrade}
                    onChange={(val) => setAssignPrevGrade(val)}
                    options={PREV_GRADE_OPTIONS}
                    placeholder="Select Grade..."
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Registrar Notes / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Approved retake sitting for Year 2 Semester 1"
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all flex items-center gap-2"
            >
              {assignLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Enrol Trainee</span>
            </button>
          </div>
        </form>
      </NativeModal>

      {/* MODAL: REJECT CONFIRMATION */}
      <NativeModal
        isOpen={Boolean(rejectModalId)}
        onClose={() => setRejectModalId(null)}
        title="Reject Registration"
        subtitle="Mandatory institutional reason for rejecting course unit enrolment."
        icon={AlertTriangle}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-white/70 leading-relaxed">
            Please provide a rationale for rejecting this course unit registration. The student will be notified and will not be placed on this unit's roster.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Maximum credit units exceeded this semester, or prerequisite unit not completed."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-rose-400 focus:bg-black/35 transition-all shadow-inner resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setRejectModalId(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/25 border border-rose-400/30 transition-all"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </NativeModal>
    </div>
  );
}
