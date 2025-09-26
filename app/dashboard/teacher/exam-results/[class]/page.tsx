"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { createServerClient } from '@supabase/ssr';
import { useRouter, useParams } from "next/navigation";

export default function TeacherExamResultsClassPage() {
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(params.class as string);
  const isSecondary = useMemo(() => {
    const trimmed = className?.trim() || "";
    // Check for secondary classes: Senior 1-6, S1-S6, or any class starting with "Senior" or "S" followed by number
    // This covers: "Senior 1", "Senior1", "S1", "S 1", "senior 1", "Senior 1 West", etc.
    const matches = /^(senior\s*[1-6]|s\s*[1-6])/i.test(trimmed);
    console.log("Class name:", trimmed, "isSecondary:", matches, "Pattern match:", /^(senior\s*[1-6]|s\s*[1-6])/i.test(trimmed)); // Debug log
    return matches;
  }, [className]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [examSets, setExamSets] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedExamSet, setSelectedExamSet] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  // Primary layout state (existing)
  const [examResults, setExamResults] = useState<Record<string, { marks: string; totalMarks: string; grade: string }>>({});
  // Secondary layout state
  const [examResultsSecondary, setExamResultsSecondary] = useState<Record<string, {
    topic: string;
    activityScore: string; // 0-3 (step 0.1)
    descriptor: "Missed" | "Moderate" | "Outstanding" | "";
    formative: string; // 0-40
    exam: string; // 0-60
    final: string; // read-only (formative+exam)
    grade: "A"|"B"|"C"|"D"|"E"|"";
    remark: string;
    initials: string;
  }>>({});
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [teacherInitials, setTeacherInitials] = useState<string>("");
  const [showGradeSettings, setShowGradeSettings] = useState(false);
  const [gradeSettings, setGradeSettings] = useState<Record<string, Array<{min: number; max: number; grade: string}>>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const returnUrl = encodeURIComponent(`/dashboard/teacher/exam-results/${encodeURIComponent(className)}`);
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        // Compute teacher initials from metadata name if available
        const nameFromMeta: string | undefined = (user.user_metadata?.name || user.user_metadata?.full_name) as string | undefined;
        if (nameFromMeta) {
          const parts = nameFromMeta.trim().split(/\s+/);
          const initials = parts.slice(0, 2).map(p => (p[0] || '').toUpperCase()).join('.') + (parts.length ? '' : '');
          setTeacherInitials(initials || "");
        }

        // Resolve teacher within user's school: metadata -> teachers by email -> teachers by name
        let teacherId = user.user_metadata?.teacher_id as string | undefined;
        let schoolId = user.user_metadata?.school_id as string | undefined;

        // Get user data using the working API endpoint instead of direct query
        let userData: any = null;
        try {
          // Use the working API endpoint to get user info
          let apiRes = await fetch('/api/teacher/resolve-assignments', { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
          if (!apiRes.ok) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            if (origin) {
              apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
            }
          }
          if (apiRes.ok) {
            const payload = await apiRes.json();
            // Extract user info from the API response
            userData = {
              school_id: payload.school_id,
              name: payload.user_name || user.user_metadata?.name || user.user_metadata?.full_name,
              email: payload.user_email || user.email
            };
          }
        } catch (err) {
          console.error('Exception fetching user data via API:', err);
        }

        // Fallback: try direct query if API fails
        if (!userData) {
          try {
            const { data, error: userError } = await supabase
              .from('users')
              .select('school_id,name,email,user_metadata')
              .eq('user_id', user.id)
              .single();
            
            if (userError) {
              console.error('Error fetching user data:', userError);
            } else {
              userData = data;
            }
          } catch (err) {
            console.error('Exception fetching user data directly:', err);
          }
        }

        schoolId = schoolId || (userData?.school_id as string | undefined);

        // Fill initials from users.name if not from metadata
        const fallbackName = (userData?.name as string | undefined) || undefined;
        if (!nameFromMeta && fallbackName) {
          const parts = fallbackName.trim().split(/\s+/);
          const initials = parts.slice(0, 2).map(p => (p[0] || '').toUpperCase()).join('.')
          setTeacherInitials(initials || "");
        }
          
        // If no teacherId yet, try match teacher by email in same school
        if (!teacherId && (userData?.email || user.email) && schoolId) {
          const { data: tByEmail } = await supabase
            .from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .eq('email', (userData?.email as string) || (user.email as string))
            .maybeSingle();
          teacherId = tByEmail?.teacher_id as string | undefined;
        }

        // If still not found, try match by name in same school
        if (!teacherId && schoolId && (userData?.name || '').trim()) {
          const { data: tByName } = await supabase
            .from('teachers')
            .select('teacher_id')
            .eq('school_id', schoolId)
            .ilike('name', (userData?.name || '').trim())
            .maybeSingle();
          teacherId = tByName?.teacher_id as string | undefined;
        }

        // If still no teacherId, try using the API endpoint to resolve it
        if (!teacherId) {
          try {
            let apiRes = await fetch('/api/teacher/resolve-assignments', { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
            if (!apiRes.ok) {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              if (origin) {
                apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
              }
            }
            if (apiRes.ok) {
              const payload = await apiRes.json();
              if (payload?.resolved_teacher_id) {
                teacherId = payload.resolved_teacher_id;
                console.log('Resolved teacher_id via API:', teacherId);
              }
            }
          } catch (err) {
            console.error('Error resolving teacher_id via API:', err);
          }
        }
        
        console.log('Teacher ID:', teacherId, 'School ID:', schoolId);
        
        if (!teacherId) {
          setError('Teacher ID not found. Please contact your administrator.');
          return;
        }
        
        if (!schoolId) {
          setError('School ID not found. Please contact your administrator.');
          return;
        }

        // Get teacher's subjects for this class
        console.log('Fetching assignments for:', { schoolId, teacherId, className });
        
        // Get teacher's assignments using the working API endpoint
        let assignments: any[] = [];
        try {
          let apiRes = await fetch('/api/teacher/resolve-assignments', { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
          if (!apiRes.ok) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            if (origin) {
              apiRes = await fetch(`${origin}/api/teacher/resolve-assignments`, { credentials: 'include', cache: 'no-store' as any, headers: { 'Cache-Control': 'no-store' } });
            }
          }
          if (apiRes.ok) {
            const payload = await apiRes.json();
            if (Array.isArray(payload?.assignments)) {
              // Filter assignments for the current class
              assignments = payload.assignments.filter((a: any) => a.class_name === className);
            }
          }
        } catch (err) {
          console.error('Error fetching assignments from API:', err);
        }

        // If API failed, try direct database query as fallback
        if (assignments.length === 0) {
          try {
            const { data: directAssignments, error: assignmentsError } = await supabase
              .from('teacher_class_subjects')
              .select('subject')
              .eq('school_id', schoolId)
              .eq('teacher_id', teacherId)
              .eq('class_name', className);

            if (assignmentsError) {
              console.error('Error fetching teacher assignments:', assignmentsError);
              
              // Fallback: try to get from teachers table
              console.log('Trying fallback: checking teachers table...');
              const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('subjects')
                .eq('school_id', schoolId)
                .eq('teacher_id', teacherId)
                .single();
            
              if (teacherError) {
                console.error('Fallback also failed:', teacherError);
                setError(`Failed to load your assignments: ${assignmentsError.message}`);
                return;
              }
              
              // Use subjects from teachers table
              const teacherSubjects = teacherData?.subjects || [];
              console.log('Using fallback subjects from teachers table:', teacherSubjects);
              
              if (teacherSubjects.length === 0) {
                setError(`No subjects assigned for ${className}. Please contact your administrator to assign subjects.`);
                return;
              }
              
              setTeacherSubjects(teacherSubjects);
            } else {
              // Use direct assignments
              assignments = directAssignments || [];
            }
          } catch (err) {
            console.error('Error in direct assignment query:', err);
          }
        }

        // Process assignments (either from API or direct query)
        if (assignments.length > 0) {
          console.log('Teacher assignments:', assignments);
          const subjects = assignments?.map(a => a.subject) || [];
          console.log('Subjects for this class:', subjects);
          
          if (subjects.length === 0) {
            setError(`No subjects assigned for ${className}. Please contact your administrator to assign subjects.`);
            return;
          }
          
          setTeacherSubjects(subjects);
        } else {
          setError(`No subjects assigned for ${className}. Please contact your administrator to assign subjects.`);
          return;
        }

        // Get exam sets for this class that are active for input
        const { data: examSetsData, error: examSetsError } = await supabase
          .from('exam_sets')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .eq('active_for_input', true)
          .order('year', { ascending: false })
          .order('term', { ascending: true });

        if (examSetsError) throw examSetsError;
        
        // Filter exam sets that apply to this class (either all classes or specific class)
        const filteredExamSets = (examSetsData || []).filter(examSet => 
          examSet.target_classes.length === 0 || examSet.target_classes.includes(className)
        );
        setExamSets(filteredExamSets);

        // Get students in this class with better error handling
        let studentsData: any[] = [];
        try {
          const { data, error: studentsError } = await supabase
            .from('students')
            .select('student_id, name, current_class')
            .eq('school_id', schoolId)
            .eq('current_class', className)
            .order('name');

          if (studentsError) {
            console.error('Error fetching students:', studentsError);
            // Don't throw error, just log it and continue with empty array
          } else {
            studentsData = data || [];
          }
        } catch (err) {
          console.error('Exception fetching students:', err);
        }

        // If no students found, try using API endpoint
        if (studentsData.length === 0) {
          try {
            const apiRes = await fetch(`/api/teacher/students?class=${encodeURIComponent(className)}`, { 
              credentials: 'include', 
              cache: 'no-store' as any, 
              headers: { 'Cache-Control': 'no-store' } 
            });
            
            if (apiRes.ok) {
              const payload = await apiRes.json();
              if (Array.isArray(payload?.students)) {
                studentsData = payload.students;
              }
            }
          } catch (err) {
            console.error('Error fetching students via API:', err);
          }
        }

        setStudents(studentsData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [className, router]);

  const calculatePrimaryGrade = (marks: number, totalMarks: number, subject: string): string => {
    if (!marks && marks !== 0) return '';
    const percentage = (marks / (totalMarks || 100)) * 100;
    const subjectGrades = gradeSettings[subject] || getDefaultGrades();
    for (const gradeRange of subjectGrades) {
      if (percentage >= gradeRange.min && percentage <= gradeRange.max) {
        return gradeRange.grade;
      }
    }
    return 'F';
  };

  const getDefaultGrades = () => [
    { min: 0, max: 40, grade: 'F' },
    { min: 41, max: 50, grade: 'D' },
    { min: 51, max: 60, grade: 'C' },
    { min: 61, max: 70, grade: 'B' },
    { min: 71, max: 80, grade: 'B+' },
    { min: 81, max: 90, grade: 'A' },
    { min: 91, max: 100, grade: 'A+' }
  ];

  // Secondary helpers
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateSecondaryGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  // Primary change handler (existing)
  const handleMarksChange = (studentId: string, field: 'marks' | 'totalMarks', value: string) => {
    const newMarks = field === 'marks' ? value : (examResults[studentId]?.marks || '');
    const newTotalMarks = '100'; // Always 100
    const marksNum = parseFloat(newMarks) || 0;
    const totalMarksNum = parseFloat(newTotalMarks) || 100;
    const grade = calculatePrimaryGrade(marksNum, totalMarksNum, selectedSubject);
    setExamResults(prev => ({
      ...prev,
      [studentId]: { marks: newMarks, totalMarks: newTotalMarks, grade }
    }));
  };

  // Secondary change handler
  const handleSecondaryChange = (studentId: string, field: keyof typeof examResultsSecondary[string], value: string) => {
    setExamResultsSecondary(prev => {
      const current = prev[studentId] || { topic: topicFilter || "", activityScore: "", descriptor: "", formative: "", exam: "", final: "", grade: "", remark: "", initials: teacherInitials };
      let next = { ...current, [field]: value } as typeof current;
      const activityNum = parseFloat(next.activityScore) || 0;
      const descriptor = calculateDescriptor(activityNum);
      next.descriptor = descriptor;
      // If missed, force scores to 0 and gray them out via read-only style
      let formativeNum = parseFloat(next.formative) || 0;
      let examNum = parseFloat(next.exam) || 0;
      if (descriptor === 'Missed') {
        formativeNum = 0; examNum = 0; next.formative = '0'; next.exam = '0';
      } else {
        // clamp
        if (formativeNum > 40) { formativeNum = 40; next.formative = '40'; }
        if (examNum > 60) { examNum = 60; next.exam = '60'; }
        if (formativeNum < 0) { formativeNum = 0; next.formative = '0'; }
        if (examNum < 0) { examNum = 0; next.exam = '0'; }
      }
      const finalNum = formativeNum + examNum;
      next.final = String(finalNum);
      next.grade = calculateSecondaryGrade(finalNum);
      // keep initials auto
      next.initials = teacherInitials || next.initials;
      return { ...prev, [studentId]: next };
    });
  };

  const handleSaveResults = async () => {
    if (!selectedExamSet || !selectedSubject) {
      setError('Please select an exam set and subject');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const schoolId = user?.user_metadata?.school_id;

      if (!isSecondary) {
        const resultsToSave = Object.entries(examResults)
          .filter(([_, data]) => data.marks && data.totalMarks)
          .map(([studentId, data]) => ({
            school_id: schoolId,
            exam_set_id: selectedExamSet,
            student_id: studentId,
            class_name: className,
            subject: selectedSubject,
            marks_obtained: parseFloat(data.marks),
            total_marks: parseFloat(data.totalMarks),
            grade: data.grade || calculatePrimaryGrade(parseFloat(data.marks), parseFloat(data.totalMarks), selectedSubject)
          }));

        if (resultsToSave.length === 0) {
          setError('Please enter marks for at least one student');
          return;
        }

        const { error: insertError } = await supabase
          .from('exam_results')
          .upsert(resultsToSave, { onConflict: 'exam_set_id,student_id,subject', ignoreDuplicates: false });
        if (insertError) throw insertError;

        setSuccess(`Successfully saved ${resultsToSave.length} exam results`);
        setExamResults({});
      } else {
        // Secondary
        const resultsToSave = Object.entries(examResultsSecondary)
          .map(([studentId, data]) => {
            const activityNum = parseFloat(data.activityScore) || 0;
            const descriptor = calculateDescriptor(activityNum);
            const formativeNum = descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.formative) || 0, 0), 40);
            const examNum = descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.exam) || 0, 0), 60);
            const finalNum = formativeNum + examNum;
            const grade = calculateSecondaryGrade(finalNum);
            return {
              school_id: schoolId,
              exam_set_id: selectedExamSet,
              student_id: studentId,
              class_name: className,
              subject: selectedSubject,
              topic: data.topic || topicFilter || '',
              activity_score: activityNum,
              descriptor,
              formative: formativeNum,
              exam: examNum,
              final: finalNum,
              grade,
              remark: data.remark || '',
              teacher_initials: data.initials || teacherInitials || '',
            };
          });

        // Validate at least one filled row
        const anyValid = resultsToSave.some(r => r.topic || r.activity_score !== 0 || r.formative !== 0 || r.exam !== 0 || r.remark);
        if (!anyValid) {
          setError('Please enter at least one secondary record');
          return;
        }

        const { error: insertError } = await supabase
          .from('exam_results')
          .upsert(resultsToSave as any, { onConflict: 'exam_set_id,student_id,subject', ignoreDuplicates: false });
        if (insertError) throw insertError;

        setSuccess(`Successfully saved ${resultsToSave.length} exam results`);
        setExamResultsSecondary({});
      }
      
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Failed to save exam results');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Insert Exam Results</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-white/80 text-sm">Class: {className}</p>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                isSecondary 
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-green-600/20 text-green-300 border border-green-500/30'
              }`}>
                {isSecondary ? 'Secondary Format' : 'Primary Format'}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGradeSettings(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              Grade Settings
            </button>
            <button
              onClick={() => router.push('/dashboard/teacher/exam-results')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Classes
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-4 py-3">
            {success}
          </div>
        )}

        {/* Exam Set and Subject Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border_white/10 bg-white/10 backdrop-blur-md p-6 mb-6"
        >
          <h3 className="text-white font-medium mb-4">Select Exam Set and Subject</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text_white/80 text-sm mb-2">Exam Set</label>
              <select
                value={selectedExamSet}
                onChange={(e) => setSelectedExamSet(e.target.value)}
                className="w-full rounded-lg border border_white/10 bg-white/10 text-white px-3 py-2"
              >
                <option value="">Select Exam Set</option>
                {examSets.map(examSet => (
                  <option key={examSet.id} value={examSet.id} className="bg-slate-800">
                    {examSet.name} - Term {examSet.term} {examSet.year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text_white/80 text-sm mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full rounded-lg border border_white/10 bg-white/10 text-white px-3 py-2"
              >
                <option value="">Select Subject</option>
                {teacherSubjects.map(subject => (
                  <option key={subject} value={subject} className="bg-slate-800">
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            {isSecondary && (
              <div>
                <label className="block text_white/80 text-sm mb-2">Topic (for this entry)</label>
                <input
                  type="text"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="e.g., 1 Classification"
                  className="w-full rounded-lg border border_white/10 bg-white/10 text-white px-3 py-2"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Students and Marks/Input */}
        {selectedExamSet && selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <h3 className="text-white font-medium">Enter {isSecondary ? 'Scores' : 'Marks'} for {selectedSubject}</h3>
              <p className="text-white/80 text-sm mt-1">
                {isSecondary ? 'Secondary format with Activity, Formative, Exam, Final, Grade.' : 'Enter marks out of 100.'}
              </p>
            </div>
            <div className="overflow-x-auto">
              {!isSecondary ? (
                <table className="min-w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Marks Obtained</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Total Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {students.map((student) => {
                      const marks = examResults[student.student_id]?.marks || '';
                      const totalMarks = examResults[student.student_id]?.totalMarks || '100';
                      const grade = examResults[student.student_id]?.grade || '';
                      return (
                        <tr key={student.student_id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap text-white">{student.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="number" step="0.1" min="0" value={marks} onChange={(e) => handleMarksChange(student.student_id, 'marks', e.target.value)} className="w-24 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" placeholder="0" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="number" value="100" readOnly className="w-24 rounded border border-white/10 bg-white/5 text-white/60 px-2 py-1 text-sm cursor-not-allowed" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded ${
                              grade === 'A' ? 'bg-green-600/20 text-green-300' :
                              grade === 'B' ? 'bg-blue-600/20 text-blue-300' :
                              grade === 'C' ? 'bg-yellow-600/20 text-yellow-300' :
                              grade === 'D' ? 'bg-orange-600/20 text-orange-300' :
                              grade === 'F' ? 'bg-red-600/20 text-red-300' :
                              'text-white/60'
                            }`}>{grade || '-'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Topic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Activity [3]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Descriptor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Formative [40]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Exam [60]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Final</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Remark</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Initials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {students.map(student => {
                      const row = examResultsSecondary[student.student_id] || { topic: topicFilter || '', activityScore: '', descriptor: '', formative: '', exam: '', final: '', grade: '', remark: '', initials: teacherInitials };
                      const missed = row.descriptor === 'Missed';
                      return (
                        <tr key={student.student_id} className={`hover:bg-white/5 ${missed ? 'opacity-70' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-white">{student.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="text" value={row.topic} onChange={e => handleSecondaryChange(student.student_id, 'topic', e.target.value)} placeholder="e.g., 1 Classification" className="w-44 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max="3" step="0.1" value={row.activityScore} onChange={e => handleSecondaryChange(student.student_id, 'activityScore', e.target.value)} className="w-20 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-white/90">
                            {row.descriptor || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max="40" step="1" value={row.formative} onChange={e => handleSecondaryChange(student.student_id, 'formative', e.target.value)} disabled={missed} className={`w-24 rounded border border-white/10 ${missed ? 'bg-white/5 text-white/50 cursor-not-allowed' : 'bg-white/10 text-white'} px-2 py-1 text-sm`} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max="60" step="1" value={row.exam} onChange={e => handleSecondaryChange(student.student_id, 'exam', e.target.value)} disabled={missed} className={`w-24 rounded border border-white/10 ${missed ? 'bg_WHITE/5 text_white/50 cursor-not-allowed' : 'bg-white/10 text-white'} px-2 py-1 text-sm`} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-white">{row.final || '0'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-white">{row.grade || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input value={row.remark} onChange={e => handleSecondaryChange(student.student_id, 'remark', e.target.value)} placeholder="Comment" className="w-56 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-white/90">{row.initials || teacherInitials || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-6 border-t border-white/10">
              <button onClick={handleSaveResults} disabled={saving} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Exam Results'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Grade Settings Modal */}
        {showGradeSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-semibold">Grade Settings</h2>
                <button onClick={() => setShowGradeSettings(false)} className="text-white/60 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                {teacherSubjects.map(subject => (
                  <div key={subject} className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">{subject}</h3>
                    <div className="space-y-2">
                      {(gradeSettings[subject] || getDefaultGrades()).map((grade, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input type="number" min="0" max="100" value={grade.min} onChange={(e) => {
                            const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                            newGrades[index].min = parseInt(e.target.value) || 0;
                            setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                          }} className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                          <span className="text-white/80">to</span>
                          <input type="number" min="0" max="100" value={grade.max} onChange={(e) => {
                            const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                            newGrades[index].max = parseInt(e.target.value) || 100;
                            setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                          }} className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                          <span className="text-white/80">=</span>
                          <input type="text" value={grade.grade} onChange={(e) => {
                            const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                            newGrades[index].grade = e.target.value;
                            setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                          }} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGradeSettings(false)} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
