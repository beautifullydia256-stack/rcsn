/**
 * Full teacher exam-results UI (ported from the App Router draft at
 * `app/dashboard/teacher/exam-results/[class]/page.tsx`) for parity with the legacy Next experience.
 * Routes: `/dashboard/teacher/exam-results/class/:classEncoded` and `/.../subject/:subjectEncoded`.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  assertTeacherUpsertRpcResult,
  buildSecondaryOlevelExamResultsMapFromRows,
  formatSupabaseCallError,
  throwIfRpcReturnedJsonError,
} from "@/lib/examResultsUtils";
import { resolveTeacherIdForSchool } from "@/lib/resolveTeacherId";
import { getSectionForClass } from "@/templates/primary";
import { isALevelClass, isOLevelClass } from "@/components/reports/templates/helpers";
import { studentsVisibleForAlevelExam } from "@/lib/studentAlevelExamFilter";
import { studentsVisibleForOlevelExam } from "@/lib/studentOlevelExamFilter";
import type { SchoolUaceClassSubjectPaperRow } from "@/lib/uaceClassSubjectPapers";
import { fetchUacePapersForClassSubject, uacePaperSelectOptionValue } from "@/lib/uaceClassSubjectPapers";
import { matchesAlevelExamPaperLine } from "@/lib/alevelExamPaperLine";
import { calculateActivityDescriptor } from "@/lib/secondaryExamScoring";
import { calculateUacePrincipalGradeFromMarks } from "@/lib/reportUtils";
import {
  getReadableTextColor as getNurseryReadableTextColor,
  applyAlphaToHex,
  sanitizeNurseryKey,
} from "@/templates/primary/nurseryPerformance";
import {
  ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS,
  PRE_PRIMARY_HOLISTIC_RATINGS,
  PRE_PRIMARY_HOLISTIC_STRANDS,
  canonicalizePrePrimaryHolisticSkillKey,
  getPrePrimaryHolisticStrandForSubject,
  normalizePrePrimaryHolisticRating,
  prePrimaryHolisticRatingToStoredValue,
  type PrePrimaryHolisticRating,
} from "@/templates/primary/prePrimaryHolisticRatings";

/** Per-student map of skillKey → rating label (pre-primary holistic colour grid). */
type NurseryPerformanceRecord = Record<string, PrePrimaryHolisticRating | string>;

const DEFAULT_TEACHER_REMARKS_RANGES: Array<{
  id?: string;
  min_percent: number;
  max_percent: number;
  comment_text: string;
}> = [
  { min_percent: 0, max_percent: 40, comment_text: "Needs more effort. Try harder next time." },
  { min_percent: 41, max_percent: 60, comment_text: "Fair work. You can do better." },
  { min_percent: 61, max_percent: 80, comment_text: "Good work. Keep it up!" },
  { min_percent: 81, max_percent: 100, comment_text: "Excellent! Keep shining!" },
];

