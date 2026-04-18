"use client";

/**
 * @deprecated Report generation has moved to the SPA snapshot-based UI.
 * Use /dashboard/admin/reports/snapshots (SnapshotManager) and BulkGenerator instead.
 * This component is kept for reference only.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { resolveCurrentSchoolTerm } from "@/src/lib/adminFinanceTerm";
import { useRouter } from "next/navigation";
import { SecondaryBuiltInHtmlPreview } from "@/src/components/reports/SecondaryBuiltInHtmlPreview";
import { pickSecondaryTemplateRootFields } from "@/src/reports/secondary/buildSecondaryShapedStudent";

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
import { SECONDARY_TEMPLATES, getSecondaryTemplateOptions } from "@/src/templates/secondary";

// Secondary School Report Generator
export function SecondaryReportGenerator() {
  const router = useRouter();
  
  // Load custom templates
  const loadCustomTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setCustomTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  // Load class template settings
  const loadClassTemplateSettings = async () => {
    try {
      const response = await fetch('/api/class-template-settings');
      if (response.ok) {
        const data = await response.json();
        setClassTemplateSettings(data.settings || []);
      }
    } catch (error) {
      console.error('Error loading class template settings:', error);
    }
  };

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [examSets, setExamSets] = useState<any[]>([]);
  const [allTermsList, setAllTermsList] = useState<{ term: number; year: number }[]>([]);
  const [selectedTermKey, setSelectedTermKey] = useState<string>('');
  const [currentTermInfo, setCurrentTermInfo] = useState<{ year: number; term: number } | null>(null);
  const [nextTermInfo, setNextTermInfo] = useState<{ year: number; term: number } | null>(null);
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('all');
  const [reportTitleSettings, setReportTitleSettings] = useState<{ title_template: string; use_dynamic_term: boolean } | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate report title based on settings
  const getReportTitle = () => {
    try {
      if (!reportTitleSettings) {
        return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
      }
      
      let title = reportTitleSettings.title_template || 'STUDENT\'S PROGRESSIVE REPORT OF TERM {term}';
      
      if (reportTitleSettings.use_dynamic_term && currentTermInfo?.term) {
        title = title.replace('{term}', currentTermInfo.term.toString());
      }
      
      return title.toUpperCase();
    } catch (error) {
      console.warn('Error generating report title:', error);
      return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
    }
  };
  
  // Form state (exam set selection removed; we aggregate all sets in current term)
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [selectedTemplate, setSelectedTemplate] = useState<'template1' | 'template2' | 'template3' | string>('template1');
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [classTemplateSettings, setClassTemplateSettings] = useState<any[]>([]);
  const [showClassTemplateSettings, setShowClassTemplateSettings] = useState(false);
  
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
          .maybeSingle();

        // Load custom templates and class template settings
        await loadCustomTemplates();
        await loadClassTemplateSettings();
        
        // Load report title settings
        try {
          const { data: titleSettings } = await supabase
            .from('report_title_settings')
            .select('title_template, use_dynamic_term')
            .eq('school_id', u.school_id)
            .maybeSingle();
          setReportTitleSettings(titleSettings);
        } catch (error) {
          console.warn('Could not load report title settings:', error);
          setReportTitleSettings(null);
        }

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
        
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('*')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const engineTerm = await resolveCurrentSchoolTerm(supabase, u.school_id, todayStr);
        
        let detectedCurrentYear = new Date().getFullYear();
        let detectedCurrentTerm = 1;
        
        if (engineTerm?.year != null && engineTerm.term != null) {
          detectedCurrentYear = engineTerm.year;
          detectedCurrentTerm = engineTerm.term;
          setCurrentTermInfo({ year: engineTerm.year, term: engineTerm.term });
          setSelectedTermKey(`${engineTerm.term}-${engineTerm.year}`);
        } else {
          // Fallback: guess based on current month
          const month = new Date().getMonth() + 1;
          detectedCurrentTerm = month <= 4 ? 1 : month <= 7 ? 2 : 3;
          setCurrentTermInfo({ year: detectedCurrentYear, term: detectedCurrentTerm });
          setSelectedTermKey(`${detectedCurrentTerm}-${detectedCurrentYear}`);
        }
        
        // All terms (current + older) for term selector
        const termOptions = (allTerms || []).map((t: any) => ({ term: t.term, year: t.year }))
          .sort((a: { term: number; year: number }, b: { term: number; year: number }) => (b.year !== a.year ? b.year - a.year : b.term - a.term));
        setAllTermsList(termOptions.length > 0 ? termOptions : [{ term: detectedCurrentTerm, year: detectedCurrentYear }]);
        
        // Calculate next term
        let nextYear = detectedCurrentYear;
        let nextTerm = detectedCurrentTerm + 1;
        if (nextTerm > 3) {
          nextTerm = 1;
          nextYear = detectedCurrentYear + 1;
        }
        setNextTermInfo({ year: nextYear, term: nextTerm });

        // Load exam sets that have results (all terms, so user can select older terms)
        let examSetsWithResultsQuery = supabase
          .from('exam_results')
          .select('exam_set_id')
          .eq('school_id', u.school_id);
        
        const { data: examResultsData } = await examSetsWithResultsQuery;
        
        const examSetIdsWithResults = [...new Set((examResultsData || []).map(r => r.exam_set_id))];
        
        if (examSetIdsWithResults.length > 0) {
          const examSetsQuery = supabase
            .from('exam_sets')
            .select('*')
            .eq('school_id', u.school_id)
            .eq('is_active', true)
            .in('id', examSetIdsWithResults);
          const { data: examSetsData } = await examSetsQuery.order('name', { ascending: true });
          setExamSets(examSetsData || []);
        } else {
          setExamSets([]);
        }

        // Load next term begins date from school_terms table
        let nextTermQuery = supabase
          .from('school_terms')
          .select('start_date')
          .eq('school_id', u.school_id);
        if (nextYear != null && nextTerm != null) {
          nextTermQuery = nextTermQuery.eq('year', nextYear).eq('term', nextTerm);
        }
        const { data: nextTermData } = await nextTermQuery.maybeSingle();
        
        // Next term data is now handled automatically via database trigger
        
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

  // Auto-select template based on class-specific settings
  useEffect(() => {
    if (selectedClass && classTemplateSettings.length > 0) {
      const classSetting = classTemplateSettings.find(s => s.class_name === selectedClass);
      if (classSetting) {
        // Check if it's a custom template or default template
        if (classSetting.template_id.startsWith('template')) {
          setSelectedTemplate(classSetting.template_id);
        } else {
          setSelectedTemplate(`custom_${classSetting.template_id}`);
        }
      }
    }
  }, [selectedClass, classTemplateSettings]);

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

      // Fetch exam results for either all sets in the term or a specific selected set
      let examResultsQuery = supabase
        .from('exam_results')
        .select(`
          *,
          exam_sets!inner(*)
        `)
        .eq('school_id', schoolId)
        .in('student_id', targetStudents.map(s => s.student_id));

      if (selectedExamSetId && selectedExamSetId !== 'all') {
        examResultsQuery = examResultsQuery.eq('exam_set_id', selectedExamSetId);
      } else {
        examResultsQuery = examResultsQuery.in('exam_set_id', (examSets || []).map(es => es.id));
      }

      const { data: examResults } = await examResultsQuery;

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

      const referenceExamSet = (selectedExamSetId && selectedExamSetId !== 'all')
        ? (examSets || []).find(es => es.id === selectedExamSetId)
        : [...(examSets || [])]
        .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime())[0];

      // Load class teacher name and comment rules for selected class
      let classTeacherName: string | null = null;
      try {
        const classSetting = classTemplateSettings.find((s:any) => s.class_name === (selectedClass || targetStudents[0].current_class));
        if (classSetting?.class_teacher_id) {
          const { data: tname } = await supabase
            .from('teachers')
            .select('name')
            .eq('teacher_id', classSetting.class_teacher_id)
            .maybeSingle();
          classTeacherName = tname?.name || null;
        }
      } catch {}

      let commentRules: Array<{ min_avg: number; max_avg: number; comment: string }> = [];
      try {
        const { data: rules } = await supabase
          .from('teacher_comment_rules')
          .select('min_avg,max_avg,comment')
          .eq('school_id', schoolId)
          .eq('class_name', targetStudents[0].current_class)
          .order('min_avg');
        commentRules = rules || [];
      } catch {}

      const reportData = {
        school: {
          ...schoolInfo,
          name: customHeader.schoolName || schoolInfo?.name,
          motto: customHeader.motto || schoolInfo?.motto,
          phone: customHeader.phone || schoolInfo?.phone,
          email: customHeader.email || schoolInfo?.email,
          address: customHeader.address || schoolInfo?.address,
          logo: customHeader.logoPreview || schoolInfo?.logo_url,
          logo_url: customHeader.logoPreview || schoolInfo?.logo_url
        },
        examSet: (() => {
          if (!currentTermInfo) return null;
          if (selectedExamSetId && selectedExamSetId !== 'all') {
            const sel = (examSets || []).find(es => es.id === selectedExamSetId);
            return sel ? { year: sel.year, term: sel.term, name: sel.name || `Exam Set ${sel.term}/${sel.year}` } : { year: currentTermInfo.year, term: currentTermInfo.term, name: 'Selected Exam Set' };
          }
          return { year: currentTermInfo.year, term: currentTermInfo.term, name: 'All Exam Sets' };
        })(),
        students: targetStudents.map(student => {
          const studentResults = examResults?.filter(er => er.student_id === student.student_id) || [];
          const studentAttendance = attendanceData?.filter(a => a.student_id === student.student_id) || [];
          const studentFees = feesData?.filter(f => f.student_id === student.student_id) || [];
          const studentProjects = projectsData.filter(p => p.student_id === student.student_id);
          const normCommentType = (t: unknown) => String(t || '').toLowerCase().replace(/\s+/g, '_');
          const classTeacherRows = commentsData
            .filter((c) => {
              if (c.student_id !== student.student_id) return false;
              const ty = normCommentType(c.comment_type);
              return ty === 'class_teacher' || ty === 'class_teacher_comment';
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const savedClassTeacherFromReport = String(classTeacherRows[0]?.comment_text || '').trim();
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

          // Fallback when no per-student comment: teacher_comment_rules (avg bands)
          const teacherComment = (() => {
            const avg = average != null ? Math.max(0, Math.min(100, average)) : null;
            if (avg == null || commentRules.length === 0) return '';
            const rule = commentRules.find(r => avg >= Number(r.min_avg) && avg <= Number(r.max_avg));
            return rule?.comment || '';
          })();

          return {
            ...student,
            results: studentResults,
            attendance: studentAttendance,
            fees: studentFees,
            projects: studentProjects,
            comments: {
              ...studentComments,
              class_teacher_name: classTeacherName || (studentComments?.class_teacher_name || ''),
              class_teacher_text:
                savedClassTeacherFromReport ||
                String(studentComments?.class_teacher_text || '').trim() ||
                teacherComment ||
                '',
            },
            profile_photo: studentPhoto?.photo_url || null,
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
            {/* Customize Report Card button removed */}
            <button
              onClick={() => setShowClassTemplateSettings(!showClassTemplateSettings)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
            >
              {showClassTemplateSettings ? 'Hide' : 'Class Template'} Settings
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

        {/* Class Template Settings */}
        {showClassTemplateSettings && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-6"
          >
            <h2 className="text-white text-lg font-medium mb-4">Class Template Settings</h2>
            <p className="text-white/70 text-sm mb-6">Configure which template to use for each class. This allows different classes to use different report card designs.</p>
            
            <div className="space-y-4">
              {classes.map((className) => {
                const currentSetting = classTemplateSettings.find(s => s.class_name === className);
                const isOLevel = isOLevelClass(className);
                const isALevel = isALevelClass(className);

                return (
                  <div key={className} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <div className="text-white font-medium">{className}</div>
                        <div className="text-white/60 text-sm">
                          {isOLevel ? 'O-Level Class' : isALevel ? 'A-Level Class' : 'Secondary / other'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <select
                        value={currentSetting?.template_id || ''}
                        onChange={async (e) => {
                          const templateId = e.target.value;
                          if (templateId) {
                            try {
                              const response = await fetch('/api/class-template-settings', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  class_name: className,
                                  template_id: templateId,
                                  is_o_level: isOLevel || isALevel
                                }),
                              });
                              
                              if (response.ok) {
                                await loadClassTemplateSettings();
                              }
                            } catch (error) {
                              console.error('Error saving class template setting:', error);
                            }
                          }
                        }}
                        className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                      >
                        <option value="">Select Template</option>
                        <optgroup label="Secondary School Templates">
                          <option value="template1">{SECONDARY_TEMPLATES.template1.name}</option>
                          <option value="template2">{SECONDARY_TEMPLATES.template2.name}</option>
                          <option value="template3">{SECONDARY_TEMPLATES.template3.name}</option>
                        </optgroup>
                        {customTemplates.length > 0 && (
                          <optgroup label="Custom Templates">
                            {customTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      {/* Class Teacher selector */}
                      <select
                        value={currentSetting?.class_teacher_id || ''}
                        onChange={async (e) => {
                          const classTeacherId = e.target.value || null;
                          try {
                            const response = await fetch('/api/class-template-settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                class_name: className,
                                template_id: currentSetting?.template_id || 'template1',
                                is_o_level: isOLevel,
                                class_teacher_id: classTeacherId
                              })
                            });
                            if (response.ok) {
                              await loadClassTemplateSettings();
                            }
                          } catch (error) {
                            console.error('Error saving class teacher:', error);
                          }
                        }}
                        className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                        title="Assign Class Teacher"
                      >
                        <option value="">Select Class Teacher</option>
                        {students
                          .filter(s => !!s.teacher_id) // if students table has teacher_id link, else replace with teachers list later
                          .map(s => (
                            <option key={s.teacher_id} value={s.teacher_id}>
                              {s.teacher_name || s.teacher_id}
                            </option>
                          ))}
                      </select>
                      
                      {currentSetting && (
                        <div className="text-green-400 text-sm">
                          ✓ {currentSetting.template?.name || 'Template Set'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-300 text-sm">
                <strong>💡 Tip:</strong> When a class has a template assigned, it will automatically use that template when generating reports. 
                If no template is assigned, the system will use the default template selection.
              </div>
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
            {/* Template Selection - O-Level (S1–4) and A-Level (S5–6) */}
            {(isOLevelClass(selectedClass) || isALevelClass(selectedClass)) && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Report Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <optgroup label="Secondary School Templates" className="text-black">
                  <option className="text-black" value="template1">{SECONDARY_TEMPLATES.template1.name}</option>
                  <option className="text-black" value="template2">{SECONDARY_TEMPLATES.template2.name}</option>
                  <option className="text-black" value="template3">{SECONDARY_TEMPLATES.template3.name}</option>
                  </optgroup>
                  {customTemplates.length > 0 && (
                    <optgroup label="Custom Templates" className="text-black">
                      {customTemplates.map((template) => (
                        <option key={template.id} className="text-black" value={`custom_${template.id}`}>
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
            

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

            {/* Term selection (current + older terms) */}
            {allTermsList.length > 0 && (
              <div className="mb-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Term</label>
                <select
                  value={selectedTermKey || (currentTermInfo ? `${currentTermInfo.term}-${currentTermInfo.year}` : '')}
                  onChange={(e) => {
                    const key = e.target.value;
                    setSelectedTermKey(key);
                    const [t, y] = key.split('-').map(Number);
                    if (!isNaN(t) && !isNaN(y)) {
                      setCurrentTermInfo({ term: t, year: y });
                      setSelectedExamSetId('all');
                    }
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {allTermsList.map((t) => {
                    const key = `${t.term}-${t.year}`;
                    return (
                      <option className="text-black" key={key} value={key}>
                        Term {t.term}, {t.year}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-white/50">Choose current or older term for reports.</p>
              </div>
            )}
            {/* Exam Set Selection (filtered by selected term) */}
            {examSets && examSets.length > 0 && currentTermInfo && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Exam Set
                </label>
                <select
                  value={selectedExamSetId}
                  onChange={(e) => setSelectedExamSetId(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="text-black" value="all">All Exam Sets (Selected Term)</option>
                  {examSets.filter((es: any) => es.term === currentTermInfo.term && es.year === currentTermInfo.year).map((es) => (
                    <option className="text-black" key={es.id} value={es.id}>
                      {es.name || `Set - Term ${es.term}, ${es.year}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                Template: {selectedTemplate === 'template1' ? SECONDARY_TEMPLATES.template1.name : 
                          selectedTemplate === 'template2' ? SECONDARY_TEMPLATES.template2.name : 
                          selectedTemplate === 'template3' ? SECONDARY_TEMPLATES.template3.name : 
                          selectedTemplate.startsWith('custom_') ? 
                            customTemplates.find(t => t.id === selectedTemplate.replace('custom_', ''))?.name || 'Custom Template' :
                            'Default'}
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
                  reportTitleSettings={reportTitleSettings}
                  currentTermInfo={currentTermInfo}
                  extraTemplateFields={pickSecondaryTemplateRootFields(reportData as Record<string, unknown>)}
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
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(trimmed);
}

function isALevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(trimmed);
}

// Report Preview Component
function ReportPreview({ student, examSet, school, template, reportTitleSettings, currentTermInfo, extraTemplateFields }: { student: any; examSet: any; school: any; template: string; reportTitleSettings: any; currentTermInfo: any; extraTemplateFields?: Record<string, unknown> }) {
  void reportTitleSettings;
  void currentTermInfo;
  if (isOLevelClass(student.current_class) || isALevelClass(student.current_class)) {
    return (
      <SecondaryBuiltInHtmlPreview student={student} examSet={examSet} school={school} templateKey={template} extraTemplateFields={extraTemplateFields} />
    );
  }
  return <SecondaryReportPreview student={student} examSet={examSet} school={school} />;
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
                // Correct Template 2 data mapping as specified
                const subject = result.subject ?? '';
                const formative = result.formative_score ?? ''; // Formative Score [20%]
                const exam = result.exam_score ?? ''; // EOY Summative Assessment (80%)
                const finalScore = result.final_score ?? ''; // Total (100%)
                const grade = result.grade ?? '';
                const levelOfAchievement = result.activity_score ?? ''; // Level of Achievement/3 (Activity Score [3])
                // Provide fallback for descriptor if not available
                const descriptor = result.descriptor ?? (() => {
                  const activityNum = parseFloat(levelOfAchievement) || 0;
                  if (activityNum >= 2.5) return 'Outstanding';
                  if (activityNum >= 1.5) return 'Moderate';
                  if (activityNum >= 0.9) return 'Basic';
                  return '';
                })();
                const teacherInitials = result.teacher_initials ?? ''; // TR's Initial
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{subject}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{formative}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{exam}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{finalScore}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{grade}</td>
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
          <p><strong>Class Teacher's Comment:</strong> {student.comments?.class_teacher_text || '—'}</p>
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
          <div><strong>Next Term Begins:</strong> {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '6TH FEBRUARY 2023'}</div>
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
function Template3KyoteraReport({ student, examSet, school, reportTitleSettings, currentTermInfo }: { student: any; examSet: any; school: any; reportTitleSettings: any; currentTermInfo: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';
  
  // Generate report title based on settings
  const getReportTitle = () => {
    try {
      if (!reportTitleSettings) {
        return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
      }
      
      let title = reportTitleSettings.title_template || 'STUDENT\'S PROGRESSIVE REPORT OF TERM {term}';
      
      if (reportTitleSettings.use_dynamic_term && currentTermInfo?.term) {
        title = title.replace('{term}', currentTermInfo.term.toString());
      }
      
      return title.toUpperCase();
    } catch (error) {
      console.warn('Error generating report title:', error);
      return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
    }
  };

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
              <div className="font-bold">SCHOOL</div>
              <div className="font-bold">LOGO</div>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="text-right flex-1">
        <div className="font-bold text-[18pt] uppercase">{school?.name || ''}</div>
          <div className="font-bold text-[13pt] mt-1">
          {school?.address || 'P.O.BOX 11, Kyotera- Uganda'} | 
          Tel: {school?.phone || '0701861636 / 0700338061'} | 
          E-mail: {school?.email || 'kasumbaj2009@gmail.com'}
        </div>
        <div className="text-[12pt] font-bold mt-2 uppercase">{getReportTitle()}</div>
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
              {(() => {
                const hasC2 = student.results.some((r: any) => r.activity_score_2 !== undefined && r.activity_score_2 !== null && r.activity_score_2 !== '');
                const headers = ['SUBJECT', 'AVG SCORE/20'];
                if (hasC2) headers.push('C2');
                headers.push('FINAL EXAM/80', 'TOTAL SCORE 100%', 'C1', 'IDENTIFIER', 'DESCRIPTOR', 'INIT');
                return headers.map(h => (
                <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '4px' }}>{h}</th>
                ));
              })()}
            </tr>
          </thead>
          <tbody>
            {student.results.length > 0 ? (
              student.results.map((result: any, index: number) => {
                // Correct Template 3 data mapping as specified
                const subject = result.subject ?? '';
                const avgScore = result.formative_score ?? ''; // AVG SCORE/20 (Formative Score [20%])
                const c2 = result.activity_score_2 ?? ''; // C2 (Activity Score [3] of second set of exam)
                const finalExam = result.exam_score ?? ''; // FINAL EXAM/80 (Exam Score [80%])
                const totalScore = result.final_score ?? ''; // TOTAL SCORE 100% (Final Score [100%])
                const c1 = result.activity_score ?? ''; // C1 (Activity Score [3] of first set of exam)
                const identifier = result.activity_score ?? ''; // IDENTIFIER (Activity Score [3])
                // Provide fallback for descriptor if not available
                const descriptor = result.descriptor ?? (() => {
                  const activityNum = parseFloat(c1) || 0;
                  if (activityNum >= 2.5) return 'Outstanding';
                  if (activityNum >= 1.5) return 'Moderate';
                  if (activityNum >= 0.9) return 'Basic';
                  return '';
                })();
                const teacherInitials = result.teacher_initials ?? ''; // INIT (Subject Teacher)
                
                // Check if C2 data is available for this result
                const hasC2 = c2 !== undefined && c2 !== null && c2 !== '';
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{subject}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{avgScore}</td>
                    {hasC2 && <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{c2}</td>}
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{finalExam}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{totalScore}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{c1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{identifier}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{descriptor}</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{teacherInitials}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={student.results.some((r: any) => r.activity_score_2 !== undefined && r.activity_score_2 !== null && r.activity_score_2 !== '') ? 9 : 8} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
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
          <div><strong>NEXT TERM BEGINS ON:</strong> {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '26/05/2025'}</div>
          <div><strong>Fees Balance:</strong> Ugx 0</div>
        </div>
      </div>

      {/* SCHOOL STAMP */}
      <div className="flex justify-end mt-4">
        <div className="w-20 h-20 border-2 border-blue-500 rounded-full flex items-center justify-center bg-blue-50">
          <div className="text-center text-xs text-blue-700">
            <div className="font-bold">HEADTEACHER</div>
            <div className="font-bold">SIGNATURE</div>
            <div className="mt-1 text-[8pt]">02 MAY 2025</div>
            <div className="text-[7pt]">SCHOOL STAMP</div>
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
  const overallPerf = student.summary.performanceRemark ?? 'N/A';
  
  // Ensure only the four core subjects are shown so the preview fits one A4 page
  const coreSubjectNames = ['english', 'mathematics', 'science', 'social studies', 'sst'];
  const coreResults = (student.results || [])
    .filter((r: any) => coreSubjectNames.includes(String(r.subject || '').toLowerCase()))
    .slice(0, 4);

  return (
    <div
      style={{ 
        fontFamily: 'Times New Roman, Arial, sans-serif',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '15mm',
        boxSizing: 'border-box'
      }}
      className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full"
    >
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
            {['SUBJECT & PAPER', 'MARKS OBTAINED', 'TOTAL MARKS', 'GRADE', 'REMARK', 'INITIALS'].map(h => (
              <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coreResults.length > 0 ? (
            coreResults.map((result: any, index: number) => {
              const subject = result.subject ?? '';
              const marksObtained = result.marks_obtained ?? '';
              const totalMarks = result.total_marks ?? '';
              const grade = result.grade ?? '';
              const remark = result.remark ?? result.overall_remark ?? '';
              const initials = result.teacher_initials ?? result.teacher_name ?? '';
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{subject}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{marksObtained}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{totalMarks}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{grade}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{remark}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{initials}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PERFORMANCE SUMMARY (remove average line for primary to match requested format) */}
      <div className="mt-2 text-[11pt]">
        <p><strong>OVERALL PERFORMANCE:</strong> {overallPerf}</p>
      </div>


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

      <p className="mt-3 text-[11pt]"><strong>Next Term Begins:</strong> {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '______________________'}</p>

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

