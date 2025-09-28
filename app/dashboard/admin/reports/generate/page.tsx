"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

// A4 Print Styles
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 15mm;
    }
    
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .print-break {
      page-break-before: always;
    }
    
    .print-avoid-break {
      page-break-inside: avoid;
    }
    
    .print-keep-together {
      page-break-inside: avoid;
    }
  }
`;
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
import ImageUpload from "@/src/components/ImageUpload";
import { CompressionResult } from "@/src/lib/imageCompression";

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDOCX, setDownloadingDOCX] = useState(false);
  const [downloadingClassPDF, setDownloadingClassPDF] = useState(false);
  const [downloadingClassDOCX, setDownloadingClassDOCX] = useState(false);
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [showStudentSuggestions, setShowStudentSuggestions] = useState<boolean>(false);
  
  // Header customization state
  const [customHeader, setCustomHeader] = useState({
    schoolName: '',
    motto: '',
    phone: '',
    email: '',
    address: '',
    logo: null as File | null,
    logoPreview: null as string | null
  });
  const [showHeaderCustomization, setShowHeaderCustomization] = useState(false);

  // Debug template selection changes
  useEffect(() => {
    console.log('selectedTemplate state changed to:', selectedTemplate);
  }, [selectedTemplate]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoCompressionResult, setLogoCompressionResult] = useState<CompressionResult | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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
        
        // Load saved header customizations
        const { data: customizations } = await supabase
          .from('school_report_customizations')
          .select('*')
          .eq('school_id', u.school_id)
          .single();

        // Initialize custom header with saved customizations or school defaults
        setCustomHeader({
          schoolName: customizations?.custom_school_name || school?.name || '',
          motto: customizations?.custom_motto || school?.motto || '',
          phone: customizations?.custom_phone || school?.phone || '',
          email: customizations?.custom_email || school?.email || '',
          address: customizations?.custom_address || school?.address || '',
          logo: null,
          logoPreview: customizations?.logo_url || null
        });
        
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

      // Fetch student profile photos
      const { data: studentPhotos } = await supabase
        .from('student_photos')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_primary', true)
        .in('student_id', targetStudents.map(s => s.student_id));

      const referenceExamSet = [...(examSets || [])]
        .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime())[0];

      const reportData = {
        school: {
          ...schoolInfo,
          name: customHeader.schoolName || schoolInfo?.name,
          motto: customHeader.motto || schoolInfo?.motto,
          phone: customHeader.phone || schoolInfo?.phone,
          email: customHeader.email || schoolInfo?.email,
          address: customHeader.address || schoolInfo?.address,
          logo: customHeader.logoPreview
        },
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
          const studentPhoto = studentPhotos?.find(p => p.student_id === student.student_id);
          
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
            profile_photo: studentPhoto?.photo_url || null,
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
    
    setDownloadingDOCX(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'single',
          template: selectedTemplate
        })
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const student = reportData.students[0];
      a.download = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingDOCX(false);
    }
  };

  const downloadSingleReportPDF = async () => {
    if (!reportData || reportData.students.length === 0) return;
    
    setDownloadingPDF(true);
    setError(null);
    
    console.log('=== FRONTEND TEMPLATE DEBUG ===');
    console.log('Selected template:', selectedTemplate);
    console.log('Template type:', typeof selectedTemplate);
    console.log('Template === "template1":', selectedTemplate === 'template1');
    console.log('Template === "template2":', selectedTemplate === 'template2');
    console.log('Template === "template3":', selectedTemplate === 'template3');
    console.log('Student class:', reportData.students[0]?.current_class);
    console.log('Is O-Level class:', isOLevelClass(reportData.students[0]?.current_class));
    console.log('=== END FRONTEND DEBUG ===');
    
    try {
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'single',
          template: selectedTemplate
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const student = reportData.students[0];
      a.download = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download PDF report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const downloadClassReports = async () => {
    if (!reportData || reportData.students.length === 0) return;
    
    setDownloadingClassDOCX(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'class',
          template: selectedTemplate
        })
      });

      if (!response.ok) throw new Error('Failed to generate documents');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClass}_Reports_${reportData.examSet.name}.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download reports: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingClassDOCX(false);
    }
  };

  const downloadClassReportsPDF = async () => {
    if (!reportData || reportData.students.length === 0) return;
    
    setDownloadingClassPDF(true);
    setError(null);
    
    console.log('=== CLASS PDF TEMPLATE DEBUG ===');
    console.log('Selected template for class reports:', selectedTemplate);
    console.log('Template type:', typeof selectedTemplate);
    console.log('=== END CLASS DEBUG ===');
    
    try {
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          type: 'class',
          template: selectedTemplate
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF documents');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClass}_Reports_${reportData.examSet.name}.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download PDF reports: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingClassPDF(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  // Header customization handlers
  const handleHeaderChange = (field: string, value: string) => {
    setCustomHeader(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomHeader(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const resetHeaderToDefault = async () => {
    if (!schoolId) return;
    
    try {
      // Delete saved customizations from database
      await supabase
        .from('school_report_customizations')
        .delete()
        .eq('school_id', schoolId);

      // Reset to school defaults
      setCustomHeader({
        schoolName: schoolInfo?.name || '',
        motto: schoolInfo?.motto || '',
        phone: schoolInfo?.phone || '',
        email: schoolInfo?.email || '',
        address: schoolInfo?.address || '',
        logo: null,
        logoPreview: null
      });
      setLogoFile(null);
      setLogoCompressionResult(null);
      setLogoUploadError(null);
      
      alert('Header reset to default school information');
    } catch (error) {
      alert(`Failed to reset header: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveHeaderCustomization = async () => {
    if (!schoolId) return;

    try {
      // Save header customizations to database
      const { error: customError } = await supabase
        .from('school_report_customizations')
        .upsert({
          school_id: schoolId,
          custom_school_name: customHeader.schoolName || null,
          custom_motto: customHeader.motto || null,
          custom_phone: customHeader.phone || null,
          custom_email: customHeader.email || null,
          custom_address: customHeader.address || null,
          logo_url: customHeader.logoPreview || null,
          logo_filename: logoFile?.name || null
        }, {
          onConflict: 'school_id'
        });

      if (customError) {
        setError(`Failed to save header customization: ${customError.message}`);
        return;
      }

      // Upload logo if provided
      if (logoFile && schoolId) {
        try {
          const filePath = `${schoolId}/logo.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('school-logos')
            .upload(filePath, logoFile, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            setError(`Failed to upload logo: ${uploadError.message}`);
            return;
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('school-logos')
            .getPublicUrl(filePath);

          // Update the customization with the logo URL
          await supabase
            .from('school_report_customizations')
            .update({ logo_url: urlData.publicUrl })
            .eq('school_id', schoolId);

          setCustomHeader(prev => ({ ...prev, logoPreview: urlData.publicUrl }));
        } catch (logoError) {
          setError(`Failed to process logo: ${logoError instanceof Error ? logoError.message : 'Unknown error'}`);
          return;
        }
      }

      setShowHeaderCustomization(false);
      alert('Header customization saved successfully! It will be remembered for future reports.');
    } catch (error) {
      setError(`Failed to save customization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Student Report Generator</h1>
            <p className="text-white/80 text-sm mt-1">Generate and download student academic reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHeaderCustomization(!showHeaderCustomization)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              {showHeaderCustomization ? 'Hide' : 'Customize'} Header
            </button>
            <button
              onClick={() => router.push('/dashboard/admin/reports')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Reports
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        {/* Header Customization Section */}
        {showHeaderCustomization && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-6"
          >
            <h2 className="text-white text-lg font-medium mb-4">Customize Report Header</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* School Information */}
              <div className="space-y-4">
                <h3 className="text-white/80 text-sm font-medium">School Information</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={customHeader.schoolName}
                    onChange={(e) => handleHeaderChange('schoolName', e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter school name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    School Motto
                  </label>
                  <input
                    type="text"
                    value={customHeader.motto}
                    onChange={(e) => handleHeaderChange('motto', e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter school motto"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Address
                  </label>
                  <textarea
                    value={customHeader.address}
                    onChange={(e) => handleHeaderChange('address', e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter school address"
                    rows={3}
                  />
                </div>
              </div>

              {/* Contact Information & Logo */}
              <div className="space-y-4">
                <h3 className="text-white/80 text-sm font-medium">Contact Information & Logo</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customHeader.phone}
                    onChange={(e) => handleHeaderChange('phone', e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customHeader.email}
                    onChange={(e) => handleHeaderChange('email', e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    School Logo
                  </label>
                  <ImageUpload
                    onImageSelect={(file, result) => {
                      setLogoFile(file);
                      setLogoCompressionResult(result);
                      setLogoUploadError(null);
                      setCustomHeader(prev => ({ 
                        ...prev, 
                        logoPreview: URL.createObjectURL(file) 
                      }));
                    }}
                    onError={(error) => {
                      setLogoUploadError(error);
                      setLogoFile(null);
                      setLogoCompressionResult(null);
                    }}
                    maxSizeKB={500}
                    maxWidth={200}
                    maxHeight={200}
                    placeholder="Upload school logo"
                    className="text-white"
                  />
                  {logoUploadError && (
                    <div className="mt-2 text-red-300 text-sm">{logoUploadError}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={resetHeaderToDefault}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white"
              >
                Reset to Default
              </button>
              <button
                onClick={saveHeaderCustomization}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}

        {/* Report Generation Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-6"
        >
          <h2 className="text-white text-lg font-medium mb-4">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Template Selection - Only show for O-Level classes (Senior 1-4) */}
            {isOLevelClass(selectedClass) && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Report Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    console.log('Template selection changed to:', e.target.value);
                    setSelectedTemplate(e.target.value as 'template1' | 'template2' | 'template3');
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="text-black" value="template1">Template 1 - O-Level Format</option>
                  <option className="text-black" value="template2">Template 2 - St. Adrian Kasozi Format</option>
                  <option className="text-black" value="template3">Template 3 - Kyotera Parents Format</option>
                </select>
              </div>
            )}
            
            {/* Debug info for template selection */}
            <div className="text-white/50 text-xs">
              Debug: selectedClass="{selectedClass}", isOLevel={isOLevelClass(selectedClass).toString()}, selectedTemplate="{selectedTemplate}"
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
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadSingleReport}
                    disabled={downloadingDOCX || downloadingPDF || downloadingClassDOCX || downloadingClassPDF}
                    className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                  >
                    {downloadingDOCX && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {downloadingDOCX ? 'Processing...' : 'Download as DOC (Single)'}
                  </button>
                  
                  <button
                    onClick={downloadSingleReportPDF}
                    disabled={downloadingDOCX || downloadingPDF || downloadingClassDOCX || downloadingClassPDF}
                    className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                  >
                    {downloadingPDF && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {downloadingPDF ? 'Processing...' : 'Download as PDF (Single)'}
                  </button>
                  
                  {reportType === 'class' && (
                    <>
                      <button
                        onClick={downloadClassReports}
                        disabled={downloadingDOCX || downloadingPDF || downloadingClassDOCX || downloadingClassPDF}
                        className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                      >
                        {downloadingClassDOCX && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {downloadingClassDOCX ? 'Processing...' : 'Download All as DOC (Class)'}
                      </button>
                      
                      <button
                        onClick={downloadClassReportsPDF}
                        disabled={downloadingDOCX || downloadingPDF || downloadingClassDOCX || downloadingClassPDF}
                        className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                      >
                        {downloadingClassPDF && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {downloadingClassPDF ? 'Processing...' : 'Download All as PDF (Class)'}
                      </button>
                    </>
                  )}
                </div>
                
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-medium">Report Preview</h2>
              <div className="text-white/70 text-sm">
                Template: {selectedTemplate === 'template1' ? 'O-Level Format' : 
                          selectedTemplate === 'template2' ? 'St. Adrian Kasozi Format' : 
                          selectedTemplate === 'template3' ? 'Kyotera Parents Format' : 'Default'}
              </div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[80vh]">
              <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
            {reportData.students.map((student: any, index: number) => (
                  <div key={student.student_id} className={index > 0 ? 'mt-8' : ''}>
                <ReportPreview 
                  student={student} 
                  examSet={reportData.examSet} 
                  school={reportData.school}
                  template={selectedTemplate}
                />
              </div>
            ))}
              </div>
            </div>
            
            <div className="mt-4 text-white/70 text-sm text-center">
              This preview shows exactly how the PDF will look when downloaded
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}

// Helpers
function isSecondaryClass(className: string): boolean {
  if (!className) return false;
  return /^S\d/i.test(className.trim());
}

function isOLevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  // O-Level classes: Senior 1 - Senior 4 (S1-S4)
  // Matches variants like: "Senior 1", "Senior1", "S1", "S 1", case-insensitive, and allows suffix like streams
  return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
}

// Report Preview Component
function ReportPreview({ student, examSet, school, template }: { student: any; examSet: any; school: any; template: string }) {
  if (isOLevelClass(student.current_class)) {
    switch (template) {
      case 'template1':
        return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
      case 'template2':
        return <Template2KasoziReport student={student} examSet={examSet} school={school} />;
      case 'template3':
        return <Template3KyoteraReport student={student} examSet={examSet} school={school} />;
      default:
        return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
    }
  }
  return <SecondaryReportPreview student={student} examSet={examSet} school={school} />;
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

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  return (
    <div style={{ 
      fontFamily: 'Times New Roman, Arial, sans-serif',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '15mm',
      boxSizing: 'border-box'
    }} className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full">
      
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER - School Logo and Info Side by Side */}
      <div className="flex items-start justify-between mb-4">
        {/* School Logo - Left side */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0">
          {school?.logo ? (
            <img
              src={school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">EMIRATES</div>
              <div className="font-bold">COLLEGE</div>
              <div className="font-bold">SCHOOL</div>
            </div>
          )}
        </div>
        
        {/* School Info - Right side */}
        <div className="text-center flex-1">
          <div className="font-bold text-[18pt] uppercase">{school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div className="font-bold text-[11pt] mt-1">TEL :: {school?.phone || '0701395594'} | EMAIL :: {school?.email || 'info@emiratescollege.sc.ug'} | {school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div className="font-bold text-[11pt] mt-1 italic">SCHOOL MOTTO: {school?.motto || 'Education the Future'}</div>
        </div>
      </div>
        
      {/* REPORT TITLE */}
      <div className="text-center bg-green-600 text-white py-2 mb-4">
        <h1 className="text-[13pt] font-bold uppercase">
          LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || '2'}, {examSet?.year || '2025'}
        </h1>
      </div>

      {/* Student Info and Photo - Side by side */}
      <div className="flex justify-between items-start mb-4">
        {/* LEARNER INFO - Left side */}
        <div className="text-[11pt]">
          <div><strong>LNo.:</strong> {student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> {student.name}</div>
          <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
        </div>
        
        {/* Student Photo - Right side */}
        <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
          {student.profile_photo ? (
            <img
              src={student.profile_photo}
              alt="Student Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-500">Photo</div>
          )}
        </div>
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
              // Use proper O-Level data structure
              const activity = result.activity_score ?? '';
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || calculateDescriptor(activityNum);
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const finalNum = parseFloat(finalScore) || 0;
              const gradeText = result.grade || calculateGrade(finalNum);
              const overallRemark = result.overall_remark ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>
                    <div className="font-bold">{result.subject}</div>
                    <div className="text-[9pt] leading-snug mt-1">
                      {topic}
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
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '{school?.motto || 'Education the Future'}'</div>
      </div>
    </div>
  );
}

// Template 2 - St. Adrian Kasozi Secondary School Format
function Template2KasoziReport({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  // Calculate level of achievement based on grade (Template 2 specific)
  const getLevelOfAchievement = (grade: string) => {
    switch (grade) {
      case 'A': return '2.8';
      case 'B': return '2.2';
      case 'C': return '2.0';
      case 'D': return '1.5';
      case 'E': return '1.2';
      default: return '';
    }
  };

  // Get descriptor based on level of achievement (Template 2 specific)
  const getDescriptor = (level: string) => {
    const num = parseFloat(level);
    if (num >= 2.5) return 'Outstanding';
    if (num >= 1.5) return 'Moderate';
    if (num >= 0.9) return 'Basic';
    return '';
  };

  return (
    <div style={{ 
      fontFamily: 'Times New Roman, Arial, sans-serif',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '15mm',
      boxSizing: 'border-box'
    }} className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full">
      
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        {/* School Logo */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0 flex-shrink-0">
          {school?.logo ? (
            <img
              src={school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">ST. ADRIAN</div>
              <div className="font-bold">KASOZI</div>
              <div className="font-bold">SECONDARY</div>
              <div className="font-bold">SCHOOL</div>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="text-right flex-1">
        <div className="font-bold text-[18pt] uppercase">{school?.name || 'ST. ADRIAN KASOZI SECONDARY SCHOOL'}</div>
        <div className="text-[10pt] mt-1 italic">"{school?.motto || 'WITH GOD, WE CAN'}"</div>
        <div className="text-[9pt] mt-1">
          P.O BOX 10 KALISIZO (U), {school?.email || 'st.adriankasozisec@gmail.com'}, {school?.phone || '0772/754-642058'}
          </div>
        </div>
      </div>

      {/* REPORT TITLE */}
      <div className="text-center mb-4">
        <h1 className="text-[14pt] font-bold uppercase">O LEVEL TERMLY REPORT</h1>
      </div>

      {/* STUDENT INFO */}
      <div className="mb-6 text-[11pt]">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Report Number:</strong> {student.admission_number || student.student_id}</div>
            <div><strong>Term:</strong> {examSet?.term || 'THREE'}</div>
            <div><strong>Name:</strong> {student.name}</div>
            <div><strong>Year:</strong> {examSet?.year || '2022'}</div>
            <div><strong>Class:</strong> {student.current_class}</div>
          </div>
          
          {/* Student Photo */}
          <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
            {student.profile_photo ? (
              <img
                src={student.profile_photo}
                alt="Student Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-gray-500">Photo</div>
            )}
          </div>
        </div>
      </div>

      {/* SUBJECTS TABLE */}
      <div className="mb-4">
        <h3 className="text-[12pt] font-bold mb-2">Learner's End of Year Summative Assessment Results {examSet?.year || '2022'}</h3>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr>
              {['Subject', 'Formative Score (20%)', 'EOY Summative Assessment (80%)', 'Total (100%)', 'Grade', 'Level of Achievement/3', 'Descriptor', "TR's Initial"].map(h => (
                <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '4px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student.results.length > 0 ? (
              student.results.map((result: any, index: number) => {
                // Use proper O-Level data structure
                const formative = result.formative_score ?? '';
                const exam = result.exam_score ?? '';
                const finalScore = result.final_score ?? '';
                const finalNum = parseFloat(finalScore) || 0;
                const gradeText = result.grade || calculateGrade(finalNum);
                const levelOfAchievement = getLevelOfAchievement(gradeText);
                const descriptor = getDescriptor(levelOfAchievement);
                const teacherInitials = result.teacher_initials ?? '';
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{result.subject}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{formative}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{exam}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{finalScore}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{gradeText}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{levelOfAchievement}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{descriptor}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{teacherInitials}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* OVERALL SUMMARY */}
      <div className="mb-4 text-[11pt]">
        <div className="flex items-center gap-4">
          <div><strong>Overall Average:</strong> {avg}</div>
          <div><strong>Level of Achievement:</strong> 2</div>
          <div><strong>Descriptor:</strong> Moderate</div>
          <div className="text-[10pt] italic">Overall Learner's achievements for the subjects attended</div>
        </div>
      </div>

      {/* KEY TO TERMS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-bold mb-2">Key to Terms Used:</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>Blank/Absent:</strong> Learner does not do the subject/was absent.</li>
          <li><strong>0.9-1.49 (Basic):</strong> Few learning outcomes achieved but not sufficient for overall learning achievement.</li>
          <li><strong>1.5-2.48 (Moderate):</strong> Many learning outcomes achieved, enough for overall learning achievement.</li>
          <li><strong>2.5-3.00 (Outstanding):</strong> Most or all learning outcomes achieved.</li>
        </ul>
      </div>

      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Teacher's Comments</h3>
        <div className="mb-3">
          <p><strong>Class Teacher's Comment:</strong> {student.comments?.class_teacher_text || 'Can do even better.'}</p>
          <p className="mt-1">Signature: {student.comments?.class_teacher_signature || '__________'}</p>
        </div>
        
        <div className="mb-3">
          <p><strong>Head Teacher's Comment:</strong> {student.comments?.head_teacher_text || 'More concentration needed'}</p>
          <p className="mt-1">Signature: {student.comments?.head_teacher_signature || '__________'}</p>
        </div>
      </div>

      {/* NEXT TERM INFO */}
      <div className="mb-4 text-[10pt]">
        <div className="flex gap-4">
          <div><strong>Next Term Begins:</strong> {student?.nextTermBegins || '6TH FEBRUARY 2023'}</div>
          <div><strong>Ends On:</strong> __________</div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="text-center text-[9pt] mt-4">
        <p><strong>Disclaimer:</strong> "This report is not valid without a school stamp."</p>
      </div>

      {/* SCHOOL STAMP PLACEHOLDER */}
      <div className="flex justify-end mt-4">
        <div className="w-20 h-20 border-2 border-blue-500 rounded-full flex items-center justify-center bg-blue-50">
          <div className="text-center text-xs text-blue-700">
            <div className="font-bold">ST. ADRIAN</div>
            <div className="font-bold">KASOZI</div>
            <div className="font-bold">SECONDARY</div>
            <div className="font-bold">SCHOOL</div>
            <div className="mt-1 text-[8pt]">HEAD TEACHER</div>
            <div className="text-[7pt]">24/01/2023</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template 3 - Kyotera Parents' Secondary School Format
function Template3KyoteraReport({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  // Calculate identifier based on grade/score (Template 3 specific)
  const getIdentifier = (score: number) => {
    if (score >= 80) return '3'; // Accomplished
    if (score >= 60) return '2'; // Moderate
    if (score >= 50) return '1'; // Basic
    return ''; // Blank for absent
  };

  // Get grade based on score (Template 3 specific)
  const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
  };

  return (
    <div style={{ 
      fontFamily: 'Times New Roman, Arial, sans-serif',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '15mm',
      boxSizing: 'border-box'
    }} className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full">
      
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        {/* School Logo */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0 flex-shrink-0">
          {school?.logo ? (
            <img
              src={school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">KYOTERA</div>
              <div className="font-bold">PARENTS'</div>
              <div className="font-bold">SECONDARY</div>
              <div className="font-bold">SCHOOL</div>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="text-right flex-1">
        <div className="font-bold text-[18pt] uppercase">{school?.name || 'KYOTERA PARENTS\' SECONDARY SCHOOL'}</div>
          <div className="font-bold text-[13pt] mt-1">
          {school?.address || 'P.O.BOX 11, Kyotera- Uganda'} | 
          Tel: {school?.phone || '0701861636 / 0700338061'} | 
          E-mail: {school?.email || 'kasumbaj2009@gmail.com'}
        </div>
        <div className="text-[12pt] font-bold mt-2 uppercase">END OF TERM ONE STUDENT'S PROGRESSIVE REPORT</div>
        <div className="text-[10pt] mt-1">No. {student.admission_number || student.student_id}</div>
        </div>
      </div>

      {/* STUDENT INFO */}
      <div className="mb-6 text-[11pt]">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>STUDENT'S NAME:</strong> {student.name}</div>
            <div><strong>YEAR:</strong> {examSet?.year || '2025'}</div>
            <div><strong>STREAM:</strong> EAST</div>
            <div><strong>CLASS:</strong> {student.current_class}</div>
            <div><strong>LIN:</strong> __________</div>
            <div><strong>Date:</strong> {examSet?.date || '26/05/2025'}</div>
          </div>
          
          {/* Student Photo */}
          <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
            {student.profile_photo ? (
              <img
                src={student.profile_photo}
                alt="Student Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-gray-500">Photo</div>
            )}
          </div>
        </div>
      </div>

      {/* SUBJECTS TABLE */}
      <div className="mb-4">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr>
              {['SUBJECT', 'C1', 'C2', 'AVG SCORE/20', 'FINAL EXAM/80', 'TOTAL SCORE 100%', 'IDENTIFIER', 'INIT'].map(h => (
                <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '4px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student.results.length > 0 ? (
              student.results.map((result: any, index: number) => {
                // Use proper O-Level data structure
                const activity = result.activity_score ?? '';
                const activityNum = parseFloat(activity) || 0;
                const c1 = activityNum > 0 ? (activityNum * 1.5).toFixed(1) : '';
                const c2 = activityNum > 0 ? (activityNum * 1.2).toFixed(1) : '';
                const avgScore = result.formative_score ?? '';
                const finalExam = result.exam_score ?? '';
                const totalScore = result.final_score ?? '';
                const totalNum = parseFloat(totalScore) || 0;
                const identifier = getIdentifier(totalNum);
                const teacherInitials = result.teacher_initials ?? '';
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{result.subject}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{c1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{c2}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{avgScore}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{finalExam}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{totalScore}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{identifier}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{teacherInitials}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="mb-4 text-[11pt]">
        <div className="flex items-center gap-4">
          <div><strong>AVERAGE SCORE / PTS (OUT OF 20) / IDENTIFIER:</strong> 17</div>
        </div>
        <div className="mt-2">
          <div><strong>Overall Total Score:</strong> {avg}</div>
          <div><strong>Overall Identifier:</strong> 2</div>
          <div><strong>Overall Learner Achievement:</strong> Moderate (Corresponding to Identifier 2)</div>
        </div>
      </div>

      {/* KEY TERMS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-bold mb-2">Key Terms Used / Descriptors:</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>(Blank Identifier):</strong> No Learning outcomes achieved (Learner was absent)</li>
          <li><strong>Identifier 1:</strong> Some LOs achieved but not sufficient for overall achievement (Basic)</li>
          <li><strong>Identifier 2:</strong> Most LOs achieved, enough for overall learning achievement (Moderate)</li>
          <li><strong>Identifier 3:</strong> All LOs achieved, achievement with ease (Accomplished)</li>
          <li><strong>LO = Learning Outcomes</strong></li>
          <li><strong>C1 = Chapter 1 Assessment, etc</strong></li>
        </ul>
      </div>

      {/* GRADING SCALE */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-bold mb-2">Grading Scale:</h3>
        <div className="flex gap-4">
          <span><strong>A:</strong> 80+</span>
          <span><strong>B:</strong> 70+</span>
          <span><strong>C:</strong> 60+</span>
          <span><strong>D:</strong> 50+</span>
          <span><strong>E:</strong> 0-49</span>
        </div>
      </div>

      {/* SIGNATURES */}
      <div className="mb-4 text-[10pt]">
        <div className="flex justify-between">
          <div>
            <p><strong>CLASS TEACHER:</strong> {student.comments?.class_teacher_signature || '__________'}</p>
          </div>
          <div>
            <p><strong>HEAD TEACHER:</strong> {student.comments?.head_teacher_signature || '__________'}</p>
          </div>
        </div>
      </div>

      {/* NEXT TERM AND FEES */}
      <div className="mb-4 text-[10pt]">
        <div className="flex justify-between">
          <div><strong>NEXT TERM BEGINS ON:</strong> {student?.nextTermBegins || '26/05/2025'}</div>
          <div><strong>Fees Balance:</strong> Ugx 0</div>
        </div>
      </div>

      {/* SCHOOL STAMP */}
      <div className="flex justify-end mt-4">
        <div className="w-20 h-20 border-2 border-blue-500 rounded-full flex items-center justify-center bg-blue-50">
          <div className="text-center text-xs text-blue-700">
            <div className="font-bold">HEADTEACHER</div>
            <div className="font-bold">KYOTERA</div>
            <div className="font-bold">PARENTS'</div>
            <div className="font-bold">SCHOOL</div>
            <div className="mt-1 text-[8pt]">02 MAY 2025</div>
            <div className="text-[7pt]">P.O. BOX 11 KYOTERA</div>
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
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        {/* School Logo */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0 flex-shrink-0">
          {school?.logo ? (
            <img
              src={school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">SCHOOL</div>
              <div className="font-bold">LOGO</div>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="text-right flex-1">
          <div className="font-bold text-[18pt] uppercase">{school?.name || 'School Name'}</div>
          <div className="font-bold text-[11pt] mt-0.5">TEL: {school?.phone || 'Phone'} | EMAIL: {school?.email || 'Email'} | {school?.address || 'Address'}</div>
          <div className="font-bold text-[11pt] mt-0.5 italic">SCHOOL MOTTO: {school?.motto || 'Education the Future'}</div>
        </div>
      </div>

      {/* TITLE */}
      <h1 className="text-center text-[13pt] font-bold my-3 uppercase">
        LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || ''}, {examSet?.year || ''}
      </h1>

      {/* META */}
      <div className="my-2 flex justify-between items-start">
        <div className="flex flex-wrap gap-5 text-[11pt]">
          <div><strong>LNo.</strong> {student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> {student.name}</div>
          <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
        </div>
        
        {/* Student Photo */}
        <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
          {student.profile_photo ? (
            <img
              src={student.profile_photo}
              alt="Student Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-500">Photo</div>
          )}
        </div>
      </div>


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
        Printed from: Pwezacore — School Motto: '{school?.motto || 'Education the Future'}'
      </div>
    </div>
  );
}