export default function LegacyExamResultsFullPage() {
  const navigate = useNavigate();
  const params = useParams<{ classEncoded: string; subjectEncoded?: string }>();
  const className = useMemo(() => {
    const enc = params.classEncoded;
    return enc ? decodeURIComponent(enc) : "";
  }, [params.classEncoded]);
  /** Matches DB `class_name` and grade-setting keys (trimmed). */
  const normalizedClassName = useMemo(() => (className || "").trim(), [className]);
  const lockedSubject = useMemo(() => {
    const enc = params.subjectEncoded;
    return enc ? decodeURIComponent(enc) : null;
  }, [params.subjectEncoded]);
  const subjectLocked = Boolean(lockedSubject);
  
  const isSecondary = useMemo(() => isOLevelClass(className?.trim() || ""), [className]);
  const isALevel = useMemo(() => isALevelClass(className?.trim() || ""), [className]);
  
  // Detect Primary school section (Baby Class, Nursery, Lower, Upper)
  const primarySection = useMemo(() => {
    if (isSecondary || isALevel) return null;
    return getSectionForClass(normalizedClassName);
  }, [normalizedClassName, isSecondary, isALevel]);
  const isNursery = primarySection === 'Baby Class' || primarySection === 'Nursery';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [examSets, setExamSets] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [alevelSubjectsByStudent, setAlevelSubjectsByStudent] = useState<Record<string, string[]>>({});
  const [olevelSubjectsByStudent, setOlevelSubjectsByStudent] = useState<Record<string, string[]>>({});
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const displaySubjects = useMemo(() => {
    if (!lockedSubject) return teacherSubjects;
    if (teacherSubjects.includes(lockedSubject)) return teacherSubjects;
    return [...teacherSubjects, lockedSubject];
  }, [teacherSubjects, lockedSubject]);
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>("");
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string>("");
  const [selectedExamSet, setSelectedExamSet] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>(() => lockedSubject ?? "");
  /** Subject whose grade bands are edited in Grade Settings (current exam subject only). */
  const gradeSettingsSubject = useMemo(
    () => (selectedSubject.trim() || displaySubjects[0] || "").trim(),
    [selectedSubject, displaySubjects]
  );
  /** One teacher may use different scales per class; scope stored bands by class + subject. */
  const scopedGradeKey = useCallback(
    (subject: string) => `${normalizedClassName}::${(subject || "").trim()}`,
    [normalizedClassName]
  );
  const parseSubjectFromScopedGradeKey = useCallback(
    (fullKey: string): string | null => {
      const prefix = `${normalizedClassName}::`;
      if (!fullKey.startsWith(prefix)) return null;
      const sub = fullKey.slice(prefix.length).trim();
      return sub || null;
    },
    [normalizedClassName]
  );
  // Primary layout state (existing)
  const [examResults, setExamResults] = useState<Record<string, { marks: string; totalMarks: string; grade: string; remark?: string }>>({});
  // Primary aggregate points for core subjects (English, Mathematics, Science, Social Studies)
  const [primaryAggregatePoints, setPrimaryAggregatePoints] = useState<Record<string, { eng: string; math: string; sci: string; sst: string }>>({});
  const [nurseryPerformances, setNurseryPerformances] = useState<Record<string, NurseryPerformanceRecord>>({});
  const [nurseryDirtyStudents, setNurseryDirtyStudents] = useState<Record<string, boolean>>({});
  const activePrePrimaryHolisticStrand = useMemo(
    () => (isNursery ? getPrePrimaryHolisticStrandForSubject(selectedSubject) : null),
    [isNursery, selectedSubject]
  );
  // Secondary layout state
  const [examResultsSecondary, setExamResultsSecondary] = useState<Record<string, {
    topic: string;
    activityScore: string; // 0-3 (step 0.1)
    /** ECS labels from activity; DB may hold other text after reload */
    descriptor: string;
    formative: string; // 0-40
    exam: string; // 0-60
    final: string; // read-only (formative+exam)
    /** Letter (A–E) or UNEB-style (e.g. D1) from DB */
    grade: string;
    remark: string;
    initials: string;
  }>>({});
  const [topicFilter, setTopicFilter] = useState<string>("");
  /** UNEB paper line from `school_uace_class_subject_papers`; empty = free-text `topicFilter` only. */
  const [uacePaperOptions, setUacePaperOptions] = useState<SchoolUaceClassSubjectPaperRow[]>([]);
  const [selectedAlevelPaperCode, setSelectedAlevelPaperCode] = useState<string>("");
  const [teacherInitials, setTeacherInitials] = useState<string>("");
  const [showGradeSettings, setShowGradeSettings] = useState(false);
  const [examGradeSettingsLoading, setExamGradeSettingsLoading] = useState(false);
  const [examGradeSettingsSaving, setExamGradeSettingsSaving] = useState(false);
  const [showTeacherRemarks, setShowTeacherRemarks] = useState(false);
  const [showClassTeacherComments, setShowClassTeacherComments] = useState(false);
  const [teacherRemarksRanges, setTeacherRemarksRanges] = useState<
    Array<{ id?: string; min_percent: number; max_percent: number; comment_text: string }>
  >(() => DEFAULT_TEACHER_REMARKS_RANGES.map((r) => ({ ...r })));

  // Helper: load teacher remarks ranges for current subject (SPA: direct Supabase)
  const loadTeacherRemarksRanges = async (subjectName: string) => {
    const sid = resolvedSchoolId;
    if (!sid || !subjectName.trim()) {
      setTeacherRemarksRanges(DEFAULT_TEACHER_REMARKS_RANGES.map((r) => ({ ...r })));
      return;
    }
    try {
      const { data, error } = await supabase
        .from("teacher_remarks_settings")
        .select("id, min_percent, max_percent, comment_text")
        .eq("school_id", sid)
        .eq("subject", subjectName.trim())
        .order("min_percent");
      if (error) throw error;
      const ranges = Array.isArray(data) ? data : [];
      const sanitized = ranges
        .filter((r: { min_percent?: unknown; max_percent?: unknown }) => r != null && r.min_percent != null && r.max_percent != null)
        .map((r: { id?: string; min_percent: number; max_percent: number; comment_text?: string | null }) => ({
          id: r.id,
          min_percent: Number(r.min_percent) || 0,
          max_percent: Number(r.max_percent) || 0,
          comment_text: String(r.comment_text || ""),
        }));
      setTeacherRemarksRanges(
        sanitized.length > 0 ? sanitized : DEFAULT_TEACHER_REMARKS_RANGES.map((r) => ({ ...r }))
      );
    } catch (error) {
      console.error("Error loading teacher remarks ranges:", error);
      setTeacherRemarksRanges(DEFAULT_TEACHER_REMARKS_RANGES.map((r) => ({ ...r })));
    }
  };
  const [gradeSettings, setGradeSettings] = useState<Record<string, Array<{ min: number; max: number; grade: string }>>>(
    {}
  );
  /** O-Level / A-Level final-score bands (A–E) per subject — kept separate from primary D1–F9. */
  const [secondaryGradeSettings, setSecondaryGradeSettings] = useState<
    Record<string, Array<{ min: number; max: number; grade: string }>>
  >({});
  const secondaryBandsSignature = useMemo(() => {
    const sk = (selectedSubject || "").trim();
    if (!sk) return "null";
    return JSON.stringify(secondaryGradeSettings[scopedGradeKey(sk)] ?? null);
  }, [secondaryGradeSettings, selectedSubject, scopedGradeKey]);

  useEffect(() => {
    const prefix = `${normalizedClassName}::`;
    setGradeSettings((prev) => {
      const next: Record<string, Array<{ min: number; max: number; grade: string }>> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(prefix)) next[k] = v;
      }
      return next;
    });
    setSecondaryGradeSettings((prev) => {
      const next: Record<string, Array<{ min: number; max: number; grade: string }>> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(prefix)) next[k] = v;
      }
      return next;
    });
  }, [normalizedClassName]);

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
    O: 'Subsidiary pass band. Continue building mastery toward higher grades.',
    F: 'Insufficient performance. Seek support and put in more effort to improve.'
  });

  const studentsForAlevelExam = useMemo(
    () => studentsVisibleForAlevelExam(isALevel, selectedSubject, students, alevelSubjectsByStudent),
    [isALevel, selectedSubject, students, alevelSubjectsByStudent],
  );

  const studentsForOlevelExam = useMemo(
    () => studentsVisibleForOlevelExam(isSecondary, selectedSubject, students, olevelSubjectsByStudent),
    [isSecondary, selectedSubject, students, olevelSubjectsByStudent],
  );

  useEffect(() => {
    if (!isALevel || !resolvedSchoolId || !normalizedClassName || !selectedSubject?.trim()) {
      setUacePaperOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchUacePapersForClassSubject(
          resolvedSchoolId,
          normalizedClassName,
          selectedSubject
        );
        if (!cancelled) setUacePaperOptions(rows);
      } catch {
        if (!cancelled) setUacePaperOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isALevel, resolvedSchoolId, normalizedClassName, selectedSubject]);

  const alevelPaperSelectValue = useMemo(() => {
    const code = selectedAlevelPaperCode.trim();
    if (code) {
      const byCode = uacePaperOptions.find((p) => (p.paper_code ?? "").trim() === code);
      if (byCode) return byCode.id;
    }
    const t = topicFilter.trim();
    const row = uacePaperOptions.find((p) => (p.paper_label ?? "").trim() === t);
    return row?.id ?? "";
  }, [selectedAlevelPaperCode, topicFilter, uacePaperOptions]);

  useEffect(() => {
    if (isNursery) {
      if (showGradeSettings) setShowGradeSettings(false);
      if (showClassTeacherComments) setShowClassTeacherComments(false);
    }
  }, [isNursery, showGradeSettings, showClassTeacherComments]);

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
          const returnUrl = encodeURIComponent(
            `/dashboard/teacher/exam-results/class/${encodeURIComponent(normalizedClassName)}`
          );
          navigate(`/login?returnUrl=${returnUrl}`);
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

        const userMetadata =
          (user as { user_metadata?: Record<string, unknown>; raw_user_meta_data?: Record<string, unknown> })
            .user_metadata ||
          (user as { raw_user_meta_data?: Record<string, unknown> }).raw_user_meta_data ||
          {};
        let schoolId = userMetadata.school_id as string | undefined;
        let teacherId = userMetadata.teacher_id as string | undefined;

        // Prefer RPC when deployed (matches current_school_id() in RLS exactly).
        // If RPC is missing (404) or fails, read public.users — JWT metadata school_id is often stale/wrong and breaks prefs RLS.
        const { data: rpcSchoolId, error: schoolRpcError } = await supabase.rpc(
          "get_authenticated_user_school_id"
        );
        if (!schoolRpcError && rpcSchoolId != null && String(rpcSchoolId).length > 0) {
          schoolId = String(rpcSchoolId);
        } else {
          const { data: portalUserRow } = await supabase
            .from("users")
            .select("school_id")
            .eq("user_id", user.id)
            .maybeSingle();
          const portalSchoolId = (portalUserRow as { school_id?: string | null } | null)?.school_id;
          if (portalSchoolId) {
            schoolId = String(portalSchoolId);
          }
        }

        if (teacherId && schoolId) {
          const { data: tMeta } = await supabase
            .from("teachers")
            .select("teacher_id")
            .eq("school_id", schoolId)
            .eq("teacher_id", teacherId)
            .maybeSingle();
          if (!tMeta?.teacher_id) teacherId = undefined;
        }

        const metaName =
          (userMetadata.name || userMetadata.teacher_name || userMetadata.full_name) as string | undefined;
        if (!nameFromMeta && metaName?.trim()) {
          const parts = metaName.trim().split(/\s+/).filter(Boolean);
          const first = (parts[0] || "").charAt(0).toUpperCase();
          const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || "").charAt(0).toUpperCase();
          setTeacherInitials([first, last].filter(Boolean).join(".") || "");
        }

        if (!schoolId) {
          setError("School ID not found. Please contact your administrator.");
          return;
        }

        if (!teacherId) {
          teacherId = (await resolveTeacherIdForSchool(schoolId, user)) ?? undefined;
        }

        if (!teacherId) {
          setError("Teacher ID not found. Please contact your administrator.");
          return;
        }

        setResolvedTeacherId(teacherId);
        setResolvedSchoolId(schoolId);

        console.log("Fetching assignments for:", { schoolId, teacherId, className: normalizedClassName });

        const { data: assignmentRows, error: assignmentsError } = await supabase
          .from("teacher_class_subjects")
          .select("subject")
          .eq("school_id", schoolId)
          .eq("teacher_id", teacherId)
          .eq("class_name", normalizedClassName);

        let subjectList: string[] = [];
        if (!assignmentsError && assignmentRows && assignmentRows.length > 0) {
          subjectList = assignmentRows.map((r) => String(r.subject || "")).filter(Boolean);
        } else {
          if (assignmentsError) {
            console.error("Error fetching teacher assignments:", assignmentsError);
          }
          const { data: teacherData, error: teacherError } = await supabase
            .from("teachers")
            .select("subjects")
            .eq("school_id", schoolId)
            .eq("teacher_id", teacherId)
            .maybeSingle();
          if (teacherError) {
            console.error("Fallback teachers.subjects failed:", teacherError);
            if (assignmentsError) {
              setError(`Failed to load your assignments: ${assignmentsError.message}`);
              return;
            }
          }
          subjectList = (teacherData?.subjects as string[]) || [];
        }

        const processedSubjects = isNursery ? ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS : subjectList;
        if (!isNursery && processedSubjects.length === 0) {
          setError(
            `No subjects assigned for ${normalizedClassName}. Please contact your administrator to assign subjects.`
          );
          return;
        }
        setTeacherSubjects(processedSubjects);

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
        const filteredExamSets = (examSetsData || []).filter(
          (examSet) =>
            examSet.target_classes.length === 0 ||
            examSet.target_classes.includes(normalizedClassName) ||
            examSet.target_classes.includes(className)
        );
        setExamSets(filteredExamSets);

        // Check if current teacher is class teacher for this class (supports multiple via class_teachers)
        try {
          const currentTeacherId = teacherId || user.id;
          const { data: ctRows } = await supabase
            .from('class_teachers')
            .select('id')
            .eq('school_id', schoolId)
            .eq('class_name', normalizedClassName)
            .eq('teacher_id', currentTeacherId)
            .limit(1);
          setIsClassTeacher(!!(ctRows && ctRows.length > 0));
        } catch (err) {
          console.error('Error checking class teacher status:', err);
          setIsClassTeacher(false);
        }

        if (!isNursery) {
          try {
            const { data: ctRows, error: ctErr } = await supabase
              .from("class_teacher_comments_settings")
              .select("id, min_percent, max_percent, comment_text")
              .eq("school_id", schoolId)
              .eq("class_name", normalizedClassName)
              .order("min_percent");
            if (!ctErr && ctRows?.length) {
              const sanitized = ctRows
                .filter((r) => r && r.min_percent != null && r.max_percent != null)
                .map((r) => ({
                  id: r.id,
                  min_percent: Number(r.min_percent) || 0,
                  max_percent: Number(r.max_percent) || 0,
                  comment_text: String(r.comment_text || ""),
                }));
              setClassTeacherRanges(sanitized);
            }
          } catch {
            /* keep defaults */
          }
        } else {
          setClassTeacherRanges([]);
        }

        // Comments removed per request

        // (Removed) Loading Teacher's Remarks default per class per request

        // Get students in this class with better error handling
        let studentsData: any[] = [];
        try {
          const { data, error: studentsError } = await supabase
          .from('students')
          .select('student_id, name, current_class')
          .eq('school_id', schoolId)
          .eq('current_class', normalizedClassName)
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

        setStudents(studentsData);

        if (isALevel && (studentsData?.length ?? 0) > 0) {
          const ids = studentsData.map((s: { student_id: string }) => s.student_id);
          const { data: arows } = await supabase
            .from("student_alevel_subjects")
            .select("student_id, subject_name")
            .in("student_id", ids);
          const map: Record<string, string[]> = {};
          for (const row of arows || []) {
            const sid = row.student_id as string;
            if (!map[sid]) map[sid] = [];
            map[sid].push(row.subject_name as string);
          }
          setAlevelSubjectsByStudent(map);
        } else {
          setAlevelSubjectsByStudent({});
        }

        if (isSecondary && (studentsData?.length ?? 0) > 0) {
          const ids = studentsData.map((s: { student_id: string }) => s.student_id);
          const { data: orows } = await supabase
            .from("student_olevel_subjects")
            .select("student_id, subject_name")
            .in("student_id", ids);
          const omap: Record<string, string[]> = {};
          for (const row of orows || []) {
            const sid = row.student_id as string;
            if (!omap[sid]) omap[sid] = [];
            omap[sid].push(row.subject_name as string);
          }
          setOlevelSubjectsByStudent(omap);
        } else {
          setOlevelSubjectsByStudent({});
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [normalizedClassName, className, navigate, isNursery, isALevel, isSecondary]);

  useEffect(() => {
    if (lockedSubject) setSelectedSubject(lockedSubject);
  }, [lockedSubject]);

  useEffect(() => {
    if (!resolvedSchoolId || !selectedSubject.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data: trRows, error: trErr } = await supabase
          .from("teacher_remarks_settings")
          .select("id, min_percent, max_percent, comment_text")
          .eq("school_id", resolvedSchoolId)
          .eq("subject", selectedSubject.trim())
          .order("min_percent");
        if (cancelled || trErr) return;
        const sanitized = (trRows || [])
          .filter((r) => r && r.min_percent != null && r.max_percent != null)
          .map((r) => ({
            id: r.id,
            min_percent: Number(r.min_percent) || 0,
            max_percent: Number(r.max_percent) || 0,
            comment_text: String(r.comment_text || ""),
          }));
        setTeacherRemarksRanges(
          sanitized.length > 0 ? sanitized : DEFAULT_TEACHER_REMARKS_RANGES.map((r) => ({ ...r }))
        );
      } catch {
        /* keep existing ranges */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedSchoolId, selectedSubject]);

  const calculatePrimaryGrade = (marks: number, totalMarks: number, subject: string): string => {
    if (!marks && marks !== 0) return '';
    const percentage = (marks / (totalMarks || 100)) * 100;
    const subjectGrades = gradeSettings[scopedGradeKey(subject)] || getDefaultGrades();
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

  /** UACE letter grades (not primary D1–F9). */
  const getUaceGradeBadgeClass = (grade: string): string => {
    const g = (grade || '').trim().toUpperCase();
    switch (g) {
      case 'A':
        return 'bg-emerald-600/20 text-emerald-300';
      case 'B':
        return 'bg-green-600/20 text-green-300';
      case 'C':
        return 'bg-cyan-600/20 text-cyan-300';
      case 'D':
        return 'bg-yellow-600/20 text-yellow-300';
      case 'E':
        return 'bg-orange-600/20 text-orange-300';
      case 'O':
        return 'bg-slate-600/20 text-slate-300';
      case 'F':
        return 'bg-red-900/20 text-red-500';
      default:
        return 'text-white/60';
    }
  };

  // Primary grading (Percentage-based) - Subject grading scale
  // Division 1: 75-100, Division 2: 70-74, Credit 3: 65-69, Credit 4: 60-64,
  // Credit 5: 55-59, Credit 6: 50-54, Pass 7: 45-49, Pass 8: 40-44, F9: 0-39
  // Using short format: D1, D2, C3, C4, C5, C6, P7, P8, F9
  const getDefaultGrades = useCallback(
    () => [
      { min: 75, max: 100, grade: "D1" },
      { min: 70, max: 74, grade: "D2" },
      { min: 65, max: 69, grade: "C3" },
      { min: 60, max: 64, grade: "C4" },
      { min: 55, max: 59, grade: "C5" },
      { min: 50, max: 54, grade: "C6" },
      { min: 45, max: 49, grade: "P7" },
      { min: 40, max: 44, grade: "P8" },
      { min: 0, max: 39, grade: "F9" },
    ],
    []
  );

  /** O-Level / A-Level final score (0–100): letter grades A–E (not primary D1–F9). */
  const getDefaultSecondaryGradeBands = useCallback(
    () => [
      { min: 80, max: 100, grade: "A" },
      { min: 70, max: 79, grade: "B" },
      { min: 60, max: 69, grade: "C" },
      { min: 50, max: 59, grade: "D" },
      { min: 0, max: 49, grade: "E" },
    ],
    []
  );

  const secondaryGradeBandsForSubject = (subject: string) => {
    const key = scopedGradeKey(subject);
    const custom = (subject || "").trim() ? secondaryGradeSettings[key] : undefined;
    if (custom && custom.length > 0) return custom;
    return getDefaultSecondaryGradeBands();
  };
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
      console.log('Checking class teacher status for:', { resolvedSchoolId, className: normalizedClassName, resolvedTeacherId });
      const { data: ctRows } = await supabase
        .from('class_teachers')
        .select('id')
        .eq('school_id', resolvedSchoolId)
        .eq('class_name', normalizedClassName)
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

  const calculateSecondaryGrade = (finalScore: number, subject: string): "A" | "B" | "C" | "D" | "E" => {
    const bands = secondaryGradeBandsForSubject(subject);
    const sorted = [...bands].sort((a, b) => b.min - a.min);
    for (const b of sorted) {
      if (finalScore >= b.min && finalScore <= b.max) {
        const letter = String(b.grade || "").trim().toUpperCase().charAt(0);
        if (letter === "A" || letter === "B" || letter === "C" || letter === "D" || letter === "E") {
          return letter;
        }
      }
    }
    const fallback = [...bands].sort((a, c) => a.min - c.min)[0]?.grade || "E";
    const letter = String(fallback).trim().toUpperCase().charAt(0);
    if (letter === "A" || letter === "B" || letter === "C" || letter === "D" || letter === "E") return letter;
    return "E";
  };

  // When O-Level percentage bands change for this subject, refresh letter grades in the grid.
  useEffect(() => {
    if (!isSecondary || !(selectedSubject || "").trim()) return;
    const subj = selectedSubject.trim();
    setExamResultsSecondary((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const sid of Object.keys(next)) {
        const row = next[sid];
        const fn = Math.trunc(parseFloat(row.final) || 0);
        const hasInput =
          (parseFloat(row.formative) || 0) > 0 ||
          (parseFloat(row.exam) || 0) > 0 ||
          (parseFloat(row.activityScore) || 0) > 0 ||
          (row.final || "").trim() !== "";
        if (!hasInput && fn === 0) continue;
        const g = calculateSecondaryGrade(fn, subj);
        if (row.grade !== g) {
          next[sid] = { ...row, grade: g };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isSecondary, selectedSubject, secondaryBandsSignature]);

  const loadTeacherExamGradeSettingsFromSupabase = useCallback(async () => {
    if (!resolvedSchoolId || !normalizedClassName) return;
    setExamGradeSettingsLoading(true);
    const prefix = `${normalizedClassName}::`;
    try {
      const { data: bandRows, error: bandErr } = await supabase
        .from("teacher_exam_grade_bands")
        .select("subject, scale_kind, min_percent, max_percent, grade_label, sort_order")
        .eq("school_id", resolvedSchoolId)
        .eq("class_name", normalizedClassName)
        .order("subject", { ascending: true })
        .order("scale_kind", { ascending: true })
        .order("sort_order", { ascending: true });
      if (bandErr) throw bandErr;

      const primary: Record<string, Array<{ min: number; max: number; grade: string }>> = {};
      const secondary: Record<string, Array<{ min: number; max: number; grade: string }>> = {};
      for (const row of bandRows || []) {
        const r = row as {
          subject?: string;
          scale_kind?: string;
          min_percent?: number;
          max_percent?: number;
          grade_label?: string;
        };
        const subj = String(r.subject || "").trim();
        if (!subj) continue;
        const key = scopedGradeKey(subj);
        const target = r.scale_kind === "primary" ? primary : secondary;
        if (!target[key]) target[key] = [];
        target[key].push({
          min: Number(r.min_percent) || 0,
          max: Number(r.max_percent) || 100,
          grade: String(r.grade_label || ""),
        });
      }

      setGradeSettings((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(prefix)) delete next[k];
        }
        return { ...next, ...primary };
      });
      setSecondaryGradeSettings((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(prefix)) delete next[k];
        }
        return { ...next, ...secondary };
      });

      const { data: prefRow, error: prefErr } = await supabase
        .from("teacher_exam_class_prefs")
        .select(
          "o_level_formative_max, auto_remark_enabled, primary_division_settings, grade_remarks_olevel, grade_remarks_alevel"
        )
        .eq("school_id", resolvedSchoolId)
        .eq("class_name", normalizedClassName)
        .maybeSingle();
      if (prefErr) throw prefErr;

      if (prefRow) {
        const p = prefRow as Record<string, unknown>;
        if (typeof p.o_level_formative_max === "number") setOLevelFormativeMax(p.o_level_formative_max);
        if (typeof p.auto_remark_enabled === "boolean") setAutoRemarkEnabled(p.auto_remark_enabled);
        const div = p.primary_division_settings;
        if (div && typeof div === "object" && div !== null && !Array.isArray(div)) {
          setPrimaryDivisionSettings((s) => ({ ...s, ...(div as typeof s) }));
        }
        const gro = p.grade_remarks_olevel;
        if (gro && typeof gro === "object" && gro !== null && !Array.isArray(gro)) {
          setGradeRemarksOLevel((prev) => ({ ...prev, ...(gro as Record<string, string>) }));
        }
        const gra = p.grade_remarks_alevel;
        if (gra && typeof gra === "object" && gra !== null && !Array.isArray(gra)) {
          setGradeRemarksALevel((prev) => ({ ...prev, ...(gra as Record<string, string>) }));
        }
      } else {
        setOLevelFormativeMax(20);
        setAutoRemarkEnabled(true);
        setPrimaryDivisionSettings({
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
        setGradeRemarksOLevel({
          A: "Exceptional! Your performance is outstanding, demonstrating innovative and creative application of knowledge. Maintain this excellent standard.",
          B: "Outstanding! Strive for excellence to reach the next level.",
          C: "Satisfactory, but there is room for improvement. Work harder to meet expectations.",
          D: "Fair effort. Keep working to improve your understanding and performance.",
          E: "Your effort needs Improvement. Work diligently to boost your performance.",
          F: "Insufficient performance. Seek support and put in more effort to improve.",
        });
        setGradeRemarksALevel({
          A: "Exceptional! Your performance is outstanding, demonstrating innovative and creative application of knowledge. Maintain this excellent standard.",
          B: "Outstanding! Strive for excellence to reach the next level.",
          C: "Satisfactory, but there is room for improvement. Work harder to meet expectations.",
          D: "Fair effort. Keep working to improve your understanding and performance.",
          E: "Your effort needs Improvement. Work diligently to boost your performance.",
          F: "Insufficient performance. Seek support and put in more effort to improve.",
        });
      }
    } catch (e) {
      console.error("loadTeacherExamGradeSettingsFromSupabase", e);
    } finally {
      setExamGradeSettingsLoading(false);
    }
  }, [resolvedSchoolId, normalizedClassName, scopedGradeKey]);

  useEffect(() => {
    void loadTeacherExamGradeSettingsFromSupabase();
  }, [loadTeacherExamGradeSettingsFromSupabase]);

  const saveTeacherExamGradeSettingsToSupabase = useCallback(async () => {
    if (!resolvedSchoolId || !normalizedClassName) {
      alert("Cannot save: school or class not loaded.");
      return;
    }
    setExamGradeSettingsSaving(true);
    try {
      const { error: prefErr } = await supabase.from("teacher_exam_class_prefs").upsert(
        {
          school_id: resolvedSchoolId,
          class_name: normalizedClassName,
          o_level_formative_max: oLevelFormativeMax,
          auto_remark_enabled: autoRemarkEnabled,
          primary_division_settings: primaryDivisionSettings,
          grade_remarks_olevel: gradeRemarksOLevel,
          grade_remarks_alevel: gradeRemarksALevel,
        },
        { onConflict: "school_id,class_name" }
      );
      if (prefErr) throw prefErr;

      const gsSubj = gradeSettingsSubject.trim();
      const primaryMap: Record<string, Array<{ min: number; max: number; grade: string }>> = {
        ...gradeSettings,
      };
      const secondaryMap: Record<string, Array<{ min: number; max: number; grade: string }>> = {
        ...secondaryGradeSettings,
      };
      if (gsSubj) {
        const sk = scopedGradeKey(gsSubj);
        if (!isSecondary && !isALevel) {
          const cur = primaryMap[sk];
          if (!cur || cur.length === 0) {
            primaryMap[sk] = getDefaultGrades().map((g) => ({ ...g }));
          }
        } else if (isSecondary || isALevel) {
          const cur = secondaryMap[sk];
          if (!cur || cur.length === 0) {
            secondaryMap[sk] = getDefaultSecondaryGradeBands().map((g) => ({ ...g }));
          }
        }
      }

      const collectSubjectsForScale = (
        map: Record<string, Array<{ min: number; max: number; grade: string }>>
      ) => {
        const subs = new Set<string>();
        for (const fullKey of Object.keys(map)) {
          const subject = parseSubjectFromScopedGradeKey(fullKey);
          if (subject) subs.add(subject);
        }
        return subs;
      };
      const subjectsPrimary = collectSubjectsForScale(primaryMap);
      const subjectsSecondary = collectSubjectsForScale(secondaryMap);

      if (subjectsPrimary.size > 0) {
        const { error: delP } = await supabase
          .from("teacher_exam_grade_bands")
          .delete()
          .eq("school_id", resolvedSchoolId)
          .eq("class_name", normalizedClassName)
          .eq("scale_kind", "primary")
          .in("subject", [...subjectsPrimary]);
        if (delP) throw delP;
      }
      if (subjectsSecondary.size > 0) {
        const { error: delS } = await supabase
          .from("teacher_exam_grade_bands")
          .delete()
          .eq("school_id", resolvedSchoolId)
          .eq("class_name", normalizedClassName)
          .eq("scale_kind", "secondary")
          .in("subject", [...subjectsSecondary]);
        if (delS) throw delS;
      }

      type BandInsert = {
        school_id: string;
        class_name: string;
        subject: string;
        scale_kind: "primary" | "secondary";
        min_percent: number;
        max_percent: number;
        grade_label: string;
        sort_order: number;
      };
      const rows: BandInsert[] = [];
      const pushBands = (
        map: Record<string, Array<{ min: number; max: number; grade: string }>>,
        scale_kind: "primary" | "secondary"
      ) => {
        for (const [fullKey, bands] of Object.entries(map)) {
          const subject = parseSubjectFromScopedGradeKey(fullKey);
          if (!subject) continue;
          (bands || []).forEach((b, idx) => {
            rows.push({
              school_id: resolvedSchoolId,
              class_name: normalizedClassName,
              subject,
              scale_kind,
              min_percent: b.min,
              max_percent: b.max,
              grade_label: String(b.grade || ""),
              sort_order: idx,
            });
          });
        }
      };
      pushBands(primaryMap, "primary");
      pushBands(secondaryMap, "secondary");

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("teacher_exam_grade_bands").insert(rows);
        if (insErr) throw insErr;
      }
      void loadTeacherExamGradeSettingsFromSupabase();
      alert("Grade settings saved.");
    } catch (e: unknown) {
      const pe = e as { message?: string; details?: string; hint?: string };
      const msg =
        [pe?.message, pe?.details, pe?.hint].filter(Boolean).join(" — ") ||
        (e instanceof Error ? e.message : "Failed to save grade settings");
      console.error("saveTeacherExamGradeSettingsToSupabase", e);
      alert(msg);
    } finally {
      setExamGradeSettingsSaving(false);
    }
  }, [
    resolvedSchoolId,
    normalizedClassName,
    oLevelFormativeMax,
    autoRemarkEnabled,
    primaryDivisionSettings,
    gradeRemarksOLevel,
    gradeRemarksALevel,
    gradeSettings,
    secondaryGradeSettings,
    gradeSettingsSubject,
    isSecondary,
    isALevel,
    scopedGradeKey,
    parseSubjectFromScopedGradeKey,
    getDefaultGrades,
    getDefaultSecondaryGradeBands,
    loadTeacherExamGradeSettingsFromSupabase,
  ]);

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
    const grade =
      newMarks.trim() === ''
        ? ''
        : isALevel
          ? calculateUacePrincipalGradeFromMarks(marksNum, totalMarksNum).grade
          : calculatePrimaryGrade(marksNum, totalMarksNum, selectedSubject);
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

  const handleNurserySelection = (studentId: string, skillKey: string, performance: PrePrimaryHolisticRating) => {
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
      next.descriptor = calculateActivityDescriptor(aSafe);
      const finalNum = Math.trunc(fSafe + eSafe);
      next.final = String(finalNum);
      const newGrade = calculateSecondaryGrade(finalNum, selectedSubject);
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
      next.grade = calculateSecondaryGrade(trunc0(fnum + enum_), selectedSubject);
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

        const saves: Promise<unknown>[] = [];
        for (const studentId of studentsToPersist) {
          const performances = nurseryPerformances[studentId] || {};
          for (const strand of PRE_PRIMARY_HOLISTIC_STRANDS) {
            const payload: Record<string, string> = {};
            for (const skill of strand.skills) {
              const raw = performances[skill.key];
              const norm = raw ? normalizePrePrimaryHolisticRating(raw) : null;
              if (norm) payload[skill.key] = prePrimaryHolisticRatingToStoredValue(norm);
            }
            if (Object.keys(payload).length === 0) continue;

            saves.push(
              (async () => {
                const resp = await supabase.rpc('teacher_upsert_exam_result_primary', {
                  p_school_id: schoolId,
                  p_exam_set_id: selectedExamSet,
                  p_student_id: studentId,
                  p_class_name: normalizedClassName,
                  p_subject: strand.subject,
                  p_marks_obtained: null,
                  p_total_marks: null,
                  p_grade: null,
                  p_remarks: null,
                  p_teacher_id: teacherIdForSave,
                  p_teacher_comment: null,
                  p_nursery_skills: payload,
                });
                if (resp.error) {
                  console.error('RPC nursery save error:', resp.error);
                  throw resp.error;
                }
                assertTeacherUpsertRpcResult(resp.data);
              })()
            );
          }
        }

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
              p_class_name: normalizedClassName,
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
            assertTeacherUpsertRpcResult(resp.data);
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
        const allowedIds = new Set(studentsForAlevelExam.map((s) => s.student_id));
        const entries = Object.entries(examResults)
          .filter(([studentId]) => allowedIds.has(studentId))
          .filter(([_, data]) => data.marks && data.totalMarks);
        if (entries.length === 0) {
          setError('Please enter marks for at least one student');
          return;
        }

        const saves = entries.map(async ([studentId, data]) => {
          const computedGrade = calculateUacePrincipalGradeFromMarks(
            parseFloat(data.marks),
            parseFloat(data.totalMarks || '100')
          ).grade;
          const currentGradeRemarks = gradeRemarksALevel;
          const computedRemark = autoRemarkEnabled ? (currentGradeRemarks[computedGrade as keyof typeof currentGradeRemarks] || '') : (data.remark || '');
          
          const resp = await supabase.rpc('teacher_upsert_exam_result_alevel', {
            p_school_id: schoolId,
            p_exam_set_id: selectedExamSet,
            p_student_id: studentId,
            p_class_name: normalizedClassName,
            p_subject: (selectedSubject || '').trim(),
            p_marks_obtained: parseFloat(data.marks),
            p_total_marks: parseFloat(data.totalMarks || '100'),
            p_grade: computedGrade,
            p_remarks: computedRemark,
            p_teacher_id: teacherIdForSave,
            p_teacher_comment: computedRemark,
            p_paper_number: topicFilter.trim() || null,
            p_paper_code: selectedAlevelPaperCode.trim() || null,
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
          throwIfRpcReturnedJsonError(resp.data);
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

        const allowedOlevelIds = new Set(studentsForOlevelExam.map((s) => s.student_id));
        // Build and filter valid rows (at least one numeric > 0 or non-empty text)
        const entries = Object.entries(examResultsSecondary)
          .map(([studentId, data]) => ({ studentId, data }))
          .filter(({ studentId }) => allowedOlevelIds.has(studentId))
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
        // Sequential RPCs: parallel saves on exam_results often deadlock (triggers / index updates).
        for (const { studentId, data } of entries) {
          const activityNum = parseFloat(data.activityScore) || 0;
          const descriptor = calculateActivityDescriptor(activityNum);
          const formativeCap = typeof oLevelFormativeMax === 'number' ? oLevelFormativeMax : 40;
          const formativeNum = descriptor === 'Basic' ? 0 : Math.min(Math.max(parseFloat(data.formative) || 0, 0), formativeCap);
          const examNum = descriptor === 'Basic' ? 0 : Math.min(Math.max(parseFloat(data.exam) || 0, 0), 80);
          const finalNum = formativeNum + examNum;
          const letterGrade = calculateSecondaryGrade(finalNum, (selectedSubject || '').trim());

          const rpcParams = {
            p_school_id: schoolId,
            p_exam_set_id: selectedExamSet,
            p_student_id: studentId,
            p_class_name: normalizedClassName,
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
            p_paper_code: null,
            p_paper_number: null,
            p_grade: letterGrade,
          };

          console.log('Saving secondary exam result with params:', rpcParams);

          const resp = await supabase.rpc('teacher_upsert_exam_result_secondary', rpcParams);

          console.log('RPC response:', resp);

          if (resp.error) {
            console.error(
              'RPC olevel save error:',
              JSON.stringify(
                {
                  code: resp.error.code,
                  message: resp.error.message,
                  details: resp.error.details,
                  hint: resp.error.hint,
                },
                null,
                2,
              ),
            );
            setError(formatSupabaseCallError(resp.error));
            throw resp.error;
          }
          assertTeacherUpsertRpcResult(resp.data);
        }
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
      const msg =
        err instanceof Error
          ? err.message
          : formatSupabaseCallError(err as { message?: string; details?: string; hint?: string; code?: string });
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Prefill previously saved results when exam set + subject selected (non–pre-primary nursery)
  useEffect(() => {
    const prefill = async () => {
      if (isNursery) return;
      const rosterForPrefill = isALevel
        ? studentsForAlevelExam
        : isSecondary
          ? studentsForOlevelExam
          : students;
      if (!resolvedSchoolId || !resolvedTeacherId || !selectedExamSet || !selectedSubject || rosterForPrefill.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('exam_results')
          .select('*')
          .eq('school_id', resolvedSchoolId)
          .eq('class_name', normalizedClassName)
          .eq('exam_set_id', selectedExamSet)
          .eq('subject', selectedSubject)
          .eq('teacher_id', resolvedTeacherId);
        if (error) return;

        const rows = data || [];
        if (isALevel) {
          const lineRows = rows.filter((r) =>
            matchesAlevelExamPaperLine(r, selectedAlevelPaperCode, topicFilter)
          );
          const map: Record<string, { marks: string; totalMarks: string; grade: string; remark?: string }> = {};
          lineRows.forEach((r) => {
            const marksStr = r.marks_obtained != null ? String(r.marks_obtained) : '';
            const totalStr = r.total_marks != null ? String(r.total_marks) : '100';
            const mn = parseFloat(marksStr);
            const tn = parseFloat(totalStr) || 100;
            const grade =
              marksStr.trim() !== '' && !Number.isNaN(mn)
                ? calculateUacePrincipalGradeFromMarks(mn, tn).grade
                : (r.grade || '');
            map[r.student_id] = {
              marks: marksStr,
              totalMarks: totalStr,
              grade,
              remark: (r.remarks ?? r.overall_remark ?? '') as string,
            };
          });
          setExamResults(map);
        } else if (!isSecondary) {
          const map: Record<string, { marks: string; totalMarks: string; grade: string } > = {};
          rows.forEach(r => {
            map[r.student_id] = {
              marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
              totalMarks: r.total_marks != null ? String(r.total_marks) : '',
              grade: r.grade || ''
            };
          });
          setExamResults(map);
        } else {
          setExamResultsSecondary(buildSecondaryOlevelExamResultsMapFromRows(rows, topicFilter));
        }
      } catch {}
    };
    prefill();
  }, [resolvedSchoolId, resolvedTeacherId, selectedExamSet, selectedSubject, selectedAlevelPaperCode, topicFilter, students, studentsForAlevelExam, studentsForOlevelExam, isSecondary, isALevel, normalizedClassName, isNursery]);

  // Allow manual refresh of saved results after save
  const reloadSavedResults = async () => {
    if (!resolvedSchoolId || !resolvedTeacherId || !selectedExamSet) {
      return;
    }

    if (isNursery) {
      try {
        const { data, error } = await supabase
          .from('exam_results')
          .select('*')
          .eq('school_id', resolvedSchoolId)
          .eq('class_name', normalizedClassName)
          .eq('exam_set_id', selectedExamSet)
          .in('subject', ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS)
          .eq('teacher_id', resolvedTeacherId);
        if (error) {
          console.error('Error loading saved results:', error);
          return;
        }
        const rows = data || [];
        const map: Record<string, NurseryPerformanceRecord> = {};
        for (const r of rows) {
          const raw = r.nursery_skill_performance;
          if (!raw) continue;
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
          if (!source) continue;
          const sid = r.student_id as string;
          if (!map[sid]) map[sid] = {};
          const acc = map[sid];
          Object.entries(source).forEach(([skillKey, value]) => {
            const canonicalKey = canonicalizePrePrimaryHolisticSkillKey(skillKey);
            if (!canonicalKey) return;
            const normalizedValue = normalizePrePrimaryHolisticRating(value);
            if (normalizedValue) acc[canonicalKey] = normalizedValue;
          });
        }
        setNurseryPerformances(map);
        setNurseryDirtyStudents({});
        setExamResults({});
      } catch (err) {
        console.error('Exception in reloadSavedResults (nursery):', err);
      }
      return;
    }

    if (!selectedSubject) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('school_id', resolvedSchoolId)
        .eq('class_name', normalizedClassName)
        .eq('exam_set_id', selectedExamSet)
        .eq('subject', selectedSubject)
        .eq('teacher_id', resolvedTeacherId);

      if (error) {
        console.error('Error loading saved results:', error);
        return;
      }

      const rows = data || [];

      if (!isSecondary && !isALevel) {
        const map: Record<string, { marks: string; totalMarks: string; grade: string } > = {};
        rows.forEach(r => {
          map[r.student_id] = {
            marks: r.marks_obtained != null ? String(r.marks_obtained) : '',
            totalMarks: r.total_marks != null ? String(r.total_marks) : '100',
            grade: r.grade || ''
          };
        });
        setExamResults(map);
      } else if (isALevel) {
        const lineRows = rows.filter((r) =>
          matchesAlevelExamPaperLine(r, selectedAlevelPaperCode, topicFilter)
        );
        const map: Record<string, { marks: string; totalMarks: string; grade: string; remark?: string }> = {};
        lineRows.forEach((r) => {
          const marksStr = r.marks_obtained != null ? String(r.marks_obtained) : '';
          const totalStr = r.total_marks != null ? String(r.total_marks) : '100';
          const mn = parseFloat(marksStr);
          const tn = parseFloat(totalStr) || 100;
          const grade =
            marksStr.trim() !== '' && !Number.isNaN(mn)
              ? calculateUacePrincipalGradeFromMarks(mn, tn).grade
              : (r.grade || '');
          map[r.student_id] = {
            marks: marksStr,
            totalMarks: totalStr,
            grade,
            remark: (r.remarks ?? r.overall_remark ?? '') as string,
          };
        });
        setExamResults(map);
        const sample = lineRows[0];
        if (sample) {
          const pc = (sample.paper_code ?? '').toString().trim();
          const pn = (sample.paper_number ?? '').toString().trim();
          if (pc) setSelectedAlevelPaperCode(pc);
          if (pn) setTopicFilter(pn);
        }
      } else {
        const map = buildSecondaryOlevelExamResultsMapFromRows(rows, topicFilter);
        setExamResultsSecondary(map);
        console.log('reloadSavedResults: Updated examResultsSecondary with', Object.keys(map).length, 'entries');
      }
    } catch (err) {
      console.error('Exception in reloadSavedResults:', err);
    }
  };

  // When switching Exam Set or Subject, clear current UI state and load saved rows for the new selection
  useEffect(() => {
    if (!selectedExamSet) return;
    setError(null);
    setSuccess(null);
    if (isNursery) {
      void reloadSavedResults();
      return;
    }
    if (!selectedSubject) return;
    setExamResults({});
    setExamResultsSecondary({});
    void reloadSavedResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamSet, selectedSubject, selectedAlevelPaperCode, topicFilter, isNursery, isALevel]);

  useEffect(() => {
    if (!isNursery) {
      setNurseryPerformances({});
      setNurseryDirtyStudents({});
    }
  }, [isNursery]);

  useEffect(() => {
    if (!isNursery || teacherSubjects.length === 0) return;
    setSelectedSubject((prev) => prev || teacherSubjects[0]);
  }, [isNursery, teacherSubjects]);

  // Refresh class teacher status when teacher ID changes
  useEffect(() => {
    if (resolvedTeacherId && resolvedSchoolId) {
      refreshClassTeacherStatus();
    }
  }, [resolvedTeacherId, resolvedSchoolId, normalizedClassName]);

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
            {!isNursery && (
              <button
                onClick={() => setShowGradeSettings(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Grade Settings
              </button>
            )}
            <button
              onClick={() => setShowTeacherRemarks(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
            >
              Teacher's Remarks Settings
            </button>
            {!isNursery && isClassTeacher && (
              <button
                onClick={() => setShowClassTeacherComments(true)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
              >
                Class Teacher's Comments Settings
              </button>
            )}
            {/* Comments buttons removed per request */}
            <button
              onClick={() => navigate('/dashboard/teacher/exam-results')}
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
                {displaySubjects.map(s => (
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
                    const { data: { user: u2 } } = await supabase.auth.getUser();
                    await supabase
                      .from("teacher_remarks_settings")
                      .delete()
                      .eq("school_id", resolvedSchoolId)
                      .eq("subject", subj);
                    const insertPayload = payload.map((r) => ({
                      school_id: resolvedSchoolId,
                      subject: subj,
                      min_percent: r.min_percent,
                      max_percent: r.max_percent,
                      comment_text: r.comment_text,
                      created_by: u2?.id ?? null,
                    }));
                    const { error: insErr } = await supabase.from("teacher_remarks_settings").insert(insertPayload);
                    if (insErr) throw new Error(insErr.message);
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
      {!isNursery && showClassTeacherComments && (
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
                    const { data: { user: u2 } } = await supabase.auth.getUser();
                    const upsertRows = payload.map((r) => ({
                      school_id: resolvedSchoolId,
                      class_name: normalizedClassName,
                      min_percent: r.min_percent,
                      max_percent: r.max_percent,
                      comment_text: r.comment_text,
                      created_by: u2?.id ?? null,
                    }));
                    const { error: upErr } = await supabase
                      .from("class_teacher_comments_settings")
                      .upsert(upsertRows, {
                        onConflict: "school_id,class_name,min_percent,max_percent",
                        ignoreDuplicates: false,
                      });
                    if (upErr) throw new Error(upErr.message);
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
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 mb-6"
        >
          <h3 className="text-white font-medium mb-4">Select Exam Set and Subject</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Exam Set</label>
              <select
                value={selectedExamSet}
                onChange={(e) => setSelectedExamSet(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
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
              <label className="block text-white/80 text-sm mb-2">Subject</label>
              <select
                value={selectedSubject}
                disabled={subjectLocked}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  if (isALevel) {
                    setSelectedAlevelPaperCode('');
                    setTopicFilter('');
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 disabled:opacity-70"
              >
                <option value="">Select Subject</option>
                {displaySubjects.map(subject => (
                  <option key={subject} value={subject} className="bg-slate-800">
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            {isSecondary && (
              <div>
                <label className="block text-white/80 text-sm mb-2">Topic</label>
                <input
                  type="text"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="e.g., 1 Classification"
                  className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
                />
              </div>
            )}
            {isALevel && (
              <>
                <div>
                  <label className="block text-white/80 text-sm mb-2">Paper (school config)</label>
                  {uacePaperOptions.length > 0 ? (
                    <select
                      value={alevelPaperSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setSelectedAlevelPaperCode("");
                          setTopicFilter("");
                          return;
                        }
                        const row = uacePaperOptions.find((p) => p.id === v);
                        setSelectedAlevelPaperCode("");
                        setTopicFilter(row?.paper_label ?? "");
                      }}
                      className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
                    >
                      <option value="">— Single line / type label below —</option>
                      {uacePaperOptions.map((p) => {
                        const optVal = uacePaperSelectOptionValue(p);
                        const label = p.paper_label ?? `Paper ${p.paper_slot}`;
                        return (
                          <option key={p.id} value={optVal} className="bg-slate-800">
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <p className="text-white/60 text-xs">
                      No papers in Admin → Settings for this class/subject. Use the field below (stored as paper
                      number only).
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-2">Paper label / number</label>
                  <input
                    type="text"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    placeholder="e.g., Paper 1 (or matches admin label)"
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
                  />
                </div>
              </>
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
                      : isNursery
                        ? 'Pre-primary holistic grid: choose Very Good, Good, Needs Improvement, or Tries for each skill (any exam set).'
                        : 'Enter marks out of 100.'}
                  </p>
                </div>
                {/* Manual refresh buttons removed to streamline UI */}
              </div>
            </div>
            <div className="overflow-x-auto">
              {!isSecondary && !isALevel ? (
                isNursery ? (
                  activePrePrimaryHolisticStrand ? (
                    <table className="min-w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Student</th>
                          {activePrePrimaryHolisticStrand.skills.map((skill) => (
                            <th
                              key={skill.key}
                              className="px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider max-w-[11rem]"
                            >
                              {skill.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {students.map((student) => {
                          const performance = nurseryPerformances[student.student_id] || {};
                          return (
                            <tr key={student.student_id} className="hover:bg-white/5">
                              <td className="px-4 py-4 align-top text-white">
                                <div className="font-medium">{student.name}</div>
                                {student.admission_number && (
                                  <div className="text-xs text-white/60 mt-1">{student.admission_number}</div>
                                )}
                              </td>
                              {activePrePrimaryHolisticStrand.skills.map((skill) => {
                                const skillKey = skill.key;
                                const selected = performance[skillKey] as PrePrimaryHolisticRating | undefined;
                                const color = selected
                                  ? PRE_PRIMARY_HOLISTIC_RATINGS.find((r) => r.label === selected)?.color
                                  : undefined;
                                const badgeTextColor = selected && color ? getNurseryReadableTextColor(color) : '#94a3b8';
                                const cellBackground = selected && color ? applyAlphaToHex(color, 0.18) : 'transparent';
                                return (
                                  <td
                                    key={skillKey}
                                    className="px-2 py-3 align-top"
                                    style={{ background: cellBackground }}
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <div
                                        className="w-full text-center text-[10px] font-semibold uppercase tracking-wide px-1 py-1.5 rounded-md border border-white/10 transition-colors"
                                        style={{
                                          background: selected && color ? color : 'rgba(255,255,255,0.05)',
                                          color: badgeTextColor,
                                        }}
                                      >
                                        {selected || '—'}
                                      </div>
                                      <div className="flex flex-wrap justify-center gap-1">
                                        {PRE_PRIMARY_HOLISTIC_RATINGS.map((option) => {
                                          const isSelected = option.label === selected;
                                          const buttonTextColor = getNurseryReadableTextColor(option.color);
                                          return (
                                            <button
                                              key={option.label}
                                              type="button"
                                              onClick={() =>
                                                handleNurserySelection(student.student_id, skillKey, option.label)
                                              }
                                              className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full shadow-sm transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/60"
                                              style={{
                                                background: option.color,
                                                color: buttonTextColor,
                                                opacity: isSelected ? 1 : 0.78,
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                boxShadow: isSelected
                                                  ? '0 0 0 2px rgba(255,255,255,0.7)'
                                                  : '0 1px 4px rgba(15,23,42,0.25)',
                                              }}
                                            >
                                              {option.label}
                                              {isSelected ? ' ✓' : ''}
                                            </button>
                                          );
                                        })}
                                        <button
                                          type="button"
                                          onClick={() => handleNurseryClear(student.student_id, skillKey)}
                                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-white/15 text-white hover:bg-white/25 transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/40"
                                        >
                                          Clear
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-white/70 text-sm">
                      Select a learning area (strand) above to record ratings for its three skills.
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
                    {studentsForAlevelExam.map((student) => {
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
                            <span className={`px-2 py-1 text-xs rounded ${getUaceGradeBadgeClass(grade)}`}>{grade || '-'}</span>
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
                    {studentsForOlevelExam.map(student => {
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
        {!isNursery && showGradeSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white text-xl font-semibold">Grade Settings</h2>
                  {examGradeSettingsLoading && (
                    <p className="text-white/50 text-xs mt-1">Loading saved settings from your school…</p>
                  )}
                </div>
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

                {/* O-Level class (Senior 1–4): only O-Level controls — no A-Level toggle */}
                {isSecondary && (
                  <>
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                      <span className="font-medium">O-Level</span>
                      <span className="text-white/80">
                        {' '}
                        — Class {className}. Grade bands below are only for the subject you have selected for exam entry
                        {gradeSettingsSubject ? ` (${gradeSettingsSubject})` : ''}.
                      </span>
                    </div>
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
                    <div className="border border-white/10 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">Grade Remarks (O-Level, A–E)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map((g) => (
                          <div key={g} className="flex flex-col gap-2">
                            <label className="text-white/80 text-sm">Remark for Grade {g}</label>
                            <textarea
                              value={gradeRemarksOLevel[g] || ''}
                              onChange={(e) =>
                                setGradeRemarksOLevel((prev) => ({ ...prev, [g]: e.target.value }))
                              }
                              className="w-full min-h-[64px] px-3 py-2 rounded border border-white/20 bg-white/10 text-white text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border border-white/10 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">O-Level Settings</h3>
                      <div className="flex items-center gap-3">
                        <label className="text-white/80 text-sm">Formative Max</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={oLevelFormativeMax}
                          onChange={(e) =>
                            setOLevelFormativeMax(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
                          }
                          className="w-24 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* A-Level class (Senior 5–6): only A-Level controls */}
                {isALevel && (
                  <>
                    <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                      <span className="font-medium">A-Level</span>
                      <span className="text-white/80">
                        {' '}
                        — Class {className}. Grade bands below are only for the subject you have selected for exam entry
                        {gradeSettingsSubject ? ` (${gradeSettingsSubject})` : ''}.
                      </span>
                      <p className="mt-2 text-xs text-amber-100/90">
                        Default percentage-to-grade rules apply for all schools today. Custom A-Level ranges per school will be configurable in a future update.
                      </p>
                    </div>
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
                    <div className="border border-white/10 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-3">Grade Remarks (A-Level)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['A', 'B', 'C', 'D', 'E', 'O', 'F'] as const).map((g) => (
                          <div key={g} className="flex flex-col gap-2">
                            <label className="text-white/80 text-sm">Remark for Grade {g}</label>
                            <textarea
                              value={gradeRemarksALevel[g] || ''}
                              onChange={(e) =>
                                setGradeRemarksALevel((prev) => ({ ...prev, [g]: e.target.value }))
                              }
                              className="w-full min-h-[64px] px-3 py-2 rounded border border-white/20 bg-white/10 text-white text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Primary: percentage → D1–F9 for the current subject only */}
                {!isSecondary && !isALevel && gradeSettingsSubject && (
                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Subject grading (primary) — {gradeSettingsSubject}</h3>
                    <p className="text-white/60 text-xs mb-3">
                      Percentage out of 100 → Division / credit grades (D1, D2, C3, … F9). Only this subject is shown.
                    </p>
                    <div className="space-y-2">
                      {(
                        gradeSettings[scopedGradeKey(gradeSettingsSubject)] || getDefaultGrades()
                      ).map((grade, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.min}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = gradeSettings[sk] || getDefaultGrades();
                              const newGrades = [...base];
                              newGrades[index].min = parseInt(e.target.value) || 0;
                              setGradeSettings((prev) => ({ ...prev, [sk]: newGrades }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">to</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.max}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = gradeSettings[sk] || getDefaultGrades();
                              const newGrades = [...base];
                              newGrades[index].max = parseInt(e.target.value) || 100;
                              setGradeSettings((prev) => ({ ...prev, [sk]: newGrades }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">=</span>
                          <input
                            type="text"
                            value={grade.grade}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = gradeSettings[sk] || getDefaultGrades();
                              const newGrades = [...base];
                              newGrades[index].grade = e.target.value;
                              setGradeSettings((prev) => ({ ...prev, [sk]: newGrades }));
                            }}
                            className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isSecondary && !isALevel && !gradeSettingsSubject && (
                  <p className="text-amber-200/90 text-sm">
                    Select a subject on the main page to edit primary grade bands for that subject.
                  </p>
                )}

                {/* Secondary final score → A–E for the current subject only (not primary D1–F9) */}
                {(isSecondary || isALevel) && gradeSettingsSubject && (
                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Final score bands — {gradeSettingsSubject}</h3>
                    <p className="text-white/60 text-xs mb-3">
                      Final score is out of 100. Use letters A–E only (O-Level / A-Level). Adjust percentages per subject as
                      needed.
                    </p>
                    <div className="space-y-2">
                      {(
                        secondaryGradeSettings[scopedGradeKey(gradeSettingsSubject)] ||
                        getDefaultSecondaryGradeBands()
                      ).map((grade, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.min}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = secondaryGradeSettings[sk] || getDefaultSecondaryGradeBands();
                              const newGrades = [...base];
                              newGrades[index].min = parseInt(e.target.value) || 0;
                              setSecondaryGradeSettings((prev) => ({
                                ...prev,
                                [sk]: newGrades,
                              }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">to</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.max}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = secondaryGradeSettings[sk] || getDefaultSecondaryGradeBands();
                              const newGrades = [...base];
                              newGrades[index].max = parseInt(e.target.value) || 100;
                              setSecondaryGradeSettings((prev) => ({
                                ...prev,
                                [sk]: newGrades,
                              }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">=</span>
                          <input
                            type="text"
                            value={grade.grade}
                            onChange={(e) => {
                              const sk = scopedGradeKey(gradeSettingsSubject);
                              const base = secondaryGradeSettings[sk] || getDefaultSecondaryGradeBands();
                              const newGrades = [...base];
                              newGrades[index].grade = e.target.value;
                              setSecondaryGradeSettings((prev) => ({
                                ...prev,
                                [sk]: newGrades,
                              }));
                            }}
                            className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(isSecondary || isALevel) && !gradeSettingsSubject && (
                  <p className="text-amber-200/90 text-sm">
                    Select a subject above to edit A–E percentage bands for that subject.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
                <p className="text-white/50 text-xs max-w-md">
                  Changes apply after you save. They are stored in Supabase for your account and this class.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGradeSettings(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={examGradeSettingsSaving || examGradeSettingsLoading || !resolvedSchoolId || !normalizedClassName}
                    onClick={() => void saveTeacherExamGradeSettingsToSupabase()}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white"
                  >
                    {examGradeSettingsSaving ? "Saving…" : "Save settings"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments modal removed per request */}
      </div>
    </div>
  );
}
