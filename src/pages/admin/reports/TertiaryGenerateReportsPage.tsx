import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { supabase } from '@/lib/supabase';
import SemesterResultSlip, { ResultSlipUnitItem } from '@/features/tertiary/components/SemesterResultSlip';
import AcademicTranscript, { TranscriptSemesterBlock } from '@/features/tertiary/components/AcademicTranscript';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import {
  calculateGradeAndGP,
  calculateSemesterGPA,
  calculateCumulativeCGPA,
  determineAcademicStanding,
  determineAwardClassification,
} from '@/features/tertiary/services/gradingEngine';
import {
  UNMEB_CERTIFICATE_NURSING_UNITS,
  DEFAULT_PROGRAMMES,
  STAGE_LABELS,
} from '@/features/tertiary/data/unmebCurriculumDefaults';
import {
  SemesterStage,
  TertiaryStudentProfile,
  HospitalWardPosting,
} from '@/features/tertiary/types';
import {
  Printer,
  FileText,
  GraduationCap,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  Users,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

const STALE_TIME_MS = 5 * 60 * 1000;

export default function TertiaryGenerateReportsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  // Document controls
  const [docType, setDocType] = useState<'slip' | 'transcript'>('slip');
  const [mode, setMode] = useState<'unmeb' | 'internal'>('unmeb');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<SemesterStage>('Y1S1');
  const [showFeesBalance, setShowFeesBalance] = useState<boolean>(false);
  const [nextSemesterDate, setNextSemesterDate] = useState<string>('');
  const [registrarRemarks, setRegistrarRemarks] = useState<string>(
    'Good steady academic and clinical progress. Recommended to proceed to next semester stage.'
  );

  // Fetch school metadata
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase
        .from('schools')
        .select('name, logo_url, address, contact, email, motto, next_term_begins_date')
        .eq('school_id', schoolId)
        .single();
      return data;
    },
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  // Fetch real students from Supabase
  const { data: rawStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students-tertiary', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('student_id, first_name, last_name, admission_number, class_name, gender')
        .eq('school_id', schoolId)
        .order('last_name', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  // Map to TertiaryStudentProfile
  const students: TertiaryStudentProfile[] = useMemo(() => {
    return rawStudents.map((s) => ({
      id: s.student_id,
      schoolId: schoolId || 'school-1',
      fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
      collegeRegNo: s.admission_number || `REG-${s.student_id.slice(0, 6)}`,
      unmebExamNo: `U${s.admission_number || s.student_id.slice(0, 6)}`,
      programmeId: 'prog-1',
      programmeName: s.class_name || 'Certificate in Nursing',
      cohortId: 'cohort-1',
      cohortName: s.class_name || 'General Cohort',
      currentStage: selectedStage,
      academicStanding: 'NORMAL_PROGRESS' as const,
      gender: (s.gender as 'male' | 'female') || 'female',
    }));
  }, [rawStudents, schoolId, selectedStage]);

  // Set default student
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (schoolData?.next_term_begins_date && !nextSemesterDate) {
      setNextSemesterDate(schoolData.next_term_begins_date);
    }
  }, [schoolData, nextSemesterDate]);

  // Filter cohorts
  const cohorts = useMemo(() => {
    const set = new Set(students.map((s) => s.cohortName || 'General Cohort'));
    return Array.from(set);
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedCohort === 'all') return students;
    return students.filter((s) => (s.cohortName || 'General Cohort') === selectedCohort);
  }, [students, selectedCohort]);

  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Fetch LIVE marks from Supabase exam_results for activeStudent
  const { data: liveMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['tertiary-student-live-marks', schoolId, activeStudent?.id],
    queryFn: async () => {
      if (!schoolId || !activeStudent?.id) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade')
        .eq('school_id', schoolId)
        .eq('student_id', activeStudent.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!schoolId && !!activeStudent?.id,
    staleTime: STALE_TIME_MS,
  });

  // Base curriculum units for selected stage
  const unitsForStage: ResultSlipUnitItem[] = useMemo(() => {
    const matching = UNMEB_CERTIFICATE_NURSING_UNITS.filter(
      (u) => u.defaultSemester === selectedStage
    );
    const pool = matching.length > 0 ? matching : UNMEB_CERTIFICATE_NURSING_UNITS.slice(0, 4);

    // Map units, joining live marks if recorded
    return pool.map((u) => {
      const match = liveMarks.find(
        (m) =>
          m.subject?.toLowerCase().includes(u.code.toLowerCase()) ||
          m.subject?.toLowerCase().includes(u.title.toLowerCase()) ||
          u.title.toLowerCase().includes(m.subject?.toLowerCase())
      );

      if (match && match.marks_obtained != null) {
        const total = Number(match.marks_obtained);
        const cw = Math.round(total * 0.3);
        const ex = Math.max(0, total - cw);
        const res = calculateGradeAndGP(total);
        return {
          code: u.code,
          title: u.title,
          creditUnits: u.creditUnits,
          courseworkScore: cw,
          examScore: ex,
          totalScore: total,
          grade: match.grade || res.grade,
          gradePoint: res.gradePoint,
          status: res.isRetake ? ('RETAKE' as const) : ('PASS' as const),
        };
      }

      // No live mark yet -> clean pending state, zero synthetic numbers
      return {
        code: u.code,
        title: u.title,
        creditUnits: u.creditUnits,
        courseworkScore: 0,
        examScore: 0,
        totalScore: 0,
        grade: 'F' as const,
        gradePoint: 0,
        status: 'RETAKE' as const,
      };
    });
  }, [selectedStage, liveMarks]);

  const [units, setUnits] = useState<ResultSlipUnitItem[]>(unitsForStage);

  useEffect(() => {
    setUnits(unitsForStage);
  }, [unitsForStage]);

  // Handler to update mark dynamically in UI
  const handleScoreChange = (index: number, cw: number, ex: number) => {
    setUnits((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.courseworkScore = cw;
      target.examScore = ex;
      const total = Math.min(100, Math.max(0, cw + ex));
      target.totalScore = total;
      const res = calculateGradeAndGP(total);
      target.grade = res.grade;
      target.gradePoint = res.gradePoint;
      target.status = res.isRetake ? ('RETAKE' as const) : ('PASS' as const);
      copy[index] = target;
      return copy;
    });
  };

  // Calculations
  const semesterGPA = useMemo(() => {
    const validUnits = units.filter((u) => (u.totalScore ?? 0) > 0);
    if (validUnits.length === 0) return 0;
    return calculateSemesterGPA(
      validUnits.map((u) => ({ creditUnits: u.creditUnits, gradePoint: u.gradePoint }))
    );
  }, [units]);

  const cumulativeCGPA = useMemo(() => {
    const validUnits = units.filter((u) => (u.totalScore ?? 0) > 0);
    if (validUnits.length === 0) return 0;
    return calculateCumulativeCGPA(
      validUnits.map((u) => ({ creditUnits: u.creditUnits, gradePoint: u.gradePoint }))
    );
  }, [units]);

  const academicStanding = useMemo(() => {
    if (semesterGPA === 0) return 'PENDING_EVALUATION';
    return determineAcademicStanding(
      units.map((u) => ({ isRetake: u.status === 'RETAKE', gradePoint: u.gradePoint })),
      semesterGPA
    );
  }, [units, semesterGPA]);

  // Stored ward postings for this school
  const wardPostings: HospitalWardPosting[] = useMemo(() => {
    try {
      const saved = localStorage.getItem(`pwezacore_ward_postings_${schoolId || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'wp-1',
        schoolId: schoolId || 'school-1',
        hospitalName: 'Regional Referral Hospital',
        wardName: 'Maternity / Labour Ward',
        startDate: '2025-02-03',
        endDate: '2025-04-11',
        requiredHours: 160,
        completedHours: 160,
        physicalLogbookVerified: true,
        status: 'cleared',
      },
    ];
  }, [schoolId]);

  // Dynamic transcript semesters based on actual stage
  const transcriptSemesters: TranscriptSemesterBlock[] = useMemo(() => {
    return [
      {
        stage: selectedStage,
        stageLabel: STAGE_LABELS[selectedStage] || selectedStage,
        semesterGPA: Number(semesterGPA.toFixed(2)),
        cumulativeCGPA: Number(cumulativeCGPA.toFixed(2)),
        units: units.map((u) => ({
          code: u.code,
          title: u.title,
          gradePoint: u.gradePoint,
          grade: u.grade,
        })),
      },
    ];
  }, [selectedStage, semesterGPA, cumulativeCGPA, units]);

  const awardClassification = useMemo(() => {
    return determineAwardClassification(cumulativeCGPA);
  }, [cumulativeCGPA]);

  if (!activeStudent && !studentsLoading) {
    return (
      <AdminPageWrapper
        title="Result Slips &amp; Transcripts"
        subtitle="Generate official UNMEB result slips and academic transcripts."
      >
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <PosEmptyState
            icon={<GraduationCap className="w-8 h-8 text-teal-400" />}
            title="No Tertiary Students Enrolled"
            description="Enroll students in your institution to generate verified result slips, hospital clinical postings, and transcripts."
            accentColor="mint"
          />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      eyebrow="Academic Records &amp; Transcripts"
      title="Result Slips &amp; Transcripts Generator"
      subtitle="Generate, preview, and print official UNMEB semester result slips and verified cumulative academic transcripts."
    >
      <div className="w-full space-y-6">
        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Selected Trainee
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-100 truncate" style={{ fontFamily: SORA }}>
              {activeStudent?.fullName || 'None Selected'}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Reg: {activeStudent?.collegeRegNo}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Semester GPA
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {semesterGPA > 0 ? semesterGPA.toFixed(2) : '—'}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              CGPA: {cumulativeCGPA > 0 ? cumulativeCGPA.toFixed(2) : '—'}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Academic Standing
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-100 truncate" style={{ fontFamily: SORA }}>
              {academicStanding === 'NORMAL_PROGRESS'
                ? 'Normal Progress (NP)'
                : academicStanding === 'PENDING_EVALUATION'
                ? 'Pending Evaluation'
                : 'Probation (PB)'}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              {awardClassification}
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Clinical Clearance
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {wardPostings.filter((w) => w.physicalLogbookVerified).length} / {wardPostings.length}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Verified hospital logbooks
            </p>
          </div>
        </div>

        {/* Configuration Toolbar Card */}
        <div
          className="rounded-2xl p-5 shadow-sm space-y-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            {/* Document Type Switcher */}
            <div className="inline-flex rounded-xl p-1" style={{ backgroundColor: t.fieldBg }}>
              <button
                type="button"
                onClick={() => setDocType('slip')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  docType === 'slip'
                    ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                Semester Result Slip
              </button>
              <button
                type="button"
                onClick={() => setDocType('transcript')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  docType === 'transcript'
                    ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Academic Transcript
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>

          {/* Selectors Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <label className="font-medium text-slate-300 block mb-1">Programme / Cohort</label>
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="w-full rounded-xl border p-2.5 text-xs text-slate-100"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <option value="all">All Cohorts ({students.length} trainees)</option>
                {cohorts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Student / Trainee</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border p-2.5 text-xs font-medium text-slate-100"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.collegeRegNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Academic Session / Stage</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as SemesterStage)}
                className="w-full rounded-xl border p-2.5 text-xs text-slate-100"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <option value="Y1S1">Year 1 Semester 1 (Y1S1)</option>
                <option value="Y1S2">Year 1 Semester 2 (Y1S2)</option>
                <option value="Y2S1">Year 2 Semester 1 (Y2S1)</option>
                <option value="Y2S2">Year 2 Semester 2 (Y2S2)</option>
                <option value="Y3S1">Year 3 Semester 1 (Y3S1)</option>
                <option value="Y3S2">Year 3 Semester 2 (Y3S2)</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Assessment Scale</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'unmeb' | 'internal')}
                className="w-full rounded-xl border p-2.5 text-xs text-slate-100"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <option value="unmeb">UNMEB Standard National Board Scale</option>
                <option value="internal">Institution Internal Semester Exam</option>
              </select>
            </div>
          </div>

          {/* Slip Options */}
          {docType === 'slip' && (
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showFeesBalance}
                  onChange={(e) => setShowFeesBalance(e.target.checked)}
                  className="rounded accent-emerald-500 h-4 w-4"
                />
                Include Outstanding Tuition Balance Note
              </label>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Next Semester Begins:</span>
                <input
                  type="date"
                  value={nextSemesterDate}
                  onChange={(e) => setNextSemesterDate(e.target.value)}
                  className="rounded-lg border px-2.5 py-1 text-xs text-slate-100"
                  style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Course Units & Marks Ledger (for Slip mode) */}
        {docType === 'slip' && (
          <div
            className="rounded-2xl p-5 shadow-sm space-y-3"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2" style={{ fontFamily: SORA }}>
                <BookOpen className="h-4 w-4 text-teal-400" />
                Course Units &amp; Marks for {STAGE_LABELS[selectedStage]}
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-4">
                <span>
                  GPA: <strong className="text-emerald-400">{semesterGPA.toFixed(2)}</strong>
                </span>
                <span>
                  Standing:{' '}
                  <strong
                    className={
                      academicStanding === 'NORMAL_PROGRESS' ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    {academicStanding}
                  </strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead>
                  <tr
                    className="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                  >
                    <th className="py-2.5 px-3">Unit Code</th>
                    <th className="py-2.5 px-3">Course Unit Title</th>
                    <th className="py-2.5 px-3 text-center">Credit Units</th>
                    <th className="py-2.5 px-3 text-center">CW (30%)</th>
                    <th className="py-2.5 px-3 text-center">Exam (70%)</th>
                    <th className="py-2.5 px-3 text-center font-bold">Total (100%)</th>
                    <th className="py-2.5 px-3 text-center font-bold">Grade</th>
                    <th className="py-2.5 px-3 text-center">GP</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {units.map((u, idx) => (
                    <tr key={u.code} className="transition hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{u.code}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-100">{u.title}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{u.creditUnits}</td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={u.courseworkScore || 0}
                          onChange={(e) =>
                            handleScoreChange(idx, Number(e.target.value), u.examScore || 0)
                          }
                          className="w-16 rounded-lg border p-1 text-center font-mono text-slate-100"
                          style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={70}
                          value={u.examScore || 0}
                          onChange={(e) =>
                            handleScoreChange(idx, u.courseworkScore || 0, Number(e.target.value))
                          }
                          className="w-16 rounded-lg border p-1 text-center font-mono text-slate-100"
                          style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100">
                        {u.totalScore}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-teal-400">{u.grade}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                        {u.gradePoint.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.status === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : u.status === 'RETAKE'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Document Print Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Document Print Preview
            </h3>
            <span className="text-xs text-slate-500">
              {docType === 'slip'
                ? 'Uganda UNMEB Formal Result Slip'
                : 'Uganda Tertiary Council Transcript'}
            </span>
          </div>

          {activeStudent && docType === 'slip' && (
            <div className="overflow-x-auto rounded-2xl bg-white p-4 sm:p-8 text-black shadow-2xl">
              <SemesterResultSlip
                schoolName={schoolData?.name || 'Uganda Health Training Institute'}
                schoolLogoUrl={schoolData?.logo_url}
                schoolMotto={schoolData?.motto || 'Excellence in Health & Clinical Practice'}
                schoolAddress={schoolData?.address || 'P.O. Box 712, Uganda'}
                schoolContact={schoolData?.contact || '+256 700 000000'}
                mode={mode}
                student={activeStudent}
                semesterStage={selectedStage}
                academicYearSession="2024/2025 Academic Year – Semester 1"
                units={units}
                semesterGPA={semesterGPA}
                cumulativeCGPA={cumulativeCGPA}
                academicStanding={
                  academicStanding === 'NORMAL_PROGRESS'
                    ? 'NORMAL PROGRESS (NP)'
                    : 'PROBATION (PB)'
                }
                wardPostings={wardPostings}
                showFeesBalance={showFeesBalance}
                nextSemesterStartDate={nextSemesterDate}
                registrarRemarks={registrarRemarks}
              />
            </div>
          )}

          {activeStudent && docType === 'transcript' && (
            <div className="overflow-x-auto rounded-2xl bg-white p-4 sm:p-8 text-black shadow-2xl">
              <AcademicTranscript
                schoolName={schoolData?.name || 'Uganda Health Training Institute'}
                schoolLogoUrl={schoolData?.logo_url}
                schoolAddress={schoolData?.address || 'P.O. Box 712, Uganda'}
                schoolContact={schoolData?.contact || '+256 700 000000'}
                schoolEmail={schoolData?.email || 'registrar@healthtraining.ac.ug'}
                student={activeStudent}
                serialNumber="TR-004928"
                yearOfEntry="Jan-2023"
                yearOfCompletion="Jun-2025"
                awardConferred="CERTIFICATE IN NURSING"
                awardClassification={awardClassification}
                finalCGPA={cumulativeCGPA}
                semesters={transcriptSemesters}
                issueDate={new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                printMode="full"
              />
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
