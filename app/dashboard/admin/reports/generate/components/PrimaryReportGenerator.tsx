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
import { PRIMARY_TEMPLATES, getPrimaryTemplateOptions, getTemplateForClass, getSectionForClass } from "@/src/templates/primary";

// Primary/Nursery School Report Generator
export function PrimaryReportGenerator() {
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
  const [selectedTemplate, setSelectedTemplate] = useState<'template1' | 'template2' | 'template3' | 'template4' | string>('template1');
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
        
        // Detect current term from school_terms table based on actual calendar dates
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('*')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const currentTermData = (allTerms || []).find((t: any) => 
          (t.start_date ? (t.start_date <= todayStr && t.end_date >= todayStr) : (t.end_date >= todayStr))
        );
        
        let detectedCurrentYear = new Date().getFullYear();
        let detectedCurrentTerm = 1;
        
        if (currentTermData) {
          detectedCurrentYear = currentTermData.year;
          detectedCurrentTerm = currentTermData.term;
          setCurrentTermInfo({ year: currentTermData.year, term: currentTermData.term });
        } else {
          // Fallback: guess based on current month
          const month = new Date().getMonth() + 1;
          detectedCurrentTerm = month <= 4 ? 1 : month <= 7 ? 2 : 3;
          setCurrentTermInfo({ year: detectedCurrentYear, term: detectedCurrentTerm });
        }
        
        // Calculate next term
        let nextYear = detectedCurrentYear;
        let nextTerm = detectedCurrentTerm + 1;
        if (nextTerm > 3) {
          nextTerm = 1;
          nextYear = detectedCurrentYear + 1;
        }
        setNextTermInfo({ year: nextYear, term: nextTerm });

        // Load exam sets for the current term that have results
        // First, get exam sets that have results in the database
        let examSetsWithResultsQuery = supabase
          .from('exam_results')
          .select('exam_set_id')
          .eq('school_id', u.school_id);
        
        const { data: examResultsData } = await examSetsWithResultsQuery;
        
        // Get unique exam set IDs that have results
        const examSetIdsWithResults = [...new Set((examResultsData || []).map(r => r.exam_set_id))];
        
        if (examSetIdsWithResults.length > 0) {
          // Load exam sets that have results
          let examSetsQuery = supabase
            .from('exam_sets')
            .select('*')
            .eq('school_id', u.school_id)
            .eq('is_active', true)
            .in('id', examSetIdsWithResults);
          
          if (detectedCurrentYear != null && detectedCurrentTerm != null) {
            examSetsQuery = examSetsQuery
              .eq('year', detectedCurrentYear)
              .eq('term', detectedCurrentTerm);
          }
          const { data: examSetsData } = await examSetsQuery.order('name', { ascending: true });
          
          setExamSets(examSetsData || []);
        } else {
          // No exam sets have results yet
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

  // Auto-select template based on class (NO MANUAL OVERRIDE ALLOWED)
  useEffect(() => {
    if (selectedClass) {
      // Use automatic section-based template selection (enforced - no overrides)
      const autoTemplate = getTemplateForClass(selectedClass);
      setSelectedTemplate(autoTemplate);
      
      // Log the auto-selection for debugging
      const section = getSectionForClass(selectedClass);
      console.log(`✓ Auto-selected ${autoTemplate} (${PRIMARY_TEMPLATES[autoTemplate as keyof typeof PRIMARY_TEMPLATES]?.name}) for class "${selectedClass}" (${section} Section) - No manual override allowed`);
    }
  }, [selectedClass]);

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

  const refreshSchoolData = async () => {
    if (!schoolId) return;
    
    const { data: school } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    setSchoolInfo(school);
  };

  const generateReport = async (studentId?: string) => {
    if (reportType === 'single' && !studentId && !selectedStudent) {
      setError('Please select a student');
      return;
    }

    setGenerating(true);
    setError(null);
    
    // Refresh school data to get latest next_term_begins_date
    await refreshSchoolData();

    try {
      const targetStudentId = studentId || selectedStudent;
      const targetStudents = reportType === 'class' && selectedClass 
        ? students.filter(s => s.current_class === selectedClass)
        : [students.find(s => s.student_id === targetStudentId)].filter(Boolean);

      if (targetStudents.length === 0) {
        setError('No students found');
        return;
      }

      // Fetch processed exam results for either all sets in the term or a specific selected set
      let examResultsQuery = supabase
        .from('processed_primary_exam_results')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', targetStudents.map(s => s.student_id));

      if (selectedExamSetId && selectedExamSetId !== 'all') {
        examResultsQuery = examResultsQuery.eq('exam_set_id', selectedExamSetId);
      } else {
        examResultsQuery = examResultsQuery.in('exam_set_id', (examSets || []).map(es => es.id));
      }

      const { data: examResults } = await examResultsQuery;

      // All MISSED entries are now created at database level
      // Just query and display - no need for complex fallback logic

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
          // Get all results for this student (including MISSED entries from database)
          // MISSED entries are created automatically at database level, so just query and use
          const allStudentResults = examResults?.filter(er => er.student_id === student.student_id) || [];
          const studentAttendance = attendanceData?.filter(a => a.student_id === student.student_id) || [];
          const studentFees = feesData?.filter(f => f.student_id === student.student_id) || [];
          const studentProjects = projectsData.filter(p => p.student_id === student.student_id);
          const studentComments = commentsData
            .filter(c => c.student_id === student.student_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
          const studentPhoto = studentPhotos?.find(p => p.student_id === student.student_id);
          
          // Calculate summary with enhanced grading (handle missing data)
          // Only count actual results (not MISSED) for calculations
          // MISSED entries are identified by teacher_remark = 'MISSED' (not by grade)
          
          // Helper functions to detect exam set types by name
          const isBeginning = (name: any) => {
            const n = String(name || '').trim().toLowerCase();
            return n === 'beginning of term' || n === 'beginning of term' || n.includes('beginning') || n.includes('bot');
          };
          const isMid = (name: any) => {
            const n = String(name || '').trim().toLowerCase();
            return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
          };
          const isEnd = (name: any) => {
            const n = String(name || '').trim().toLowerCase();
            return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
          };
          
          // Filter results based on selected exam set:
          // - If specific exam set selected: use only that exam set's results
          // - If "all exam sets" selected: use only End of Term results
          // Include ALL results (including MISSED entries) - MISSED entries count as 0 marks
          let resultsForCalculation = allStudentResults;
          
          if (selectedExamSetId && selectedExamSetId !== 'all') {
            // Specific exam set selected - use only that exam set's results
            resultsForCalculation = resultsForCalculation.filter(r => r.exam_set_id === selectedExamSetId);
          } else {
            // "All exam sets" selected - use only End of Term results
            resultsForCalculation = resultsForCalculation.filter(r => {
              const examSetName = (r.exam_set_name || '').toLowerCase();
              return isEnd(examSetName);
            });
          }
          
          // Calculate total marks including MISSED entries (which have marks_obtained = 0)
          const totalMarks = resultsForCalculation.length > 0 ? resultsForCalculation.reduce((sum, result) => sum + (result.marks_obtained || 0), 0) : null;
          const totalPossibleMarks = resultsForCalculation.length > 0 ? resultsForCalculation.reduce((sum, result) => sum + (result.total_marks || 100), 0) : null;
          const average = totalPossibleMarks && totalPossibleMarks > 0 ? (totalMarks! / totalPossibleMarks) * 100 : null;
          // For aggregate calculation, exclude MISSED entries (only count actual results)
          const actualResultsForAggregate = resultsForCalculation.filter(r => r.teacher_remark !== 'MISSED');
          const aggregate = actualResultsForAggregate.length > 0 ? calculateAggregate(actualResultsForAggregate) : null;
          const division = average !== null ? calculateDivision(average) : 'N/A';
          const attendanceDetails = getAttendanceDetails(studentAttendance, referenceExamSet, examSets);
          const attendancePercentage = attendanceDetails.percentage;

          // Teacher comment from rules
          const teacherComment = (() => {
            const avg = average != null ? Math.max(0, Math.min(100, average)) : null;
            if (avg == null || commentRules.length === 0) return '';
            const rule = commentRules.find(r => avg >= Number(r.min_avg) && avg <= Number(r.max_avg));
            return rule?.comment || '';
          })();

          // For Template4 (Upper Section P.5-P.7), create subjects array with bot_marks, mot_marks, eot_marks
          // Check if this class uses Template4 (Upper Section: P.5, P.6, P.7, Primary 5, Primary 6, Primary 7)
          const className = student.current_class || '';
          const isUpperSection = /(primary\s*[5-7]|p\.?\s*[5-7]|upper)/i.test(className.trim());
          const usesTemplate4 = isUpperSection || selectedTemplate === 'template4';
          
          let subjects: any[] = [];
          if (usesTemplate4 && allStudentResults.length > 0) {
            // Group results by subject and aggregate by exam set type
            const subjectGroups: { [key: string]: { 
              subject_name: string; 
              bot_marks?: number | string; 
              mot_marks?: number | string; 
              eot_marks?: number | string; 
              total_marks: number;
              teacher_comment: string;
            } } = {};
            
            // Get exam set names from results
            const examSetMap = new Map();
            allStudentResults.forEach(r => {
              if (r.exam_set_id && !examSetMap.has(r.exam_set_id)) {
                const examSet = examSets.find(es => es.id === r.exam_set_id);
                if (examSet) {
                  examSetMap.set(r.exam_set_id, examSet.name);
                }
              }
            });

            // Determine which exam set is selected
            let selectedExamSetForDisplay: any = null;
            if (selectedExamSetId && selectedExamSetId !== 'all') {
              selectedExamSetForDisplay = examSets.find(es => es.id === selectedExamSetId);
            }
            const isAllExamSetsSelected = !selectedExamSetForDisplay;

            allStudentResults.forEach((r: any) => {
              const subject = r.subject ?? '';
              if (!subject) return;
              
              const examSetName = r.exam_set_name || examSetMap.get(r.exam_set_id) || '';
              
              if (!subjectGroups[subject]) {
                subjectGroups[subject] = {
                  subject_name: subject,
                  total_marks: r.total_marks ?? 100,
                  teacher_comment: r.teacher_remark || r.overall_remark || ''
                };
              }
              
              // Only assign marks if:
              // 1. "All exam sets" is selected (show all columns), OR
              // 2. The current result matches the selected exam set type
              // For MISSED entries (marks_obtained = 0 AND teacher_remark = 'MISSED'), show "MISSED" text
              // Grade comes from database (r.grade), not calculated
              const isMissedEntry = (r.marks_obtained === 0 || r.marks_obtained === null) && r.teacher_remark === 'MISSED';
              const displayMarks = isMissedEntry ? 'MISSED' : (r.marks_obtained ?? '');
              const displayGrade = r.grade ?? ''; // Grade from database
              
              if (isAllExamSetsSelected) {
                // Show all exam sets - populate all columns
                if (isBeginning(examSetName)) {
                  subjectGroups[subject].bot_marks = displayMarks;
                  subjectGroups[subject].bot_grade = displayGrade; // Grade from database
                } else if (isMid(examSetName)) {
                  subjectGroups[subject].mot_marks = displayMarks;
                  subjectGroups[subject].mot_grade = displayGrade; // Grade from database
                } else if (isEnd(examSetName)) {
                  subjectGroups[subject].eot_marks = displayMarks;
                  subjectGroups[subject].eot_grade = displayGrade; // Grade from database
                  // Use End of Term remarks if available (but not for MISSED entries)
                  if (!isMissedEntry && (r.teacher_remark || r.overall_remark)) {
                    subjectGroups[subject].teacher_comment = r.teacher_remark || r.overall_remark || '';
                  }
                }
              } else {
                // Specific exam set selected - only populate the matching column
                const selectedExamSetName = (selectedExamSetForDisplay.name || '').toLowerCase();
                
                if (isBeginning(selectedExamSetName) && isBeginning(examSetName)) {
                  subjectGroups[subject].bot_marks = displayMarks;
                  subjectGroups[subject].bot_grade = displayGrade; // Grade from database
                } else if (isMid(selectedExamSetName) && isMid(examSetName)) {
                  subjectGroups[subject].mot_marks = displayMarks;
                  subjectGroups[subject].mot_grade = displayGrade; // Grade from database
                } else if (isEnd(selectedExamSetName) && isEnd(examSetName)) {
                  subjectGroups[subject].eot_marks = displayMarks;
                  subjectGroups[subject].eot_grade = displayGrade; // Grade from database
                  // Use End of Term remarks if available (but not for MISSED entries)
                  if (!isMissedEntry && (r.teacher_remark || r.overall_remark)) {
                    subjectGroups[subject].teacher_comment = r.teacher_remark || r.overall_remark || '';
                  }
                }
              }
            });
            
            // Convert to array and calculate totals
            subjects = Object.values(subjectGroups).map((group: any) => {
              const bot = typeof group.bot_marks === 'number' ? group.bot_marks : (group.bot_marks || '');
              const mot = typeof group.mot_marks === 'number' ? group.mot_marks : (group.mot_marks || '');
              const eot = typeof group.eot_marks === 'number' ? group.eot_marks : (group.eot_marks || '');
              
              // Calculate total based on selection:
              // - If specific exam set selected: use only that exam set's marks
              // - If "all exam sets" selected: use only End of Term marks (last exam set)
              let total = '';
              
              if (selectedExamSetForDisplay) {
                // Specific exam set selected - use only that exam set's marks
                const selectedExamSetName = (selectedExamSetForDisplay.name || '').toLowerCase();
                let selectedMarks: number | string = '';
                
                if (isBeginning(selectedExamSetName)) {
                  selectedMarks = bot;
                } else if (isMid(selectedExamSetName)) {
                  selectedMarks = mot;
                } else if (isEnd(selectedExamSetName)) {
                  selectedMarks = eot;
                }
                
                if (selectedMarks !== '') {
                  total = typeof selectedMarks === 'number' ? selectedMarks.toString() : selectedMarks;
                }
              } else {
                // "All exam sets" selected - use only End of Term marks (last exam set)
                if (eot !== '') {
                  total = typeof eot === 'number' ? eot.toString() : eot;
                }
              }
              
              return {
                ...group,
                bot_marks: bot,
                mot_marks: mot,
                eot_marks: eot,
                total_marks: total || group.total_marks
              };
            });
          }

          return {
            ...student,
            results: allStudentResults,
            subjects: subjects.length > 0 ? subjects : undefined, // Only add if Template4
            attendance: studentAttendance,
            fees: studentFees,
            projects: studentProjects,
            comments: {
              ...studentComments,
              class_teacher_name: classTeacherName || (studentComments?.class_teacher_name || ''),
              class_teacher_text: teacherComment || (studentComments?.class_teacher_text || ''),
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

      // Get class positions from processed_primary_exam_results (stored in database)
      // Class Position: Ranks students based on their average/total marks for the selected exam period
      // Position 1 = best performance (highest average), higher numbers = lower performance
      reportData.students = await Promise.all(reportData.students.map(async (student: any) => {
        // Get the student's exam results to find their class_position
        const studentResults = examResults?.filter(er => er.student_id === student.student_id) || [];
        
        // Determine which exam set's position to use
        let classPosition: number | null = null;
        let totalStudentsInClass: number = 0;
        let examSetIdForCount: string | null = null;
        
        if (selectedExamSetId && selectedExamSetId !== 'all') {
          // Specific exam set selected - use position from that exam set
          const resultForSelectedSet = studentResults.find(r => r.exam_set_id === selectedExamSetId);
          if (resultForSelectedSet?.class_position) {
            classPosition = resultForSelectedSet.class_position;
            examSetIdForCount = selectedExamSetId;
          }
        } else {
          // "All exam sets" selected - use End of Term position (last exam set)
          // Find End of Term exam set
          const endOfTermResults = studentResults.filter(r => {
            const examSetName = (r.exam_set_name || '').toLowerCase();
            return examSetName.includes('end') || examSetName.includes('final') || examSetName.includes('eot');
          });
          
          if (endOfTermResults.length > 0) {
            // Use the End of Term result with class_position
            const eotResult = endOfTermResults.find(r => r.class_position) || endOfTermResults[0];
            if (eotResult?.class_position) {
              classPosition = eotResult.class_position;
              examSetIdForCount = eotResult.exam_set_id;
            }
          }
        }
        
        // Query database to get total count of ALL students in the same class and exam set
        if (examSetIdForCount && classPosition !== null) {
          const { data: allStudentsInClass } = await supabase
            .from('processed_primary_exam_results')
            .select('student_id')
            .eq('school_id', schoolId)
            .eq('class_name', student.current_class)
            .eq('exam_set_id', examSetIdForCount)
            .not('class_position', 'is', null);
          
          // Count distinct student_ids
          if (allStudentsInClass) {
            totalStudentsInClass = new Set(allStudentsInClass.map(r => r.student_id)).size;
          }
        }
        
        // Fallback: if no position found, calculate it (for backward compatibility)
        if (classPosition === null) {
          const classStudents = reportData.students.filter((s: any) => s.current_class === student.current_class);
          totalStudentsInClass = classStudents.length;
          classPosition = getClassPosition(reportData.students, student);
        }
        
        return {
          ...student,
          summary: {
            ...student.summary,
            classPosition: classPosition,
            streamPosition: getStreamPosition(reportData.students, student),
            totalStudents: totalStudentsInClass
          }
        };
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
            {/* Class Template Settings Button - Removed (Auto-selection enforced) */}
            {/* Templates are automatically selected based on class section */}
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
                
                return (
                  <div key={className} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <div className="text-white font-medium">{className}</div>
                        <div className="text-white/60 text-sm">
                          {isOLevel ? 'O-Level Class' : 'Secondary Class'}
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
                                  is_o_level: isOLevel
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
                        <optgroup label="Primary School Templates">
                          <option value="template1">{PRIMARY_TEMPLATES.template1.name}</option>
                          <option value="template2">{PRIMARY_TEMPLATES.template2.name}</option>
                          <option value="template3">{PRIMARY_TEMPLATES.template3.name}</option>
                          <option value="template4">{PRIMARY_TEMPLATES.template4.name}</option>
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
            {/* Template Selection - Only show for O-Level classes (Senior 1-4) */}
            {/* Template Display - Auto-Selected (Read-Only) */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Report Template
                <span className="ml-2 text-xs text-emerald-400 font-normal">✓ Auto-Selected</span>
                </label>
              <div className="relative">
                <select
                  value={selectedTemplate}
                  disabled
                  className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-white/90 cursor-not-allowed opacity-75"
                >
                  <optgroup label="Primary School Templates" className="text-black">
                  <option className="text-black" value="template1">{PRIMARY_TEMPLATES.template1.name}</option>
                  <option className="text-black" value="template2">{PRIMARY_TEMPLATES.template2.name}</option>
                  <option className="text-black" value="template3">{PRIMARY_TEMPLATES.template3.name}</option>
                  <option className="text-black" value="template4">{PRIMARY_TEMPLATES.template4.name}</option>
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
              </div>
              </div>
              <p className="mt-1 text-xs text-white/50">
                Template automatically selected based on class section. This ensures consistent formatting for all students.
              </p>
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

            {/* Exam Set Selection */}
            {examSets && examSets.length > 0 && (() => {
              // Helper function to detect if exam set is Mid Term
              const isMidTerm = (name: string) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
              };
              
              // Filter to only show Mid Term exam sets
              const midTermExamSets = examSets.filter((es: any) => isMidTerm(es.name || ''));
              
              return (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Exam Set
                  </label>
                  <select
                    value={selectedExamSetId}
                    onChange={(e) => setSelectedExamSetId(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/70 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option className="text-black" value="all">All Exam Sets (Current Term)</option>
                    {midTermExamSets.map((es) => (
                      <option className="text-black" key={es.id} value={es.id}>
                        {es.name || `Set - Term ${es.term}, ${es.year}`}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}
            {/* Current Term Info */}
            {currentTermInfo && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 mb-4">
                <div className="text-white/80 text-sm">
                  <strong>Current Term:</strong> Term {currentTermInfo.term}, {currentTermInfo.year}
                </div>
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
                Template: {selectedTemplate === 'template1' ? PRIMARY_TEMPLATES.template1.name : 
                          selectedTemplate === 'template2' ? PRIMARY_TEMPLATES.template2.name : 
                          selectedTemplate === 'template3' ? PRIMARY_TEMPLATES.template3.name : 
                          selectedTemplate === 'template4' ? PRIMARY_TEMPLATES.template4.name : 
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
                  examSets={examSets}
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
function isLowerSectionPrimary(className: string): boolean {
  if (!className) return false;
  return /(primary\s*1|primary\s*2|primary\s*3|^p\.?\s*1$|^p\.?\s*2$|^p\.?\s*3$)/i.test(className.trim());
}

function ReportPreview({ student, examSet, school, template, reportTitleSettings, currentTermInfo, examSets }: { student: any; examSet: any; school: any; template: string; reportTitleSettings: any; currentTermInfo: any; examSets?: any[] }) {
  const cls = String(student.current_class || '');
  const isOL = isOLevelClass(cls);
  const isLower = isLowerSectionPrimary(cls);

  // Primary/Nursery path (non O-Level)
  if (!isOL) {
    if (template === 'template3' || isLower) {
      return <Template3KyoteraReport student={student} examSet={examSet} school={school} reportTitleSettings={reportTitleSettings} currentTermInfo={currentTermInfo} />;
    }
    if (template === 'template4') {
      return <Template4UpperSectionReport student={student} examSet={examSet} school={school} examSets={examSets} />;
    }
    // Default primary template (nursery/middle/top)
    return <Template2KasoziReport student={student} examSet={examSet} school={school} />;
  }

  // O-Level/Secondary path
  switch (template) {
    case 'template1':
      return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
    case 'template2':
      return <Template2KasoziReport student={student} examSet={examSet} school={school} />;
    case 'template3':
      return <Template3KyoteraReport student={student} examSet={examSet} school={school} reportTitleSettings={reportTitleSettings} currentTermInfo={currentTermInfo} />;
    case 'template4':
      return <Template4UpperSectionReport student={student} examSet={examSet} school={school} examSets={examSets} />;
    default:
      return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
  }
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
      padding: '12mm',
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
      <div className="text-center bg-green-600 text-white py-1.5 mb-3">
        <h1 className="text-[12.5pt] font-bold uppercase">
          LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || '2'}, {examSet?.year || '2025'}
        </h1>
      </div>

      {/* Student Info and Photo - Side by side */}
      <div className="flex justify-between items-start mb-3">
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
      <table className="w-full mb-3" style={{ borderCollapse: 'collapse', fontSize: '9.5pt' }}>
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
                  <td className="text-[9pt]" style={{ border: '1px solid #000', padding: '4px' }}>{overallRemark}</td>
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

      {/* COMMENTS & SIGNATURES (Reworked, remove average/overall text) */}
      <div className="mb-3 text-[10.5pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <div style={{ height: '48px', borderBottom: '1px solid #000', marginBottom: '6px' }} />
        <p>
          Name: {student.comments?.class_teacher_name || ''} | Signature: ____________________
        </p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <div style={{ height: '48px', borderBottom: '1px solid #000', marginBottom: '6px' }} />
        <p>
          Name: {student.comments?.head_teacher_name || ''} | Signature: ____________________
        </p>
      </div>


      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <div style={{ height: '60px', borderBottom: '1px solid #000', marginBottom: '8px' }} />
        <p>Name: {student.comments?.class_teacher_name || ''} | Signature: ____________________</p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <div style={{ height: '60px', borderBottom: '1px solid #000', marginBottom: '8px' }} />
        <p>Name: {student.comments?.head_teacher_name || ''} | Signature: ____________________</p>
      </div>

      {/* Next Term removed for this template per request */}

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
        <h1 className="text-[14pt] font-bold uppercase">MIDDLE & TOP CLASS - TERMLY REPORT</h1>
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
        <h3 className="text-[12pt] font-bold mb-2">End of Term Report - {examSet?.term || 'Term'} {examSet?.year || '2025'}</h3>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              {['SUBJECT', 'FULL MARKS', 'MID TERM', 'END OF TERM', "TEACHER'S REMARKS", 'INITIALS'].map(h => (
                <th key={h} className="text-center font-bold uppercase" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '6px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const results = student.results || [];
              if (results.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>No results available</td>
                  </tr>
                );
              }
              let totalFullMarks = 0;
              return (
                <>
                  {(() => {
                    // Use the exact same logic as the PDF generation
                    const all = Array.isArray(student.results) ? student.results : [];
                    const isMid = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
                    };
                    const isEnd = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
                    };
                    
                    // Group results by subject
                    const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
                    
                    all.forEach((r: any) => {
                      const subject = r.subject ?? '';
                      const examSetName = r.exam_set_name || r.exam_sets?.name || '';
                      
                      if (!subjectGroups[subject]) {
                        subjectGroups[subject] = {
                          subject,
                          total_marks: r.total_marks ?? 100,
                          remarks: r.remarks || r.overall_remark || r.teacher_remark || '',
                          initials: r.teacher_initials ?? ''
                        };
                      }
                      
                      // Check if this is a MISSED entry (marks_obtained = 0 AND teacher_remark = 'MISSED')
                      const isMissedEntry = (r.marks_obtained === 0 || r.marks_obtained === null) && r.teacher_remark === 'MISSED';
                      const displayMarks = isMissedEntry ? 'MISSED' : (r.marks_obtained ?? '');
                      
                      if (isMid(examSetName)) {
                        subjectGroups[subject].mid = displayMarks;
                      } else if (isEnd(examSetName)) {
                        subjectGroups[subject].end = displayMarks;
                      }
                    });
                    
                    // After processing all results, check if any subjects are missing Mid Term or End of Term results
                    // If the subject exists in allSubjects but student doesn't have result for that exam set, set it to 'MISSED'
                    // Note: We need to check if other students have results, but we don't have that data here
                    // So we'll rely on the fallback code to create MISSED entries in student.results
                    
                    const subjects = Object.values(subjectGroups);
                    
                    return subjects.map((group, idx) => {
                      totalFullMarks += group.total_marks;
                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>{group.subject}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.total_marks}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.mid ?? ''}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.end ?? ''}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>{group.remarks}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.initials}</td>
                        </tr>
                      );
                    });
                  })()}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, textAlign: 'left' }}>TOTAL</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, textAlign: 'center' }}>{totalFullMarks}</td>
                    <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px' }} colSpan={2}></td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comments:</h3>
        <p>{student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>

        <h3 className="text-[11pt] font-semibold mb-1 mt-4">Headteacher's Comments:</h3>
        <p>{student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>
      </div>

      {/* NEXT TERM INFO */}
      <div className="mb-4 text-[10pt]">
        <p><strong>Next term begins on:</strong> {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '____________________'}</p>
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
  
  // Teacher remarks are now pre-processed and stored in the processed_primary_exam_results table

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
            <div><strong>LIN:</strong> {student.admission_number || student.student_id}</div>
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

      {/* SUBJECTS TABLE - Lower Section (P.1 - P.3) */}
      <div className="mb-4">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr>
              {['SUBJECT','FULL MARKS','MID TERM','END OF TERM','TEACHER\'S REMARKS','INITIALS'].map(h => (
                <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '6px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const results = student.results || [];
              if (results.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>No results available</td>
                  </tr>
                );
              }
              let totalFullMarks = 0;
              return (
                <>
                  {(() => {
                    // Use processed data structure - each row is already a subject with exam set info
                    const all = Array.isArray(student.results) ? student.results : [];
                    const isMid = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
                    };
                    const isEnd = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
                    };
                    
                    // Group results by subject
                    const subjectGroups: { [key: string]: { mid?: any; end?: any; mid_grade?: string; end_grade?: string; subject: string; total_marks: number; remarks: string; initials: string } } = {};
                    
                    all.forEach((r: any) => {
                      const subject = r.subject ?? '';
                      const examSetName = r.exam_set_name || '';
                      
                      if (!subjectGroups[subject]) {
                        subjectGroups[subject] = {
                          subject,
                          total_marks: r.total_marks ?? 100,
                          remarks: '',
                          initials: ''
                        };
                      }
                      
                      // Check if this is a MISSED entry (marks_obtained = 0 AND teacher_remark = 'MISSED')
                      // All data comes from database: marks, grades, remarks, etc.
                      const isMissedEntry = (r.marks_obtained === 0 || r.marks_obtained === null) && r.teacher_remark === 'MISSED';
                      const displayMarks = isMissedEntry ? 'MISSED' : (r.marks_obtained ?? '');
                      const displayGrade = r.grade ?? ''; // Grade from database
                      
                      if (isMid(examSetName)) {
                        subjectGroups[subject].mid = displayMarks;
                        subjectGroups[subject].mid_grade = displayGrade; // Grade from database
                        // Use Mid Term results for remarks and initials if End of Term not available (but not for MISSED entries)
                        if (!subjectGroups[subject].remarks && !isMissedEntry) {
                          subjectGroups[subject].remarks = r.teacher_remark || '';
                          subjectGroups[subject].initials = r.teacher_initials ?? '';
                        }
                      } else if (isEnd(examSetName)) {
                        subjectGroups[subject].end = displayMarks;
                        subjectGroups[subject].end_grade = displayGrade; // Grade from database
                        // Use pre-processed teacher remarks from the processed table (but not for MISSED entries)
                        if (!isMissedEntry) {
                          subjectGroups[subject].remarks = r.teacher_remark || '';
                          subjectGroups[subject].initials = r.teacher_initials ?? '';
                        }
                      }
                    });
                    
                    // Note: MISSED entries should already be in student.results from the fallback code
                    // If they're still missing here, it means the fallback didn't create them
                    // This could happen if the subject isn't in allSubjects or exam set matching failed
                    
                    // If no remarks found from any exam set, use any available remarks
                    Object.values(subjectGroups).forEach((group: any) => {
                      if (!group.remarks) {
                        const anyResult = all.find((r: any) => r.subject === group.subject);
                        if (anyResult) {
                          group.remarks = anyResult.teacher_remark || '';
                          group.initials = anyResult.teacher_initials ?? '';
                        }
                      }
                    });
                    
                    const subjects = Object.values(subjectGroups);
                    
                    return subjects.map((group, idx) => {
                      totalFullMarks += group.total_marks;
                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>{group.subject}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.total_marks}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.mid ?? ''}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.end ?? ''}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>{group.remarks}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{group.initials}</td>
                        </tr>
                      );
                    });
                  })()}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, textAlign: 'left' }}>TOTAL</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, textAlign: 'center' }}>{totalFullMarks}</td>
                    <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px' }} colSpan={2}></td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* COMMENTS & FOOTER to match provided HTML */}
      <div className="mt-4">
        <div className="mb-4">
          <div className="mb-1">
            <span className="font-bold">Class Teacher's Comments:</span> {student.results && student.results.length > 0 ? student.results[0].class_teacher_comment || 'Student is progressing well but needs to focus more on specific subjects for better results.' : 'Student is progressing well but needs to focus more on specific subjects for better results.'}
          </div>
          <div className="mt-2">Signature: ______________________</div>
        </div>
        <div className="mb-4">
          <div className="mb-1">
            <span className="font-bold">Headteacher's Comments:</span> {student.results && student.results.length > 0 ? student.results[0].headteacher_comment || 'Student is progressing well but needs to focus more on specific subjects for better results.' : 'Student is progressing well but needs to focus more on specific subjects for better results.'}
          </div>
          <div className="mt-2">Signature: ______________________</div>
        </div>
        <div className="flex justify-between text-[11pt] mt-4">
          <div>Next term begins on: {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '____________________'}</div>
        </div>
      </div>
    </div>
  );
}

// Template 4 - Report for Upper Section (P.5 - P.7)
function Template4UpperSectionReport({ student, examSet, school, examSets }: { student: any; examSet: any; school: any; examSets?: any[] }) {
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // Helper function to detect if exam set is Beginning of Term
  const isBeginning = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'beginning of term' || n.includes('beginning') || n.includes('bot');
  };
  
  // Helper function to detect if exam set is Mid Term
  const isMidTerm = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
  };

  // Check if BOT exam sets exist for this term
  const hasBOTExamSets = examSets && examSets.some((es: any) => isBeginning(es.name));
  
  // Check if a specific exam set is selected (not "All Exam Sets")
  const isSpecificExamSetSelected = examSet && examSet.name !== 'All Exam Sets';
  const isMidTermSelected = isSpecificExamSetSelected && isMidTerm(examSet.name);
  const showENDColumn = !isMidTermSelected; // Hide END column when Mid Term is selected

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (percent: number): string => {
    if (percent >= 80) return 'D1';
    if (percent >= 70) return 'D2';
    if (percent >= 60) return 'C3';
    if (percent >= 55) return 'C4';
    if (percent >= 50) return 'C5';
    if (percent >= 45) return 'C6';
    if (percent >= 40) return 'P7';
    if (percent >= 35) return 'P8';
    return 'F9';
  };

  return (
    <div className="p-8 bg-white text-black" style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '11pt', lineHeight: '1.4' }}>
      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        {(school?.logo_url || school?.logo) ? (
          <div className="w-24 h-24 flex-shrink-0">
            <img src={school.logo_url || school.logo} alt="School Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-24 h-24 flex-shrink-0 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50">
            <span className="text-xs text-gray-400">School Logo</span>
          </div>
        )}
        
        <div className="flex-1 text-center px-4">
          <h1 className="text-2xl font-bold uppercase mb-1">{school?.name || 'School Name'}</h1>
          <div className="text-sm mb-1">{school?.location || 'Location'}</div>
          <div className="text-sm mb-1">{school?.contact_email || 'Email'} | {school?.contact_phone || 'Phone'}</div>
          <div className="text-sm italic">&quot;{school?.motto || 'School Motto'}&quot;</div>
          <div className="mt-2 text-base font-bold uppercase">END OF TERM REPORT - UPPER SECTION</div>
          <div className="text-sm">{examSet?.name || 'Term Report'} - {examSet?.year || new Date().getFullYear()}</div>
        </div>

        {student?.profile_photo ? (
          <div className="w-24 h-24 flex-shrink-0">
            <img src={student.profile_photo} alt="Student Photo" className="w-full h-full object-cover rounded border-2 border-gray-300" />
          </div>
        ) : (
          <div className="w-24 h-24 flex-shrink-0 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50">
            <span className="text-xs text-gray-400">Student Photo</span>
          </div>
        )}
      </div>

      {/* STUDENT INFO */}
      <div className="grid grid-cols-2 gap-x-8 mb-4 text-[10pt]">
        <div><strong>Name:</strong> {student?.name || 'Student Name'}</div>
        <div><strong>Class:</strong> {student?.current_class || 'Class'}</div>
        <div><strong>Admission No:</strong> {student?.admission_number || 'N/A'}</div>
        <div><strong>Term:</strong> {examSet?.term || 'N/A'} / {examSet?.year || new Date().getFullYear()}</div>
      </div>

      {/* SUBJECTS TABLE */}
      <table className="w-full border-collapse mb-4 text-[10pt]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1 text-left">Subject</th>
            {hasBOTExamSets && !isMidTermSelected && (
              <th className="border border-gray-400 px-2 py-1 text-center w-16">BOT</th>
            )}
            <th className="border border-gray-400 px-2 py-1 text-center w-16">MID</th>
            {showENDColumn && (
              <th className="border border-gray-400 px-2 py-1 text-center w-16">END</th>
            )}
            <th className="border border-gray-400 px-2 py-1 text-center w-16">Grade</th>
            <th className="border border-gray-400 px-2 py-1 text-left">Teacher's Comment</th>
          </tr>
        </thead>
        <tbody>
          {(student?.subjects || []).map((subj: any, idx: number) => {
            const bot = subj.bot_marks ?? '';
            const mot = subj.mot_marks ?? '';
            const eot = subj.eot_marks ?? '';
            const total = subj.total_marks ?? '';
            const grade = total ? calculateGrade(parseFloat(total) || 0) : '';
            
            return (
              <tr key={idx}>
                <td className="border border-gray-400 px-2 py-1">{subj.subject_name || ''}</td>
                {hasBOTExamSets && !isMidTermSelected && (
                  <td className="border border-gray-400 px-2 py-1 text-center">{bot}</td>
                )}
                <td className="border border-gray-400 px-2 py-1 text-center">{mot}</td>
                {showENDColumn && (
                  <td className="border border-gray-400 px-2 py-1 text-center">{eot}</td>
                )}
                <td className="border border-gray-400 px-2 py-1 text-center font-bold">{grade}</td>
                <td className="border border-gray-400 px-2 py-1 text-xs">{subj.teacher_comment || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-[10pt]">
        <div className="border border-gray-400 p-2">
          <div><strong>Total Marks:</strong> {student?.summary?.totalMarks || 'N/A'}</div>
          <div><strong>Average:</strong> {avg}</div>
          <div><strong>Division:</strong> {avgGrade}</div>
        </div>
        <div className="border border-gray-400 p-2">
          <div><strong>Class Position:</strong> {student?.summary?.classPosition || 'N/A'}</div>
          <div><strong>Out of:</strong> {student?.summary?.totalStudents || 'N/A'} students</div>
        </div>
        <div className="border border-gray-400 p-2">
          <div><strong>Attendance:</strong></div>
          <div>Days Present: {attendance.presentDays ?? 'N/A'}</div>
          <div>Days Absent: {attendance.absentDays ?? 'N/A'}</div>
          <div>Total Days: {attendance.totalSchoolDays ?? 'N/A'}</div>
        </div>
      </div>

      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <div className="mb-2">
          <strong>Class Teacher's Comment:</strong>
          <div className="border border-gray-400 p-2 min-h-[60px] mt-1">
            {student?.class_teacher_comment || 'No comment provided'}
          </div>
        </div>
        <div>
          <strong>Head Teacher's Comment:</strong>
          <div className="border border-gray-400 p-2 min-h-[60px] mt-1">
            {student?.head_teacher_comment || 'No comment provided'}
          </div>
        </div>
      </div>

      {/* NEXT TERM AND SIGNATURES */}
      <div className="flex justify-between items-end text-[10pt]">
        <div>
          <div><strong>Next Term Begins:</strong> {student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : 'TBA'}</div>
          <div><strong>Fees Balance:</strong> UGX {formatCurrency(student?.feesBalance || 0)}</div>
        </div>
        <div className="text-right">
          <div className="mb-8">
            <div className="border-t border-gray-400 w-48 inline-block"></div>
            <div className="text-xs">Head Teacher's Signature</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-[8pt] mt-4 pt-2 border-t border-gray-300 text-gray-600">
        Generated by PwezaCore School Management System
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

