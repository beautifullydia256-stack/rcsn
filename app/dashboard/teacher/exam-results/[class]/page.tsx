"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { createServerClient } from '@supabase/ssr';
import { useRouter, useParams } from "next/navigation";
import { getSectionForClass } from "@/src/templates/primary";
import {
  NURSERY_PERFORMANCE_OPTIONS,
  NURSERY_PERFORMANCE_COLOR_MAP,
  NURSERY_SKILL_GRID,
  getReadableTextColor as getNurseryReadableTextColor,
  applyAlphaToHex,
  normalizeNurseryPerformanceWord,
  sanitizeNurseryKey,
  getNurserySkillKeyVariants,
  NurseryPerformanceRecord,
  NurseryPerformanceWord
} from "@/src/templates/primary/nurseryPerformance";

export default function TeacherExamResultsClassPage() {
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(params.class as string);
  
  // Detect if this is a Secondary school class
  const isSecondary = useMemo(() => {
    const trimmed = className?.trim() || "";
    // O-Level classes: Senior 1 - Senior 4 (S1-S4)
    // Matches variants like: "Senior 1", "Senior1", "S1", "S 1", case-insensitive, and allows suffix like streams
    const matches = /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
    return matches;
  }, [className]);
  const isALevel = useMemo(() => {
    const trimmed = className?.trim() || "";
    return /^(senior\s*[5-6]|s\s*[5-6])/i.test(trimmed);
  }, [className]);
  
  // Detect Primary school section (Baby Class, Nursery, Lower, Upper)
  const primarySection = useMemo(() => {
    if (isSecondary || isALevel) return null;
    return getSectionForClass(className);
  }, [className, isSecondary, isALevel]);
  const isNursery = primarySection === 'Nursery /Baby Class';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [examSets, setExamSets] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>("");
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string>("");
  const [selectedExamSet, setSelectedExamSet] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  // Primary layout state (existing)
  const [examResults, setExamResults] = useState<Record<string, { marks: string; totalMarks: string; grade: string; remark?: string }>>({});
  // Primary aggregate points for core subjects (English, Mathematics, Science, Social Studies)
  const [primaryAggregatePoints, setPrimaryAggregatePoints] = useState<Record<string, { eng: string; math: string; sci: string; sst: string }>>({});
  const [nurseryPerformances, setNurseryPerformances] = useState<Record<string, NurseryPerformanceRecord>>({});
  const [nurseryDirtyStudents, setNurseryDirtyStudents] = useState<Record<string, boolean>>({});
  const nurserySkillsFlat = useMemo(() => NURSERY_SKILL_GRID.flat().filter(skill => skill.label), []);
  const nurserySkillVariantLookup = useMemo(() => {
    const map = new Map<string, string>();
    nurserySkillsFlat.forEach(skill => {
      getNurserySkillKeyVariants(skill).forEach(variant => {
        map.set(variant, skill.key);
      });
    });
    return map;
  }, [nurserySkillsFlat]);
  const canonicalizeNurserySkillKey = useCallback((rawKey: unknown): string | null => {
    const sanitized = sanitizeNurseryKey(rawKey);
    if (!sanitized) return null;
    const canonical = nurserySkillVariantLookup.get(sanitized) || sanitized;
    if (canonical === 'placeholder') return null;
    return canonical;
  }, [nurserySkillVariantLookup]);
  const activeNurserySkill = useMemo(() => {
    if (!isNursery || !selectedSubject) return null;
    const normalized = sanitizeNurseryKey(selectedSubject);
    return nurserySkillsFlat.find(skill => sanitizeNurseryKey(skill.label) === normalized || sanitizeNurseryKey(skill.key) === normalized) || null;
  }, [isNursery, selectedSubject, nurserySkillsFlat]);
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
  const [showTeacherRemarks, setShowTeacherRemarks] = useState(false);
  const [showClassTeacherComments, setShowClassTeacherComments] = useState(false);
  const [teacherRemarksRanges, setTeacherRemarksRanges] = useState<Array<{ id?: string; min_percent: number; max_percent: number; comment_text: string }>>([
    { min_percent: 0, max_percent: 40, comment_text: 'Needs more effort. Try harder next time.' },
    { min_percent: 41, max_percent: 60, comment_text: 'Fair work. You can do better.' },
    { min_percent: 61, max_percent: 80, comment_text: 'Good work. Keep it up!' },
    { min_percent: 81, max_percent: 100, comment_text: 'Excellent! Keep shining!' },
  ]);

  // Helper: load teacher remarks ranges for current subject
  const loadTeacherRemarksRanges = async (subjectName: string) => {
    try {
      const resTRS = await fetch(`/api/teacher-remarks-settings?subject=${encodeURIComponent(subjectName)}`, { cache: 'no-store' as any });
      if (resTRS.ok) {
        const j = await resTRS.json();
        const ranges = Array.isArray(j.ranges) ? j.ranges : [];
        const sanitized = ranges
          .filter((r:any) => r && r.min_percent != null && r.max_percent != null)
          .map((r:any) => ({ id: r.id, min_percent: Number(r.min_percent)||0, max_percent: Number(r.max_percent)||0, comment_text: String(r.comment_text||'') }));
        // Always set the ranges, even if empty - this ensures we clear old data
        setTeacherRemarksRanges(sanitized);
      } else {
        // If API call fails, clear the ranges
        setTeacherRemarksRanges([]);
      }
    } catch (error) {
      // If there's an error, clear the ranges
      console.error('Error loading teacher remarks ranges:', error);
      setTeacherRemarksRanges([]);
    }
  };
  const [gradeSettings, setGradeSettings] = useState<Record<string, Array<{min: number; max: number; grade: string}>>>({});
  // Comments functionality removed per request
  const [gradeRemarks, setGradeRemarks] = useState<Record<string, string>>({
    A: 'Exceptional! Your performance is outstanding, demonstrating innovative and creative application of knowledge. Maintain this excellent standard.',
    B: 'Outstanding! Strive for excellence to reach the next level.',
    C: 'Satisfactory, but there is room for improvement. Work harder to meet expectations.',
    D: 'Fair effort. Keep working to improve your understanding and performance.',
    E: 'Your effort needs Improvement. Work diligently to boost your performance.',
    F: 'Insufficient performance. Seek support and put in more effort to improve.'
  });
  const [autoRemarkEnabled, setAutoRemarkEnabled] = useState<boolean>(true);
  const [oLevelFormativeMax, setOLevelFormativeMax] = useState<number>(20);
  // Primary division mapping (aggregate points -> Division)
  const [primaryDivisionSettings, setPrimaryDivisionSettings] = useState({
    div1_min: 4,
    div1_max: 12,
    div2_min: 13,
    div2_max: 23,
    div3_min: 24,
    div3_max: 29,
    div4_min: 30,
    div4_max: 34,
    u_min: 35,
    u_max: 36,
  });
  const [selectedLevel, setSelectedLevel] = useState<'olevel' | 'alevel'>('olevel');
  const [gradeRemarksOLevel, setGradeRemarksOLevel] = useState<Record<string, string>>({
    A: 'Exceptional! Your performance is outstanding, demonstrating innovative and creative application of knowledge. Maintain this excellent standard.',
    B: 'Outstanding! Strive for excellence to reach the next level.',
    C: 'Satisfactory, but there is room for improvement. Work harder to meet expectations.',
    D: 'Fair effort. Keep working to improve your understanding and performance.',
    E: 'Your effort needs Improvement. Work diligently to boost your performance.',
    F: 'Insufficient performance. Seek support and put in more effort to improve.'
  });
  const [gradeRemarksALevel, setGradeRemarksALevel] = useState<Record<string, string>>({
    A: 'Exceptional! Your performance is outstanding, demonstrating innovative and creative application of knowledge. Maintain this excellent standard.',
    B: 'Outstanding! Strive for excellence to reach the next level.',
    C: 'Satisfactory, but there is room for improvement. Work harder to meet expectations.',
    D: 'Fair effort. Keep working to improve your understanding and performance.',
    E: 'Your effort needs Improvement. Work diligently to boost your performance.',
    F: 'Insufficient performance. Seek support and put in more effort to improve.'
  });

  // Auto-set level based on class format
  useEffect(() => {
    if (isSecondary) {
      setSelectedLevel('olevel');
    } else if (isALevel) {
      setSelectedLevel('alevel');
    } else {
      setSelectedLevel('olevel');
    }
  }, [isSecondary, isALevel]);

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
          const parts = nameFromMeta.trim().split(/\s+/).filter(Boolean);
          const first = (parts[0] || '').charAt(0).toUpperCase();
          const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').charAt(0).toUpperCase();
          const initials = [first, last].filter(Boolean).join('.');
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
            // Get school_id from user metadata instead of users table to avoid 406 errors
            const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
            const schoolId = userMetadata.school_id;
            const teacherName = userMetadata.name || userMetadata.teacher_name;
            const userEmail = user.email;
            
            if (schoolId) {
              userData = {
                school_id: schoolId,
                name: teacherName,
                email: userEmail,
                user_metadata: userMetadata
              };
            }
          } catch (err) {
            console.error('Exception fetching user data directly:', err);
          }
        }

        schoolId = schoolId || (userData?.school_id as string | undefined);

        // Fill initials from users.name if not from metadata
        const fallbackName = (userData?.name as string | undefined) || undefined;
          if (!nameFromMeta && fallbackName) {
          const parts = fallbackName.trim().split(/\s+/).filter(Boolean);
          const first = (parts[0] || '').charAt(0).toUpperCase();
          const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').charAt(0).toUpperCase();
          const initials = [first, last].filter(Boolean).join('.');
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

        // Cache resolved teacher id for later use (saving)
        setResolvedTeacherId(teacherId);
        if (schoolId) setResolvedSchoolId(schoolId);
        
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
            .maybeSingle();
            
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
          
          const processedSubjects = isNursery
            ? nurserySkillsFlat.map(skill => skill.label)
            : teacherSubjects;
          
          setTeacherSubjects(processedSubjects);
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
          
          const processedSubjects = isNursery
            ? nurserySkillsFlat.map(skill => skill.label)
            : subjects;
          
          setTeacherSubjects(processedSubjects);
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

        // Load Teacher's Remarks Settings for selected subject (if any)
        if (selectedSubject) {
          try {
            const resTRS = await fetch(`/api/teacher-remarks-settings?subject=${encodeURIComponent(selectedSubject)}`, { cache: 'no-store' as any });
            if (resTRS.ok) {
              const j = await resTRS.json();
              const ranges = Array.isArray(j.ranges) ? j.ranges : [];
              const sanitized = ranges
                .filter((r:any) => r && r.min_percent != null && r.max_percent != null)
                .map((r:any) => ({ id: r.id, min_percent: Number(r.min_percent)||0, max_percent: Number(r.max_percent)||0, comment_text: String(r.comment_text||'') }));
              if (sanitized.length > 0) setTeacherRemarksRanges(sanitized);
            }
          } catch {}
        }

        // Check if current teacher is class teacher for this class (supports multiple via class_teachers)
        try {
          const currentTeacherId = teacherId || user.id;
          const { data: ctRows } = await supabase
            .from('class_teachers')
            .select('id')
            .eq('school_id', schoolId)
            .eq('class_name', className)
            .eq('teacher_id', currentTeacherId)
            .limit(1);
          setIsClassTeacher(!!(ctRows && ctRows.length > 0));
        } catch (err) {
          console.error('Error checking class teacher status:', err);
          setIsClassTeacher(false);
        }

        // Load Class Teacher's ranges for this class
        try {
          const resCT = await fetch(`/api/class-teacher-comments-settings?class=${encodeURIComponent(className)}`, { cache: 'no-store' as any });
          if (resCT.ok) {
            const j = await resCT.json();
            const ranges = Array.isArray(j.ranges) ? j.ranges : [];
            const sanitized = ranges
              .filter((r:any) => r && r.min_percent != null && r.max_percent != null)
              .map((r:any) => ({ id: r.id, min_percent: Number(r.min_percent)||0, max_percent: Number(r.max_percent)||0, comment_text: String(r.comment_text||'') }));
            if (sanitized.length > 0) setClassTeacherRanges(sanitized);
          }
        } catch {}

        // Comments removed per request

        // (Removed) Loading Teacher's Remarks default per class per request

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

  const getPrimaryBadgeClass = (grade: string): string => {
    const gradeLower = (grade || '').toLowerCase();
    // Support both old format (Credit 5, Division 1) and new format (C5, D1)
    switch (gradeLower) {
      case 'division 1':
      case 'd1':
        return 'bg-green-600/20 text-green-300';
      case 'division 2':
      case 'd2':
        return 'bg-blue-600/20 text-blue-300';
      case 'credit 3':
      case 'c3':
        return 'bg-cyan-600/20 text-cyan-300';
      case 'credit 4':
      case 'c4':
        return 'bg-yellow-600/20 text-yellow-300';
      case 'credit 5':
      case 'c5':
        return 'bg-orange-500/20 text-orange-300';
      case 'credit 6':
      case 'c6':
        return 'bg-orange-700/20 text-orange-400';
      case 'pass 7':
      case 'p7':
        return 'bg-red-500/20 text-red-300';
      case 'pass 8':
      case 'p8':
        return 'bg-red-600/20 text-red-400';
      case 'u (ungraded)':
      case 'u':
        return 'bg-gray-600/20 text-gray-300';
      case 'f9':
        return 'bg-red-900/20 text-red-500';
      default:
        return 'text-white/60';
    }
  };

  // Primary grading (Percentage-based) - Subject grading scale
  // Division 1: 75-100, Division 2: 70-74, Credit 3: 65-69, Credit 4: 60-64,
  // Credit 5: 55-59, Credit 6: 50-54, Pass 7: 45-49, Pass 8: 40-44, F9: 0-39
  // Using short format: D1, D2, C3, C4, C5, C6, P7, P8, F9
  const getDefaultGrades = () => [
    { min: 75, max: 100, grade: 'D1' },
    { min: 70, max: 74, grade: 'D2' },
    { min: 65, max: 69, grade: 'C3' },
    { min: 60, max: 64, grade: 'C4' },
    { min: 55, max: 59, grade: 'C5' },
    { min: 50, max: 54, grade: 'C6' },
    { min: 45, max: 49, grade: 'P7' },
    { min: 40, max: 44, grade: 'P8' },
    { min: 0, max: 39, grade: 'F9' },
  ];
  const [classTeacherRanges, setClassTeacherRanges] = useState<Array<{ id?: string; min_percent: number; max_percent: number; comment_text: string }>>([
    { min_percent: 0, max_percent: 40, comment_text: 'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.' },
    { min_percent: 41, max_percent: 60, comment_text: 'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.' },
    { min_percent: 61, max_percent: 80, comment_text: 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.' },
    { min_percent: 81, max_percent: 100, comment_text: 'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.' },
  ]);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);

  // Function to refresh class teacher status
  const refreshClassTeacherStatus = async () => {
    if (!resolvedSchoolId || !resolvedTeacherId) {
      console.log('Cannot refresh class teacher status - missing schoolId or teacherId:', { resolvedSchoolId, resolvedTeacherId });
      return;
    }
    
    try {
      console.log('Checking class teacher status for:', { resolvedSchoolId, className, resolvedTeacherId });
      const { data: ctRows } = await supabase
        .from('class_teachers')
        .select('id')
        .eq('school_id', resolvedSchoolId)
        .eq('class_name', className)
        .eq('teacher_id', resolvedTeacherId)
        .limit(1);
      
      const isClassTeacher = !!(ctRows && ctRows.length > 0);
      console.log('Class teacher status result:', { ctRows, isClassTeacher });
      setIsClassTeacher(isClassTeacher);
    } catch (err) {
      console.error('Error checking class teacher status:', err);
      setIsClassTeacher(false);
    }
  };

  // Given an aggregate points value, compute primary Division label
  const getPrimaryDivisionFromAggregate = (aggregatePoints: number, hasIncompleteResults: boolean = false): string => {
    // If student has incomplete/missing subject results, return U (Ungraded)
    if (hasIncompleteResults) return 'U (Ungraded)';
    
    const s = primaryDivisionSettings;
    if (aggregatePoints >= s.div1_min && aggregatePoints <= s.div1_max) return 'Division 1';
    if (aggregatePoints >= s.div2_min && aggregatePoints <= s.div2_max) return 'Division 2';
    if (aggregatePoints >= s.div3_min && aggregatePoints <= s.div3_max) return 'Division 3';
    if (aggregatePoints >= s.div4_min && aggregatePoints <= s.div4_max) return 'Division 4';
    if (aggregatePoints >= s.u_min && aggregatePoints <= s.u_max) return 'U (Ungraded)';
    
    // For any aggregate above 36 or other edge cases
    if (aggregatePoints > 36) return 'U (Ungraded)';
    
    return '';
  };

  const getPrimaryAggregateForStudent = (studentId: string) => {
    const row = primaryAggregatePoints[studentId];
    const e = parseInt(row?.eng || '0') || 0;
    const m = parseInt(row?.math || '0') || 0;
    const s = parseInt(row?.sci || '0') || 0;
    const t = parseInt(row?.sst || '0') || 0;
    const agg = e + m + s + t;
    const div = getPrimaryDivisionFromAggregate(agg);
    return { agg, div };
  };

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
  const handleMarksChange = (studentId: string, field: 'marks' | 'totalMarks' | 'remark', value: string) => {
    if (field === 'remark') {
      // Handle remark field separately
      setExamResults(prev => ({
        ...prev,
        [studentId]: { 
          ...prev[studentId],
          remark: value
        }
      }));
      return;
    }
    
    const newMarks = field === 'marks' ? value : (examResults[studentId]?.marks || '');
    const newTotalMarks = '100'; // Always 100
    const marksNum = parseFloat(newMarks) || 0;
    const totalMarksNum = parseFloat(newTotalMarks) || 100;
    const grade = calculatePrimaryGrade(marksNum, totalMarksNum, selectedSubject);
    const currentGradeRemarks = selectedLevel === 'olevel' ? gradeRemarksOLevel : gradeRemarksALevel;
    // Auto remark from settings ranges
    const percent = Math.max(0, Math.min(100, marksNum));
    const trRule = teacherRemarksRanges.find(r => percent >= r.min_percent && percent <= r.max_percent);
    const autoRemarkFromRanges = trRule?.comment_text || '';
    const autoRemark = autoRemarkEnabled ? autoRemarkFromRanges : (examResults[studentId]?.remark || '');
    setExamResults(prev => ({
      ...prev,
      [studentId]: { 
        marks: newMarks, 
        totalMarks: newTotalMarks, 
        grade, 
        remark: autoRemark
      }
    }));
  };

  const handleNurserySelection = (studentId: string, skillKey: string, performance: NurseryPerformanceWord) => {
    let changed = false;
    setNurseryPerformances(prev => {
      const current = prev[studentId] || {};
      if (current[skillKey] === performance) {
        return prev;
      }
      changed = true;
      return {
        ...prev,
        [studentId]: {
          ...current,
          [skillKey]: performance
        }
      };
    });
    if (changed) {
      setNurseryDirtyStudents(prev => ({ ...prev, [studentId]: true }));
    }
  };

  const handleNurseryClear = (studentId: string, skillKey: string) => {
    let changed = false;
    setNurseryPerformances(prev => {
      const current = prev[studentId];
      if (!current || !current[skillKey]) return prev;
      const next = { ...current };
      delete next[skillKey];
      changed = true;
      return {
        ...prev,
        [studentId]: next
      };
    });
    if (changed) {
      setNurseryDirtyStudents(prev => ({ ...prev, [studentId]: true }));
    }
  };

  // Secondary change handler: Activity is fully manual; Formative updates Activity; both allow clearing
  const handleSecondaryChange = (studentId: string, field: keyof typeof examResultsSecondary[string], value: string) => {
    setExamResultsSecondary(prev => {
      const current = prev[studentId] || { topic: topicFilter || "", activityScore: "", descriptor: "", formative: "", exam: "", final: "", grade: "", remark: "", initials: teacherInitials };
      let next = { ...current, [field]: value } as typeof current;
      const trunc1 = (n: number) => Math.trunc((n || 0) * 10) / 10;
      const trunc0 = (n: number) => Math.trunc(n || 0);

      if (field === 'activityScore') {
        // Do NOT format or sync while typing activity; allow any string (including empty)
        next.activityScore = value;
      } else if (field === 'formative') {
        if (value === '') {
          next.formative = '';
          next.activityScore = '';
      } else {
          let f = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(value) || 0));
          f = trunc0(f);
          const a = trunc1((f / oLevelFormativeMax) * 3);
          next.formative = String(f);
          next.activityScore = a.toFixed(1);
        }
      } else if (field === 'exam') {
        if (value === '') {
          next.exam = '' as any;
        } else {
          let e = Math.max(0, Math.min(80, parseFloat(value) || 0));
          next.exam = String(trunc0(e));
        }
      }

      const aNum = Math.max(0, Math.min(3, parseFloat(next.activityScore)));
      const fNum = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(next.formative)));
      const eNum = Math.max(0, Math.min(80, parseFloat(next.exam)));
      const aSafe = isNaN(aNum) ? 0 : aNum;
      const fSafe = isNaN(fNum) ? 0 : fNum;
      const eSafe = isNaN(eNum) ? 0 : eNum;
      next.descriptor = calculateDescriptor(aSafe);
      const finalNum = Math.trunc(fSafe + eSafe);
      next.final = String(finalNum);
      const newGrade = calculateSecondaryGrade(finalNum);
      next.grade = newGrade;
      if (autoRemarkEnabled) {
        const finalNum = parseFloat(next.final) || 0;
        const trRule = teacherRemarksRanges.find(r => finalNum >= r.min_percent && finalNum <= r.max_percent);
        next.remark = trRule?.comment_text || '';
      }
      // keep initials auto
      next.initials = teacherInitials || next.initials;
      return { ...prev, [studentId]: next };
    });
  };

  // Secondary blur handler: clamp and two-way sync
  const handleSecondaryBlur = (studentId: string, field: keyof typeof examResultsSecondary[string]) => {
    setExamResultsSecondary(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      const trunc1 = (n: number) => Math.trunc((n || 0) * 10) / 10;
      const trunc0 = (n: number) => Math.trunc(n || 0);
      let next = { ...current };
      if (field === 'formative') {
        // clamp formative, sync activity
        const f = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(next.formative) || 0));
        next.formative = String(trunc0(f));
        const a = Math.max(0, Math.min(3, (f / oLevelFormativeMax) * 3));
        next.activityScore = (trunc1(a)).toFixed(1);
      } else if (field === 'activityScore') {
        // clamp activity, sync formative
        const a = Math.max(0, Math.min(3, parseFloat(next.activityScore) || 0));
        next.activityScore = (trunc1(a)).toFixed(1);
        const f = Math.max(0, Math.min(oLevelFormativeMax, (a / 3) * oLevelFormativeMax));
        next.formative = String(trunc0(f));
      } else if (field === 'exam') {
        const e = Math.max(0, Math.min(80, parseFloat(next.exam) || 0));
        next.exam = String(trunc0(e));
      }
      // Recompute final after clamping
      const fnum = parseFloat(next.formative) || 0;
      const enum_ = parseFloat(next.exam) || 0;
      next.final = String(trunc0(fnum + enum_));
      next.grade = calculateSecondaryGrade(trunc0(fnum + enum_));
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
      const teacherIdForSave = resolvedTeacherId || (user?.user_metadata as any)?.teacher_id || "";

      if (!teacherIdForSave) {
        setError('Unable to resolve teacher ID. Please reload and try again.');
        return;
      }

      if (!isSecondary) {
        if (isNursery) {
          const dirtyStudentIds = Object.keys(nurseryDirtyStudents).filter(Boolean);
        const studentsToPersist = dirtyStudentIds.length > 0
          ? dirtyStudentIds
          : Object.entries(nurseryPerformances)
              .filter(([_, rec]) => rec && Object.values(rec).some(Boolean))
              .map(([studentId]) => studentId);

        if (studentsToPersist.length === 0) {
          setError('Please select performance for at least one student');
          return;
        }

        const saves = studentsToPersist.map(async (studentId) => {
            const performances = nurseryPerformances[studentId] || {};
            const payload: Record<string, NurseryPerformanceWord> = {};
            Object.entries(performances).forEach(([skillKey, value]) => {
              if (!value) return;
              const canonicalKey = canonicalizeNurserySkillKey(skillKey);
              if (!canonicalKey) return;
              payload[canonicalKey] = value;
            });
            const payloadForRpc = Object.keys(payload).length ? payload : null;
            console.debug('Saving nursery performance', {
              studentId,
              subject: activeNurserySkill?.label || selectedSubject,
              payload: payloadForRpc
            });

            const resp = await supabase.rpc('teacher_upsert_exam_result_primary', {
              p_school_id: schoolId,
              p_exam_set_id: selectedExamSet,
              p_student_id: studentId,
              p_class_name: className,
              p_subject: activeNurserySkill?.label || (selectedSubject || '').trim(),
              p_marks_obtained: null,
              p_total_marks: null,
              p_grade: null,
              p_remarks: null,
              p_teacher_id: teacherIdForSave,
              p_teacher_comment: null,
              p_nursery_skills: payloadForRpc
            });

            if (resp.error) {
              console.error('RPC nursery save error:', resp.error);
              throw resp.error;
            }
            if (resp.data && resp.data.success === false) {
              throw new Error(resp.data.error || 'Failed to save nursery performance');
            }
          });

          await Promise.all(saves);
          setSuccess(`Successfully saved nursery performance for ${studentsToPersist.length} ${studentsToPersist.length === 1 ? 'student' : 'students'}`);
          setNurseryDirtyStudents({});

          await new Promise(resolve => setTimeout(resolve, 500));
          await reloadSavedResults();
        } else {
          const entries = Object.entries(examResults).filter(([_, data]) => data.marks && data.totalMarks);
          if (entries.length === 0) {
            setError('Please enter marks for at least one student');
            return;
          }
          // Use secure RPC (server-side checks) for reliability
          // Helper to compute auto teacher comment from rules by average
          const autoTeacherComment = (_avgPercent: number): string => '';

          const saves = entries.map(async ([studentId, data]) => {
            const computedGrade = data.grade || calculatePrimaryGrade(parseFloat(data.marks), parseFloat(data.totalMarks || '100'), selectedSubject);
            const currentGradeRemarks = selectedLevel === 'olevel' ? gradeRemarksOLevel : gradeRemarksALevel;
            const computedRemark = autoRemarkEnabled ? (currentGradeRemarks[computedGrade as keyof typeof currentGradeRemarks] || '') : (data.remark || '');
            const avgPercent = Math.max(0, Math.min(100, parseFloat(data.marks)));
            const teacherComment = autoTeacherComment(avgPercent);
            
            
            const resp = await supabase.rpc('teacher_upsert_exam_result_primary', {
              p_school_id: schoolId,
              p_exam_set_id: selectedExamSet,
              p_student_id: studentId,
              p_class_name: className,
              p_subject: (selectedSubject || '').trim(),
              p_marks_obtained: parseFloat(data.marks),
              p_total_marks: parseFloat(data.totalMarks || '100'),
              p_grade: computedGrade,
              p_remarks: computedRemark,
              p_teacher_id: teacherIdForSave,
              p_teacher_comment: teacherComment || null,
              p_nursery_skills: null
            });
            if (resp.error) {
              console.error('RPC primary save error:', {
                code: resp.error.code,
                message: resp.error.message,
                details: resp.error.details,
                hint: resp.error.hint,
              });
              throw resp.error;
            }
            
          });
          await Promise.all(saves);
          setSuccess(`Successfully saved ${entries.length} exam results`);
          
          // Force reload saved results after successful save
          // Small delay to ensure database is updated
          await new Promise(resolve => setTimeout(resolve, 500));
          await reloadSavedResults();
        }
      } else if (isALevel) {
        // A-Level format - simple marks only
        const entries = Object.entries(examResults).filter(([_, data]) => data.marks && data.totalMarks);
        if (entries.length === 0) {
          setError('Please enter marks for at least one student');
          return;
        }

        const saves = entries.map(async ([studentId, data]) => {
          const computedGrade = data.grade || calculatePrimaryGrade(parseFloat(data.marks), parseFloat(data.totalMarks || '100'), selectedSubject);
          const currentGradeRemarks = gradeRemarksALevel;
          const computedRemark = autoRemarkEnabled ? (currentGradeRemarks[computedGrade as keyof typeof currentGradeRemarks] || '') : (data.remark || '');
          
          const resp = await supabase.rpc('teacher_upsert_exam_result_alevel', {
            p_school_id: schoolId,
            p_exam_set_id: selectedExamSet,
            p_student_id: studentId,
            p_class_name: className,
            p_subject: (selectedSubject || '').trim(),
            p_marks_obtained: parseFloat(data.marks),
            p_total_marks: parseFloat(data.totalMarks || '100'),
            p_grade: computedGrade,
            p_remarks: computedRemark,
            p_teacher_id: teacherIdForSave,
            p_teacher_comment: computedRemark,
            p_paper_number: topicFilter || null
          });
          if (resp.error) {
            console.error('RPC A-Level save error:', {
              code: resp.error.code,
              message: resp.error.message,
              details: resp.error.details,
              hint: resp.error.hint,
            });
            throw resp.error;
          }
        });
        await Promise.all(saves);
        setSuccess(`Successfully saved ${entries.length} exam results`);
        
        // Force reload saved results after successful save
        await new Promise(resolve => setTimeout(resolve, 500));
        await reloadSavedResults();
      } else {
        // Secondary (O-Level)
        // Guard: subject selected
        if (!selectedSubject || !(selectedSubject || '').trim()) {
          setError('Please select a subject');
          return;
        }

        // Build and filter valid rows (at least one numeric > 0 or non-empty text)
        const entries = Object.entries(examResultsSecondary)
          .map(([studentId, data]) => ({ studentId, data }))
          .filter(({ data }) => {
            const a = parseFloat(data.activityScore);
            const f = parseFloat(data.formative);
            const e = parseFloat(data.exam);
            const hasNum = (!isNaN(a) && a > 0) || (!isNaN(f) && f > 0) || (!isNaN(e) && e > 0);
            const hasText = (data.topic && data.topic.trim() !== '') || (data.remark && data.remark.trim() !== '');
            return hasNum || hasText;
          });
        if (entries.length === 0) {
          setError('Please enter at least one secondary record');
          return;
        }
        const autoTeacherComment = (_finalNum: number): string => '';

        const saves = entries.map(async ({ studentId, data }) => {
            const activityNum = parseFloat(data.activityScore) || 0;
            const descriptor = calculateDescriptor(activityNum);
          const formativeCap = typeof oLevelFormativeMax === 'number' ? oLevelFormativeMax : 40;
          const formativeNum = descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.formative) || 0, 0), formativeCap);
          const examNum = descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.exam) || 0, 0), 80);
            const finalNum = formativeNum + examNum;
            const grade = calculateSecondaryGrade(finalNum);
          
          const rpcParams = {
            p_school_id: schoolId,
            p_exam_set_id: selectedExamSet,
            p_student_id: studentId,
            p_class_name: className,
            p_subject: (selectedSubject || '').trim(),
            p_activity_score: activityNum,
            p_descriptor: descriptor,
            p_formative_score: formativeNum,
            p_exam_score: examNum,
            p_final_score: finalNum,
            p_overall_remark: (data.remark || '').trim(),
            p_teacher_initials: data.initials || teacherInitials || '',
            p_teacher_id: teacherIdForSave,
            p_topic: (data.topic || topicFilter || '').trim(),
            p_grade: grade
          };
          
          console.log('Saving secondary exam result with params:', rpcParams);
          
          const resp = await supabase.rpc('teacher_upsert_exam_result_secondary', rpcParams);
          
          console.log('RPC response:', resp);
          
          if (resp.error) {
            console.error('RPC olevel save error:', {
              code: resp.error.code,
              message: resp.error.message,
              details: resp.error.details,
              hint: resp.error.hint,
            });
            setError(resp.error.message || 'Failed to save exam results');
            throw resp.error;
          }
        });
        await Promise.all(saves);
        setSuccess(`Successfully saved ${entries.length} exam results`);
        
        // Force reload saved results after successful save
        // Small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        await reloadSavedResults();
        
        // Additional reload attempt after a longer delay to ensure data is available
        setTimeout(async () => {
          await reloadSavedResults();
        }, 2000);
      }
      
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Failed to save exam results');
    } finally {
      setSaving(false);
    }
  };

  // Prefill previously saved results when exam set + subject selected
  useEffect(() => {
    const prefill = async () => {
      if (!resolvedSchoolId || !resolvedTeacherId || !selectedExamSet || !selectedSubject || students.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('exam_results')
          .select('*')
          .eq('school_id', resolvedSchoolId)
          .eq('class_name', className)
          .eq('exam_set_id', selectedExamSet)
          .eq('subject', selectedSubject)
          .eq('teacher_id', resolvedTeacherId);
        if (error) return;

        const rows = data || [];
        if (!isSecondary) {
          if (isNursery) {
            const map: Record<string, NurseryPerformanceRecord> = {};
            rows.forEach(r => {
              const raw = r.nursery_skill_performance;
              if (!raw) return;
              let source: Record<string, unknown> | null = null;
              if (typeof raw === 'string') {
                try {
                  source = JSON.parse(raw);
                } catch {
                  source = null;
                }
              } else if (typeof raw === 'object') {
                source = raw as Record<string, unknown>;
              }

              if (source) {
              const normalized: NurseryPerformanceRecord = {};
              Object.entries(source).forEach(([skillKey, value]) => {
                const canonicalKey = canonicalizeNurserySkillKey(skillKey);
                if (!canonicalKey) return;
                const normalizedValue = normalizeNurseryPerformanceWord(value);
                if (normalizedValue) {
                  normalized[canonicalKey] = normalizedValue;
                }
              });
              if (Object.keys(normalized).length > 0) {
                map[r.student_id] = normalized;
              }
            }
          });
          setNurseryPerformances(map);
            setNurseryDirtyStudents({});
            setExamResults({});
          } else {
            const map: Record<string, { marks: string; totalMarks: string; grade: string } > = {};
            rows.forEach(r => {
              map[r.student_id] = {
                marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
                totalMarks: r.total_marks != null ? String(r.total_marks) : '',
                grade: r.grade || ''
              };
            });
            setExamResults(map);
          }
        } else {
          const map: Record<string, any> = {};
          rows.forEach(r => {
            map[r.student_id] = {
              topic: r.topic || '',
              activityScore: r.activity_score != null ? String(r.activity_score) : '',
              formative: r.formative_score != null ? String(r.formative_score) : '',
              exam: r.exam_score != null ? String(r.exam_score) : '',
              remark: r.overall_remark || '',
              initials: r.teacher_initials || ''
            };
          });
          setExamResultsSecondary(map);
        }
      } catch {}
    };
    prefill();
  }, [resolvedSchoolId, resolvedTeacherId, selectedExamSet, selectedSubject, students, isSecondary, className]);

  // Allow manual refresh of saved results after save
  const reloadSavedResults = async () => {
    if (!resolvedSchoolId || !resolvedTeacherId || !selectedExamSet || !selectedSubject) {
      console.log('reloadSavedResults: Missing required parameters', {
        resolvedSchoolId, resolvedTeacherId, selectedExamSet, selectedSubject
      });
      return;
    }
    
    try {
      console.log('reloadSavedResults: Loading saved results for', {
        schoolId: resolvedSchoolId,
        className,
        examSetId: selectedExamSet,
        subject: selectedSubject,
        teacherId: resolvedTeacherId
      });
      
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .eq('class_name', className)
        .eq('exam_set_id', selectedExamSet)
        .eq('subject', selectedSubject)
        .eq('teacher_id', resolvedTeacherId);
        
      if (error) {
        console.error('Error loading saved results:', error);
        return;
      }
      
      const rows = data || [];
      console.log('reloadSavedResults: Found', rows.length, 'saved results');
      
      if (!isSecondary && !isALevel) {
        if (isNursery) {
          const map: Record<string, NurseryPerformanceRecord> = {};
          rows.forEach(r => {
            const raw = r.nursery_skill_performance;
            if (!raw) return;
            let source: Record<string, unknown> | null = null;
            if (typeof raw === 'string') {
              try {
                source = JSON.parse(raw);
              } catch {
                source = null;
              }
            } else if (typeof raw === 'object') {
              source = raw as Record<string, unknown>;
            }

            if (!source) return;
            const normalized: NurseryPerformanceRecord = {};
            Object.entries(source).forEach(([skillKey, value]) => {
              const canonicalKey = canonicalizeNurserySkillKey(skillKey);
              if (!canonicalKey) return;
              const normalizedValue = normalizeNurseryPerformanceWord(value);
              if (normalizedValue) {
                normalized[canonicalKey] = normalizedValue;
              }
            });
            if (Object.keys(normalized).length > 0) {
              map[r.student_id] = normalized;
            }
          });
          setNurseryPerformances(map);
          setNurseryDirtyStudents({});
          setExamResults({});
        } else {
          const map: Record<string, { marks: string; totalMarks: string; grade: string } > = {};
          rows.forEach(r => {
            map[r.student_id] = {
              marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
              totalMarks: r.total_marks != null ? String(r.total_marks) : '100',
              grade: r.grade || ''
            };
          });
          setExamResults(map);
        }
      } else if (isALevel) {
        const map: Record<string, { marks: string; totalMarks: string; grade: string } > = {};
        rows.forEach(r => {
          map[r.student_id] = {
            marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
            totalMarks: r.total_marks != null ? String(r.total_marks) : '100',
            grade: r.grade || ''
          };
        });
        setExamResults(map);
        // Set the paper field from the first result (all should have the same paper)
        if (rows.length > 0 && rows[0].paper_number) {
          setTopicFilter(rows[0].paper_number);
        }
      } else {
        const map: Record<string, any> = {};
        rows.forEach(r => {
          const activity = r.activity_score != null ? Number(r.activity_score) : NaN;
          const descriptor = r.descriptor || (isNaN(activity) ? '' : calculateDescriptor(activity));
          map[r.student_id] = {
            topic: r.topic || '',
            activityScore: r.activity_score != null ? String(r.activity_score) : '',
            descriptor,
            formative: r.formative_score != null ? String(r.formative_score) : '',
            exam: r.exam_score != null ? String(r.exam_score) : '',
            final: r.final_score != null ? String(r.final_score) : '',
            grade: r.grade || '',
            remark: r.overall_remark || '',
            initials: r.teacher_initials || ''
          };
        });
        setExamResultsSecondary(map);
        console.log('reloadSavedResults: Updated examResultsSecondary with', Object.keys(map).length, 'entries');
      }
    } catch (err) {
      console.error('Exception in reloadSavedResults:', err);
    }
  };

  // When switching Exam Set or Subject, clear current UI state and load saved rows for the new selection
  useEffect(() => {
    if (!selectedExamSet || !selectedSubject) {
      return;
    }
    setError(null);
    setSuccess(null);
    setExamResults({});
    setExamResultsSecondary({});
    (async () => { await reloadSavedResults(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamSet, selectedSubject]);

  useEffect(() => {
    if (!isNursery) {
      setNurseryPerformances({});
      setNurseryDirtyStudents({});
      return;
    }
    setNurseryPerformances({});
    setNurseryDirtyStudents({});
  }, [selectedExamSet, selectedSubject, className, isNursery]);

  // Refresh class teacher status when teacher ID changes
  useEffect(() => {
    if (resolvedTeacherId && resolvedSchoolId) {
      refreshClassTeacherStatus();
    }
  }, [resolvedTeacherId, resolvedSchoolId, className]);

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
                {isSecondary ? 'O-Level Format' : (isALevel ? 'A-Level Format' : primarySection ? `${primarySection} Section Format` : 'Primary Format')}
              </div>
              {primarySection && (
                <div className="text-xs text-white/60 italic">
                  ✓ Section-specific format
                </div>
              )}
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
              onClick={() => setShowTeacherRemarks(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
            >
              Teacher's Remarks Settings
            </button>
            {isClassTeacher && (
              <button
                onClick={() => setShowClassTeacherComments(true)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
              >
                Class Teacher's Comments Settings
              </button>
            )}
            {/* Comments buttons removed per request */}
            <button
              onClick={() => router.push('/dashboard/teacher/exam-results')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Classes
            </button>
          </div>
        </div>
      {/* Teacher's Remarks Settings Modal */}
      {showTeacherRemarks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold">Teacher's Remarks Settings</h2>
              <button onClick={() => setShowTeacherRemarks(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            {/* Subject selector (teacher assigned subjects only) */}
            <div className="mb-4">
              <label className="block text-white/80 text-sm mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={async (e)=>{
                  const subj = e.target.value;
                  setSelectedSubject(subj);
                  if (subj) await loadTeacherRemarksRanges(subj);
                }}
                className="w-full max-w-xs rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
              >
                <option className="bg-slate-800" value="">Select Subject</option>
                {teacherSubjects.map(s => (
                  <option key={s} value={s} className="bg-slate-800">{s}</option>
                ))}
              </select>
              <p className="text-xs text-white/50 mt-1">Only subjects assigned to you for {className} are listed.</p>
            </div>
            <div className="space-y-3">
              {teacherRemarksRanges.map((r, idx) => (
                <div key={`${r.id || 'new'}-${idx}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border border-white/10 rounded-lg p-3">
                  <label className="text-white/70 text-sm">Min %
                    <input type="number" min={0} max={100} value={r.min_percent}
                      onChange={e=>{
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)||0));
                        setTeacherRemarksRanges(prev => prev.map((x,i)=> i===idx ? { ...x, min_percent: v } : x));
                      }}
                      className="w-full mt-1 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </label>
                  <label className="text-white/70 text-sm">Max %
                    <input type="number" min={0} max={100} value={r.max_percent}
                      onChange={e=>{
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)||0));
                        setTeacherRemarksRanges(prev => prev.map((x,i)=> i===idx ? { ...x, max_percent: v } : x));
                      }}
                      className="w-full mt-1 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </label>
                  <div className="md:col-span-3">
                    <label className="text-white/70 text-sm">Comment</label>
                    <textarea value={r.comment_text}
                      onChange={e=> setTeacherRemarksRanges(prev => prev.map((x,i)=> i===idx ? { ...x, comment_text: e.target.value } : x))}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={()=> setTeacherRemarksRanges(prev => prev.filter((_,i)=>i!==idx))} className="px-3 py-2 rounded bg-red-500 hover:bg-red-400 text-white text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={()=> setTeacherRemarksRanges(prev => [...prev, { min_percent: 0, max_percent: 100, comment_text: '' }])} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Add Range</button>
              <div className="flex gap-2">
                <button onClick={()=> setShowTeacherRemarks(false)} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Close</button>
                <button onClick={async ()=>{
                  try {
                    // ensure a subject is selected; auto pick first if none
                    let subj = selectedSubject;
                    if (!subj) {
                      if (teacherSubjects.length === 0) {
                        alert('No assigned subjects found for this class.');
                        return;
                      }
                      subj = teacherSubjects[0];
                      setSelectedSubject(subj);
                    }
                    const payload = teacherRemarksRanges
                      .filter(r => r.min_percent < r.max_percent)
                      .map(r => ({ min_percent: r.min_percent, max_percent: r.max_percent, comment_text: r.comment_text }));
                    const resp = await fetch('/api/teacher-remarks-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subj, ranges: payload }) });
                    if (!resp.ok) {
                      const j = await resp.json().catch(()=>({}));
                      throw new Error(j.error || 'Failed to save');
                    }
                    alert("Teacher's remarks settings saved");
                    setShowTeacherRemarks(false);
                  } catch (e:any) {
                    alert(e.message);
                  }
                }} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Teacher's Comments Settings Modal */}
      {showClassTeacherComments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold">Class Teacher's Comments Settings - {className}</h2>
              <button onClick={() => setShowClassTeacherComments(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              {classTeacherRanges.map((r, idx) => (
                <div key={`${r.id || 'new'}-${idx}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border border-white/10 rounded-lg p-3">
                  <label className="text-white/70 text-sm">Min %
                    <input type="number" min={0} max={100} value={r.min_percent}
                      onChange={e=>{
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)||0));
                        setClassTeacherRanges(prev => prev.map((x,i)=> i===idx ? { ...x, min_percent: v } : x));
                      }}
                      className="w-full mt-1 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </label>
                  <label className="text-white/70 text-sm">Max %
                    <input type="number" min={0} max={100} value={r.max_percent}
                      onChange={e=>{
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value)||0));
                        setClassTeacherRanges(prev => prev.map((x,i)=> i===idx ? { ...x, max_percent: v } : x));
                      }}
                      className="w-full mt-1 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </label>
                  <div className="md:col-span-3">
                    <label className="text-white/70 text-sm">Comment</label>
                    <textarea value={r.comment_text}
                      onChange={e=> setClassTeacherRanges(prev => prev.map((x,i)=> i===idx ? { ...x, comment_text: e.target.value } : x))}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded border border-white/20 bg-white/10 text-white text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={()=> setClassTeacherRanges(prev => prev.filter((_,i)=>i!==idx))} className="px-3 py-2 rounded bg-red-500 hover:bg-red-400 text-white text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={()=> setClassTeacherRanges(prev => [...prev, { min_percent: 0, max_percent: 100, comment_text: '' }])} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Add Range</button>
              <div className="flex gap-2">
                <button onClick={()=> setShowClassTeacherComments(false)} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Close</button>
                <button onClick={async ()=>{
                  try {
                    const payload = classTeacherRanges
                      .filter(r => r.min_percent < r.max_percent)
                      .map(r => ({ min_percent: r.min_percent, max_percent: r.max_percent, comment_text: r.comment_text }));
                    const resp = await fetch('/api/class-teacher-comments-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_name: className, ranges: payload }) });
                    if (!resp.ok) {
                      const j = await resp.json().catch(()=>({}));
                      throw new Error(j.error || 'Failed to save');
                    }
                    alert("Class Teacher's comments settings saved");
                    setShowClassTeacherComments(false);
                  } catch (e:any) {
                    alert(e.message);
                  }
                }} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            {(isSecondary || isALevel) && (
              <div>
                <label className="block text_white/80 text-sm mb-2">Paper</label>
                <input
                  type="text"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder={isALevel ? "e.g., Paper 1" : "e.g., 1 Classification"}
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-medium">Enter {isSecondary ? 'Scores' : 'Marks'} for {selectedSubject}</h3>
                  <p className="text-white/80 text-sm mt-1">
                    {isSecondary
                      ? 'O-Level format: Activity, Formative Score (20%), Exam Score (80%), Final Score (100%), Grade.'
                      : 'Enter marks out of 100.'}
                  </p>
                </div>
                {/* Manual refresh buttons removed to streamline UI */}
              </div>
            </div>
            <div className="overflow-x-auto">
              {!isSecondary && !isALevel ? (
                isNursery ? (
                  activeNurserySkill ? (
                    <table className="min-w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">{activeNurserySkill.label}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {students.map((student) => {
                          const performance = nurseryPerformances[student.student_id] || {};
                          const skillKey = activeNurserySkill.key;
                          const selected = performance[skillKey];
                          const color = selected ? NURSERY_PERFORMANCE_COLOR_MAP[selected] : undefined;
                          const badgeTextColor = selected ? getNurseryReadableTextColor(color) : '#94a3b8';
                          const cellBackground = selected ? applyAlphaToHex(color, 0.18) : 'transparent';
                          return (
                            <tr key={student.student_id} className="hover:bg-white/5">
                              <td className="px-4 py-4 align-top text-white">
                                <div className="font-medium">{student.name}</div>
                                {student.admission_number && (
                                  <div className="text-xs text-white/60 mt-1">{student.admission_number}</div>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top" style={{ background: cellBackground }}>
                                <div className="flex flex-col items-center gap-2">
                                  <div
                                    className="w-full text-center text-xs font-semibold uppercase tracking-wide px-2 py-2 rounded-md border border-white/10 transition-colors"
                                    style={{
                                      background: selected ? color : 'rgba(255,255,255,0.05)',
                                      color: badgeTextColor
                                    }}
                                  >
                                    {selected || 'Select'}
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {NURSERY_PERFORMANCE_OPTIONS.map(option => {
                                      const isSelected = option.label === selected;
                                      const buttonTextColor = getNurseryReadableTextColor(option.color);
                                      return (
                                        <button
                                          key={option.label}
                                          type="button"
                                          onClick={() => handleNurserySelection(student.student_id, skillKey, option.label)}
                                          className="px-2 py-1 text-[11px] font-semibold rounded-full shadow-sm transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/60"
                                          style={{
                                            background: option.color,
                                            color: buttonTextColor,
                                            opacity: isSelected ? 1 : 0.78,
                                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                            boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.7)' : '0 1px 4px rgba(15,23,42,0.25)'
                                          }}
                                        >
                                          {option.label}{isSelected ? ' ✓' : ''}
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => handleNurseryClear(student.student_id, skillKey)}
                                      className="px-2 py-1 text-[11px] font-semibold rounded-full bg-white/15 text-white hover:bg-white/25 transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/40"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-white/70 text-sm">
                      Select a subject that matches one of the nursery developmental skills to begin recording performance.
                    </div>
                  )
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Marks Obtained</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Total Marks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Grade</th>
                        {/* Primary has no per-row remark/initials columns */}
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
                              <span className={`px-2 py-1 text-xs rounded ${getPrimaryBadgeClass(grade)}`}>{grade || '-'}</span>
                            </td>
                            {/* Primary has no per-row remark/initials */}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : isALevel ? (
                <table className="min-w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Marks Obtained</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Total Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {students.map((student) => {
                      const marks = examResults[student.student_id]?.marks || '';
                      const totalMarks = examResults[student.student_id]?.totalMarks || '100';
                      const grade = examResults[student.student_id]?.grade || '';
                      const remark = examResults[student.student_id]?.remark || '';
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
                            <span className={`px-2 py-1 text-xs rounded ${getPrimaryBadgeClass(grade)}`}>{grade || '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="text" value={remark} onChange={(e) => handleMarksChange(student.student_id, 'remark', e.target.value)} placeholder="Remark" className="w-48 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">{isALevel ? 'Paper' : 'Topic'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Activity [3]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Descriptor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Formative Score [20%]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Exam Score [80%]</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Final Score [100%]</th>
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
                            <input type="text" value={row.topic} onChange={e => handleSecondaryChange(student.student_id, 'topic', e.target.value)} placeholder={isALevel ? 'e.g., Paper 1' : 'e.g., 1 Classification'} className="w-44 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max="3" step="0.1" value={row.activityScore} onChange={e => handleSecondaryChange(student.student_id, 'activityScore', e.target.value)} onBlur={() => handleSecondaryBlur(student.student_id, 'activityScore')} className="w-20 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-white/90">
                            {row.descriptor || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max={oLevelFormativeMax} step="0.1" value={row.formative} onChange={e => handleSecondaryChange(student.student_id, 'formative', e.target.value)} onBlur={() => handleSecondaryBlur(student.student_id, 'formative')} className="w-24 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input type="number" min="0" max="80" step="0.5" value={row.exam} onChange={e => handleSecondaryChange(student.student_id, 'exam', e.target.value)} onBlur={() => handleSecondaryBlur(student.student_id, 'exam')} className="w-24 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm" />
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
                {/* Primary Division Settings */}
                {!isSecondary && !isALevel && (
                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Primary Divisions (Aggregate Points)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90 text-sm">
                      <label className="flex items-center gap-2">
                        Div 1 (Grade 1):
                        <input type="number" value={primaryDivisionSettings.div1_min} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div1_min: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        to
                        <input type="number" value={primaryDivisionSettings.div1_max} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div1_max: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                      </label>
                      <label className="flex items-center gap-2">
                        Div 2 (Grade 2):
                        <input type="number" value={primaryDivisionSettings.div2_min} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div2_min: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        to
                        <input type="number" value={primaryDivisionSettings.div2_max} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div2_max: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                      </label>
                      <label className="flex items-center gap-2">
                        Div 3 (Grade 3):
                        <input type="number" value={primaryDivisionSettings.div3_min} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div3_min: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        to
                        <input type="number" value={primaryDivisionSettings.div3_max} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div3_max: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                      </label>
                      <label className="flex items-center gap-2">
                        Div 4 (Grade 4):
                        <input type="number" value={primaryDivisionSettings.div4_min} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div4_min: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        to
                        <input type="number" value={primaryDivisionSettings.div4_max} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, div4_max: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                      </label>
                      <label className="flex items-center gap-2 text-orange-300">
                        U (Ungraded):
                        <input type="number" value={primaryDivisionSettings.u_min} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, u_min: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                        to
                        <input type="number" value={primaryDivisionSettings.u_max} onChange={(e) => setPrimaryDivisionSettings(s => ({ ...s, u_max: parseInt(e.target.value)||0 }))} className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm" />
                      </label>
                    </div>
                    <p className="text-white/60 text-xs mt-3">
                      These are based on aggregate points across subjects and will be auto-assigned on reports. 
                      <span className="block mt-1">U (Ungraded) is also assigned to students with missing/incomplete subject results.</span>
                    </p>
                  </div>
                )}
                
                {/* Secondary School Settings - Only show for Secondary schools */}
                {(isSecondary || isALevel) && (
                  <>
                {/* Level Selector */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Subject Level</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-white/90 text-sm">
                      <input
                        type="radio"
                        name="level"
                        checked={selectedLevel === 'olevel'}
                        onChange={() => setSelectedLevel('olevel')}
                      />
                      O-Level (Senior 1-4)
                    </label>
                    <label className="flex items-center gap-2 text-white/90 text-sm">
                      <input
                        type="radio"
                        name="level"
                        checked={selectedLevel === 'alevel'}
                        onChange={() => setSelectedLevel('alevel')}
                      />
                      A-Level (Senior 5-6)
                    </label>
                  </div>
                </div>

                {/* Auto Remark - Available for all levels */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Auto Remark</h3>
                  <label className="flex items-center gap-2 text-white/90 text-sm">
                    <input
                      type="checkbox"
                      checked={autoRemarkEnabled}
                      onChange={(e) => setAutoRemarkEnabled(e.target.checked)}
                    />
                    Automatically set remark based on grade
                  </label>
                </div>

                {/* Grade Remarks - Available for all levels */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Grade Remarks ({selectedLevel === 'olevel' ? 'O-Level' : 'A-Level'})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['A','B','C','D','E','F'] as const).map(g => (
                      <div key={g} className="flex flex-col gap-2">
                        <label className="text-white/80 text-sm">Remark for Grade {g}</label>
                        <textarea
                          value={selectedLevel === 'olevel' ? (gradeRemarksOLevel[g] || '') : (gradeRemarksALevel[g] || '')}
                          onChange={(e) => {
                            if (selectedLevel === 'olevel') {
                              setGradeRemarksOLevel(prev => ({ ...prev, [g]: e.target.value }));
                            } else {
                              setGradeRemarksALevel(prev => ({ ...prev, [g]: e.target.value }));
                            }
                          }}
                          className="w-full min-h-[64px] px-3 py-2 rounded border border-white/20 bg-white/10 text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* O-Level Specific Settings */}
                {selectedLevel === 'olevel' && (
                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">O-Level Settings</h3>
                    <div className="flex items-center gap-3">
                      <label className="text-white/80 text-sm">Formative Max</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={oLevelFormativeMax}
                        onChange={(e) => setOLevelFormativeMax(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-24 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                    )}
                  </>
                )}
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

        {/* Comments modal removed per request */}
      </div>
    </div>
  );
}
