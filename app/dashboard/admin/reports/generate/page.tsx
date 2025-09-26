"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  calculateGrade, 
  calculateDivision, 
  calculateAggregate, 
  formatCurrency, 
  calculateAttendancePercentage,
  getAttendanceDetails,
  getPerformanceRemark,
  getClassPosition,
  getStreamPosition,
  formatValue,
  formatPercentage,
  formatAttendance,
  formatPosition
} from "@/src/lib/reportUtils";

export default function GenerateReportsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [examSets, setExamSets] = useState<any[]>([]);
  const [currentTermInfo, setCurrentTermInfo] = useState<{ year: number; term: number } | null>(null);
  const [nextTermBegins, setNextTermBegins] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state (exam set selection removed; we aggregate all sets in current term)
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [selectedTemplate, setSelectedTemplate] = useState<'template1' | 'template2' | 'template3'>('template1');
  
  // Report data
  const [reportData, setReportData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [showStudentSuggestions, setShowStudentSuggestions] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
        if (!u?.school_id) return;
        
        setSchoolId(u.school_id);
        
        // Load school info
        const { data: school } = await supabase
          .from('schools')
          .select('*')
          .eq('school_id', u.school_id)
          .single();
        setSchoolInfo(school);
        
        // Load exam sets
        const { data: examSetsData } = await supabase
          .from('exam_sets')
          .select('*')
          .eq('school_id', u.school_id)
          .eq('is_active', true)
          .order('year', { ascending: false })
          .order('term', { ascending: true });
        // Filter to only the current term (latest year, then latest term in that year)
        const allSets = examSetsData || [];
        let currentTermSets = allSets;
        if (allSets.length > 0) {
          const maxYear = Math.max(...allSets.map(es => es.year || 0));
          const setsThisYear = allSets.filter(es => es.year === maxYear);
          const maxTerm = Math.max(...setsThisYear.map(es => es.term || 0));
          currentTermSets = allSets.filter(es => es.year === maxYear && es.term === maxTerm);
          setCurrentTermInfo({ year: maxYear, term: maxTerm });
        }
        setExamSets(currentTermSets);

        // Load next term begins date (optional table: school_terms)
        if (currentTermSets.length > 0) {
          const year = Math.max(...currentTermSets.map(es => es.year || 0));
          const term = Math.max(...currentTermSets.filter(es => es.year === year).map(es => es.term || 0));
          const { data: termInfo } = await supabase
            .from('school_terms')
            .select('next_term_begins')
            .eq('school_id', u.school_id)
            .eq('year', year)
            .eq('term', term)
            .maybeSingle();
          if (termInfo?.next_term_begins) {
            setNextTermBegins(new Date(termInfo.next_term_begins).toLocaleDateString());
          }
        }
        
        // Load students
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', u.school_id)
          .order('current_class', { ascending: true })
          .order('name', { ascending: true });
        setStudents(studentsData || []);
        
        // Get unique classes
        const uniqueClasses = [...new Set((studentsData || []).map(s => s.current_class))].sort();
        setClasses(uniqueClasses);
      } catch (err) {
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const filteredStudents = selectedClass 
    ? students.filter(s => s.current_class === selectedClass)
    : students;

  const visibleStudents = (studentSearch ? filteredStudents.filter(s => {
    const q = studentSearch.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.admission_number || "").toLowerCase().includes(q) ||
      (s.student_id || "").toLowerCase().includes(q)
    );
  }) : filteredStudents);

  const generateReport = async (studentId?: string) => {
    if (reportType === 'single' && !studentId && !selectedStudent) {
      setError('Please select a student');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const targetStudentId = studentId || selectedStudent;
      const targetStudents = reportType === 'class' && selectedClass 
        ? students.filter(s => s.current_class === selectedClass)
        : [students.find(s => s.student_id === targetStudentId)].filter(Boolean);

      if (targetStudents.length === 0) {
        setError('No students found');
        return;
      }

      // Fetch exam results for ALL exam sets in the current term
      const { data: examResults } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam_sets!inner(*)
        `)
        .eq('school_id', schoolId)
        .in('exam_set_id', (examSets || []).map(es => es.id))
        .in('student_id', targetStudents.map(s => s.student_id));

      // Fetch attendance data for the entire class (to get first attendance date for the class)
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_name', targetStudents[0].current_class); // Get attendance for the entire class

      // Fetch fees data
      const { data: feesData } = await supabase
        .from('student_fees')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', targetStudents.map(s => s.student_id));

      // Fetch termly projects (secondary feature)
      let projectsData: any[] = [];
      if (currentTermInfo) {
        const { data: pd } = await supabase
          .from('termly_projects')
          .select('*')
          .eq('school_id', schoolId)
          .eq('class_name', targetStudents[0].current_class)
          .eq('year', currentTermInfo.year)
          .eq('term', currentTermInfo.term)
          .in('student_id', targetStudents.map(s => s.student_id));
        projectsData = pd || [];
      }

      // Fetch report comments (secondary feature)
      let commentsData: any[] = [];
      if (currentTermInfo) {
        const { data: cd } = await supabase
          .from('report_comments')
          .select('*')
          .eq('school_id', schoolId)
          .eq('class_name', targetStudents[0].current_class)
          .eq('year', currentTermInfo.year)
          .eq('term', currentTermInfo.term)
          .in('student_id', targetStudents.map(s => s.student_id));
        commentsData = cd || [];
      }

      const referenceExamSet = [...(examSets || [])]
        .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime())[0];

      const reportData = {
        school: schoolInfo,
        examSet: currentTermInfo ? { year: currentTermInfo.year, term: currentTermInfo.term, name: 'All Exam Sets' } : null,
        nextTermBegins: nextTermBegins,
        students: targetStudents.map(student => {
          const studentResults = examResults?.filter(er => er.student_id === student.student_id) || [];
          const studentAttendance = attendanceData?.filter(a => a.student_id === student.student_id) || [];
          const studentFees = feesData?.filter(f => f.student_id === student.student_id) || [];
          const studentProjects = projectsData.filter(p => p.student_id === student.student_id);
          const studentComments = commentsData
            .filter(c => c.student_id === student.student_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
          
          // Calculate summary with enhanced grading (handle missing data)
          const totalMarks = studentResults.length > 0 ? studentResults.reduce((sum, result) => sum + (result.marks_obtained || 0), 0) : null;
          const totalPossibleMarks = studentResults.length > 0 ? studentResults.reduce((sum, result) => sum + (result.total_marks || 100), 0) : null;
          const average = totalPossibleMarks && totalPossibleMarks > 0 ? (totalMarks! / totalPossibleMarks) * 100 : null;
          const aggregate = studentResults.length > 0 ? calculateAggregate(studentResults) : null;
          const division = average !== null ? calculateDivision(average) : 'N/A';
          const attendanceDetails = getAttendanceDetails(studentAttendance, referenceExamSet, examSets);
          const attendancePercentage = attendanceDetails.percentage;

          return {
            ...student,
            results: studentResults,
            attendance: studentAttendance,
            fees: studentFees,
            projects: studentProjects,
            comments: studentComments,
            nextTermBegins: nextTermBegins,
            summary: {
              totalMarks,
              totalPossibleMarks,
              average: average !== null ? Math.round(average * 100) / 100 : null,
              aggregate: aggregate !== null ? Math.round(aggregate * 100) / 100 : null,
              division,
              attendancePercentage,
              attendanceDetails,
              performanceRemark: average !== null ? getPerformanceRemark(average) : 'N/A - No exam results available',
              classPosition: 0, // Will be calculated after all students are processed
              streamPosition: 0 // Will be calculated after all students are processed
            }
          };
        })
      };

      // Calculate positions after all students are processed
      // Students with missing exam results (null average) will be treated as 0 and rank last
      reportData.students = reportData.students.map((student: any) => ({
        ...student,
        summary: {
          ...student.summary,
          classPosition: getClassPosition(reportData.students, student),
          streamPosition: getStreamPosition(reportData.students, student)
        }
      }));

      setReportData(reportData);
      setShowPreview(true);
    } catch (err) {
      setError(`Failed to generate report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadSingleReport = async () => {
    if (!reportData || reportData.students.length === 0) return;
    
    try {
      const response = await fetch('/api/reports/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'single'
        })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportData.students[0].name}_Report_${reportData.examSet.name}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const downloadClassReports = async () => {
    if (!reportData || reportData.students.length === 0) return;
    
    try {
      const response = await fetch('/api/reports/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'class'
        })
      });

      if (!response.ok) throw new Error('Failed to generate documents');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClass}_Reports_${reportData.examSet.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download reports: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Student Report Generator</h1>
            <p className="text-white/80 text-sm mt-1">Generate and download student academic reports</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin/reports')}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            Back to Reports
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        {/* Report Generation Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-6"
        >
          <h2 className="text-white text-lg font-medium mb-4">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Template Selection */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Report Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as 'template1' | 'template2' | 'template3')}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option className="text-black" value="template1">Template 1 - O-Level Format</option>
                <option className="text-black" value="template2">Template 2 - Coming Soon</option>
                <option className="text-black" value="template3">Template 3 - Coming Soon</option>
              </select>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as 'single' | 'class');
                  setSelectedStudent('');
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option className="text-black" value="single">Single Student</option>
                <option className="text-black" value="class">Entire Class</option>
              </select>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option className="text-white/70 bg-slate-900" value="">Select Class</option>
                {classes.map(className => (
                  <option className="text-black" key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Selection (only for single report) */}
          {reportType === 'single' && (
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-2">
                Student
              </label>
              <div className="mb-3 relative">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentSuggestions(true);
                  }}
                  onFocus={() => setShowStudentSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 150)}
                  placeholder="Search by name or admission number"
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedClass}
                />
                {showStudentSuggestions && selectedClass && visibleStudents.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-white/20 bg-slate-900/90 backdrop-blur text-white shadow-lg">
                    {visibleStudents.slice(0, 50).map(student => (
                      <button
                        type="button"
                        key={student.student_id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedStudent(student.student_id);
                          setStudentSearch(`${student.name} - ${student.admission_number || student.student_id}`);
                          setShowStudentSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors"
                      >
                        <div className="text-sm font-medium">{student.name}</div>
                        <div className="text-xs text-white/70">{student.admission_number || student.student_id}</div>
                      </button>
                    ))}
                    {visibleStudents.length > 50 && (
                      <div className="px-3 py-2 text-xs text-white/60">Showing first 50 results. Keep typing to narrow down.</div>
                    )}
                  </div>
                )}
              </div>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedClass}
              >
                <option className="text-white/70 bg-slate-900" value="">Select Student</option>
                {visibleStudents.map(student => (
                  <option className="text-black" key={student.student_id} value={student.student_id}>
                    {student.name} - {student.admission_number || student.student_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => generateReport()}
              disabled={generating || !selectedClass || (reportType === 'single' && !selectedStudent)}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
            >
              {generating ? 'Generating...' : 'Preview Report'}
            </button>
            
            {showPreview && reportData && (
              <>
                <button
                  onClick={downloadSingleReport}
                  className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium"
                >
                  Download as DOCX (Single)
                </button>
                
                {reportType === 'class' && (
                  <button
                    onClick={downloadClassReports}
                    className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
                  >
                    Download All (Class)
                  </button>
                )}
                
                <button
                  onClick={printReport}
                  className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium"
                >
                  Print Report
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Report Preview */}
        {showPreview && reportData && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6"
          >
            <h2 className="text-white text-lg font-medium mb-4">Report Preview</h2>
            
            {reportData.students.map((student: any, index: number) => (
              <div key={student.student_id} className="mb-8 last:mb-0">
                <ReportPreview 
                  student={student} 
                  examSet={reportData.examSet} 
                  school={reportData.school}
                  template={selectedTemplate}
                />
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Helpers
function isSecondaryClass(className: string): boolean {
  if (!className) return false;
  return /^S\d/i.test(className.trim());
}

// Template 1 - O-Level Report Card (Exact format from sample)
function Template1OLevelReport({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  return (
    <div style={{ fontFamily: 'Times New Roman, Arial, sans-serif' }} className="bg-white text-black p-6 md:p-8 rounded-lg shadow-lg max-w-5xl mx-auto print:shadow-none print:rounded-none">
      
      {/* HEADER - School Logo and Info */}
      <div className="flex items-start justify-between mb-4">
        {/* School Logo Placeholder */}
        <div className="w-20 h-20 border-2 border-gray-300 rounded-full flex items-center justify-center">
          <div className="text-center text-xs">
            <div className="font-bold">EMIRATES</div>
            <div className="font-bold">COLLEGE</div>
            <div className="font-bold">SCHOOL</div>
          </div>
        </div>
        
        {/* School Name and Contact */}
        <div className="text-center flex-1">
          <div className="font-bold text-[18pt] uppercase">{school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div className="text-[9pt] mt-1">TEL :: {school?.phone || '0701395594'} | EMAIL :: {school?.email || 'info@emiratescollege.sc.ug'} | P.O.BOX 31175, KAMPALA, UGANDA</div>
          <div className="text-[9pt] mt-1 italic">SCHOOL MOTTO: {school?.motto || 'Education the Future'}</div>
        </div>
        
        {/* Student Photo Placeholder */}
        <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
          <div className="text-xs text-gray-500">Photo</div>
        </div>
      </div>

      {/* REPORT TITLE */}
      <div className="text-center bg-green-600 text-white py-2 mb-4">
        <h1 className="text-[13pt] font-bold uppercase">
          LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || '2'}, {examSet?.year || '2025'}
        </h1>
      </div>

      {/* LEARNER INFO */}
      <div className="mb-4 text-[11pt]">
        <div><strong>LNo.:</strong> {student.admission_number || student.student_id}</div>
        <div><strong>NAME:</strong> {student.name}</div>
        <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
      </div>

      {/* ATTENDANCE TABLE */}
      <div className="flex justify-end mb-4">
        <table style={{ borderCollapse: 'collapse', width: '300px' }}>
          <thead>
            <tr>
              <th className="text-center text-[10pt] font-bold" style={{ border: '1px solid #000', padding: '6px', background: '#f0f0f0' }}>ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>
                <div><strong>Days Present:</strong> {daysPresent}</div>
                <div><strong>Days Absent:</strong> {daysAbsent}</div>
                <div><strong>Total:</strong> {totalDays}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SUBJECTS TABLE */}
      <table className="w-full mb-4" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            {['Subjects & Topics Covered','Activity Score [3]','Descriptor','Formative Score [20%]','Exam Score [80%]','Final Score [100%]','Grade','Overall Remark','Subject Teacher'].map(h => (
              <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#4CAF50', color: 'white', padding: '6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {student.results.length > 0 ? (
            student.results.map((result: any, index: number) => {
              const topics = Array.isArray(result.topics) ? result.topics : [];
              const activity = result.activity_score ?? '';
              const descriptor = result.descriptor ?? '';
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const gradeText = result.grade ?? '';
              const overallRemark = result.overall_remark ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>
                    <div className="font-bold">{result.subject}</div>
                    <div className="text-[9pt] leading-snug mt-1">
                      {topics.length > 0 ? topics.map((t: any, i: number) => (
                        <div key={i}>{typeof t === 'string' ? t : JSON.stringify(t)}</div>
                      )) : (result.topic || '')}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{activity}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{descriptor}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{formative}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{exam}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{finalScore}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{gradeText}</td>
                  <td className="text-[9pt]" style={{ border: '1px solid #000', padding: '6px' }}>{overallRemark}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{teacherInitials}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PERFORMANCE SUMMARY */}
      <div className="mb-4 text-[11pt]">
        <p><strong>AVERAGE SCORES:</strong> {avg} {avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> {overallPerf}</p>
      </div>

      {/* TERMLY PROJECTS */}
      <table className="w-full mb-4" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            {['Subject','Project Title','Remark','Score [10]','Teacher'].map(h => (
              <th key={h} style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', background: '#f0f0f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(student.projects && student.projects.length > 0) ? (
            student.projects.map((p: any, idx: number) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.subject || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.project_title || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.remark || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.score ?? 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.teacher || 'N/A'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000', padding: '6px' }}>N/A</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <p>{student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'}</p>
        <p>
          Name: {student.comments?.class_teacher_name || '__________'} |
          {' '}Signature: {student.comments?.class_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.class_teacher_date || '17 September, 2025'}
        </p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <p>{student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>
          Name: {student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} |
          {' '}Signature: {student.comments?.head_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.head_teacher_date || '17 September, 2025'}
        </p>
      </div>

      <p className="mb-4 text-[11pt]"><strong>Next Term Begins:</strong> {student?.nextTermBegins || 'Saturday, 13 September, 2025'}</p>

      {/* Grading system & descriptions */}
      <div className="mb-4">
        <h3 className="text-[11pt] font-semibold">Grading System</h3>
        <p className="text-[10pt]"><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3 className="text-[11pt] font-semibold mt-2">Description</h3>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Grade</th>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Achievement Level</th>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>A</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Exceptional</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>B</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Outstanding</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>C</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Satisfactory</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>D</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Basic</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>E</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Elementary</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center text-[9pt] mt-4">
        <div>Printed from: Edusat ERP | 0700274249</div>
        <div>School Motto: '{school?.motto || 'Education the Future'}'</div>
        <div>Page 1 of 2</div>
      </div>
      
      {/* QR Code Placeholder */}
      <div className="flex justify-end mt-2">
        <div className="w-16 h-16 border border-gray-300 bg-gray-100 flex items-center justify-center">
          <div className="text-xs text-gray-500">VERIFICATION</div>
        </div>
      </div>
    </div>
  );
}

// Report Preview Component with template selection
function ReportPreview({ student, examSet, school, template }: { student: any; examSet: any; school: any; template: string }) {
  if (template === 'template1') {
    return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
  }
  
  if (isSecondaryClass(student.current_class)) {
    return <SecondaryReportPreview student={student} examSet={examSet} school={school} />;
  }
  return (
    <div className="bg-white text-black p-8 rounded-lg shadow-lg max-w-4xl mx-auto print:shadow-none print:rounded-none">
      {/* School Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">{school?.name || 'School Name'}</h1>
        <p className="text-sm text-gray-600 mt-1">{school?.motto || 'School Motto'}</p>
        <p className="text-xs text-gray-500 mt-2">
          {school?.address || 'School Address'} | Tel: {school?.phone || 'Phone'} | Email: {school?.email || 'Email'}
        </p>
      </div>

      {/* Student Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">STUDENT REPORT</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Name:</strong> {student.name}</div>
          <div><strong>Admission No:</strong> {student.admission_number || student.student_id}</div>
          <div><strong>Class:</strong> {student.current_class}</div>
          <div><strong>Year:</strong> {examSet.year}</div>
          <div><strong>Term:</strong> {examSet.term}</div>
          <div><strong>Exam Set:</strong> {examSet.name}</div>
        </div>
      </div>

      {/* Subject Performance Table */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3 text-gray-800">SUBJECT PERFORMANCE</h3>
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left">Subject</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Marks</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Grade</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Remarks</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Teacher Initials</th>
            </tr>
          </thead>
          <tbody>
            {student.results.length > 0 ? (
              student.results.map((result: any, index: number) => {
                const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
                return (
                  <tr key={index}>
                    <td className="border border-gray-400 px-2 py-1">{result.subject}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">{result.marks_obtained}/{result.total_marks}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">{gradeInfo.grade}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">{gradeInfo.remark}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">-</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="border border-gray-400 px-2 py-4 text-center text-gray-500">
                  N/A - Student did not sit for this exam set
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3 text-gray-800">SUMMARY</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Total Marks:</strong> {formatValue(student.summary.totalMarks)}/{formatValue(student.summary.totalPossibleMarks)}</div>
          <div><strong>Average:</strong> {formatPercentage(student.summary.average)}</div>
          <div><strong>Aggregate:</strong> {formatValue(student.summary.aggregate)}</div>
          <div><strong>Division:</strong> {formatValue(student.summary.division)}</div>
          <div><strong>Class Position:</strong> {formatPosition(student.summary.classPosition, student.summary.average)}</div>
          <div><strong>Stream Position:</strong> {formatPosition(student.summary.streamPosition, student.summary.average)}</div>
          <div><strong>Attendance:</strong> {formatAttendance(student.summary.attendanceDetails.presentDays, student.summary.attendanceDetails.totalSchoolDays, student.summary.attendancePercentage)}</div>
          <div><strong>Performance:</strong> {formatValue(student.summary.performanceRemark)}</div>
        </div>
      </div>

      {/* Attendance Details Section */}
      {student.summary.attendanceDetails.totalSchoolDays !== null && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-800">ATTENDANCE DETAILS</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Period:</strong> {formatValue(student.summary.attendanceDetails.firstAttendanceDate)} to {formatValue(student.summary.attendanceDetails.lastSchoolDay)}</div>
            <div><strong>Last Exam Set:</strong> {formatValue(student.summary.attendanceDetails.lastExamSetName)}</div>
            <div><strong>Total School Days:</strong> {formatValue(student.summary.attendanceDetails.totalSchoolDays)}</div>
            <div><strong>Days Present:</strong> {formatValue(student.summary.attendanceDetails.presentDays)}</div>
            <div><strong>Days Absent:</strong> {formatValue(student.summary.attendanceDetails.absentDays)}</div>
          </div>
        </div>
      )}

      {/* Remarks Section */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3 text-gray-800">REMARKS</h3>
        <div className="space-y-4">
          <div>
            <strong>Class Teacher's Remarks:</strong>
            <div className="border border-gray-300 h-16 mt-1"></div>
          </div>
          <div>
            <strong>Head Teacher's Remarks:</strong>
            <div className="border border-gray-300 h-16 mt-1"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 border-t border-gray-300 pt-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <strong>Next Term Opens:</strong> ________________
          </div>
          <div>
            <strong>Fees Balance:</strong> {student.fees.length > 0 ? formatCurrency(student.fees[0].balance || 0) : 'N/A'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="border-b border-gray-400 w-32 mx-auto mb-1"></div>
            <div>Class Teacher's Signature</div>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 w-32 mx-auto mb-1"></div>
            <div>Head Teacher's Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Secondary school report preview matching provided structure
function SecondaryReportPreview({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? 'N/A';
  const totalDays = attendance.totalSchoolDays ?? 'N/A';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : 'N/A';
  const avg = student.summary.average ?? 'N/A';
  const avgGrade = student.summary.division ?? 'N/A';
  const overallPerf = student.summary.performanceRemark ?? 'N/A';

  return (
    <div style={{ fontFamily: 'Times New Roman, Arial, sans-serif' }} className="bg-white text-black p-6 md:p-8 rounded-lg shadow-lg max-w-5xl mx-auto print:shadow-none print:rounded-none">
      {/* HEADER */}
      <div className="text-center mb-2">
        <div className="font-bold text-[18pt] uppercase">{school?.name || 'School Name'}</div>
        <div className="text-[9pt] mt-0.5">TEL: {school?.phone || 'Phone'} | EMAIL: {school?.email || 'Email'} | {school?.address || 'Address'}</div>
        <div className="text-[9pt] mt-0.5 italic">SCHOOL MOTTO: {school?.motto || 'Education the Future'}</div>
      </div>

      {/* TITLE */}
      <h1 className="text-center text-[13pt] font-bold my-3 uppercase">
        LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || ''}, {examSet?.year || ''}
      </h1>

      {/* META */}
      <div className="my-2 flex flex-wrap gap-5 text-[11pt]">
        <div><strong>LNo.</strong> {student.admission_number || student.student_id}</div>
        <div><strong>NAME:</strong> {student.name}</div>
        <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
      </div>

      {/* ATTENDANCE TABLE */}
      <table className="mb-3" style={{ borderCollapse: 'collapse', width: '300px' }}>
        <thead>
          <tr>
            <th className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>Days Present</th>
            <th className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>Days Absent</th>
            <th className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>{daysPresent}</td>
            <td className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>{daysAbsent}</td>
            <td className="text-center text-[10pt]" style={{ border: '1px solid #000', padding: '6px' }}>{totalDays}</td>
          </tr>
        </tbody>
      </table>

      {/* SUBJECTS TABLE */}
      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            {['Subjects & Topics Covered','Activity Score [3]','Descriptor','Formative (20%)','Exam (80%)','Final (100%)','Grade','Overall Remark','Subject Teacher'].map(h => (
              <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {student.results.length > 0 ? (
            student.results.map((result: any, index: number) => {
              const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
              const topics = Array.isArray(result.topics) ? result.topics : [];
              const activity = result.activity_score ?? 'N/A';
              const descriptor = result.descriptor ?? (gradeInfo.remark || 'N/A');
              const formative = result.formative_score ?? 'N/A';
              const exam = result.exam_score ?? 'N/A';
              const finalScore = result.final_score ?? (result.total_marks ? Math.round((result.marks_obtained / result.total_marks) * 100) : 'N/A');
              const gradeText = result.grade ?? gradeInfo.grade ?? 'N/A';
              const overallRemark = result.overall_remark ?? gradeInfo.remark ?? 'N/A';
              const teacherName = result.teacher_name ?? '-';
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>
                    <strong>{result.subject}</strong>
                    <div className="text-[9pt] leading-snug">
                      {topics.length > 0 ? topics.map((t: any, i: number) => (
                        <div key={i}>{typeof t === 'string' ? t : JSON.stringify(t)}</div>
                      )) : null}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{activity}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{descriptor}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{formative}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{exam}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{finalScore}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{gradeText}</td>
                  <td className="text-[9pt]" style={{ border: '1px solid #000', padding: '6px' }}>{overallRemark}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{teacherName}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PERFORMANCE SUMMARY */}
      <div className="mt-2 text-[11pt]">
        <p><strong>AVERAGE SCORES:</strong> {avg} {avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> {overallPerf}</p>
      </div>

      {/* TERMLY PROJECTS */}
      <table className="w-full mt-3" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            {['Subject','Project Title','Remark','Score','Teacher'].map(h => (
              <th key={h} style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(student.projects && student.projects.length > 0) ? (
            student.projects.map((p: any, idx: number) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.subject || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.project_title || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.remark || 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.score ?? 'N/A'}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{p.teacher || 'N/A'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000', padding: '6px' }}>N/A</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* COMMENTS */}
      <div className="mt-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <p>{student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>
          Name: {student.comments?.class_teacher_name || '__________'} |
          {' '}Signature: {student.comments?.class_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.class_teacher_date || '__________'}
        </p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <p>{student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>
          Name: {student.comments?.head_teacher_name || '__________'} |
          {' '}Signature: {student.comments?.head_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.head_teacher_date || '__________'}
        </p>
      </div>

      <p className="mt-3 text-[11pt]"><strong>Next Term Begins:</strong> {student?.nextTermBegins || '______________________'}</p>

      {/* Grading system & descriptions */}
      <div className="mt-3">
        <h3 className="text-[11pt] font-semibold">Grading System</h3>
        <ul className="list-disc ml-6 text-[10pt]">
          <li>A (80–100)</li>
          <li>B (70–79)</li>
          <li>C (50–69)</li>
          <li>D (40–49)</li>
          <li>E (0–39)</li>
        </ul>
        <h3 className="text-[11pt] font-semibold mt-2">Grade Descriptions</h3>
        <p className="text-[10pt]">A: Excellent mastery and application of concepts.</p>
        <p className="text-[10pt]">B: Very good understanding with minor gaps.</p>
        <p className="text-[10pt]">C: Satisfactory performance with notable room for improvement.</p>
        <p className="text-[10pt]">D: Below average; needs significant improvement.</p>
        <p className="text-[10pt]">E: Poor performance; urgent intervention required.</p>
      </div>

      {/* FOOTER */}
      <div className="text-center text-[9pt] mt-4">
        Printed from: Edusat ERP | 0700274249 — Page X of Y — School Motto: '{school?.motto || 'Education the Future'}'
      </div>
    </div>
  );
}
