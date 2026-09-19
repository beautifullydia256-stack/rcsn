import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import SemesterResultSlip, { ResultSlipUnitItem } from '@/features/tertiary/components/SemesterResultSlip';
import AcademicTranscript, { TranscriptSemesterBlock } from '@/features/tertiary/components/AcademicTranscript';
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
} from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

export default function TertiaryGenerateReportsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);

  // Document controls
  const [docType, setDocType] = useState<'slip' | 'transcript'>('slip');
  const [mode, setMode] = useState<'unmeb' | 'internal'>('unmeb');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<SemesterStage>('Y1S1');
  const [showFeesBalance, setShowFeesBalance] = useState<boolean>(false);
  const [nextSemesterDate, setNextSemesterDate] = useState<string>('');
  const [registrarRemarks, setRegistrarRemarks] = useState<string>(
    'Good steady academic and clinical progress. Recommended to proceed to Year 1 Semester 2.'
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
  const { data: rawStudents = [] } = useQuery({
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
    if (rawStudents.length > 0) {
      return rawStudents.map((s) => ({
        id: s.student_id,
        schoolId: schoolId || 'school-1',
        fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
        collegeRegNo: s.admission_number || `REG-${s.student_id.slice(0, 6)}`,
        unmebExamNo: `U${s.admission_number || s.student_id.slice(0, 6)}`,
        programmeId: 'prog-1',
        programmeName: s.class_name || 'Certificate in Nursing',
        cohortId: 'cohort-1',
        cohortName: s.class_name || 'March 2024 Intake',
        currentStage: 'Y1S1' as const,
        academicStanding: 'NORMAL_PROGRESS' as const,
        gender: (s.gender as 'male' | 'female') || 'female',
      }));
    }
    return [
      {
        id: 'stud-1',
        schoolId: schoolId || 'school-1',
        fullName: 'Nalubega Sarah',
        collegeRegNo: 'NUR/2024/001',
        unmebExamNo: 'UNMEB/NUR/24/012',
        programmeId: 'prog-1',
        programmeName: 'Certificate in Nursing',
        cohortId: 'cohort-1',
        cohortName: 'Year 1 March Intake',
        currentStage: 'Y1S1' as const,
        academicStanding: 'NORMAL_PROGRESS' as const,
        gender: 'female',
      },
      {
        id: 'stud-2',
        schoolId: schoolId || 'school-1',
        fullName: 'Kato Emmanuel',
        collegeRegNo: 'MID/2024/004',
        unmebExamNo: 'UNMEB/MID/24/048',
        programmeId: 'prog-2',
        programmeName: 'Certificate in Midwifery',
        cohortId: 'cohort-2',
        cohortName: 'Year 1 August Intake',
        currentStage: 'Y1S1' as const,
        academicStanding: 'NORMAL_PROGRESS' as const,
        gender: 'male',
      },
    ];
  }, [rawStudents, schoolId]);

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
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Initialise curriculum units for selected stage
  const defaultUnitsForStage: ResultSlipUnitItem[] = useMemo(() => {
    const matching = UNMEB_CERTIFICATE_NURSING_UNITS.filter((u) => u.defaultSemester === selectedStage);
    const pool = matching.length > 0 ? matching : UNMEB_CERTIFICATE_NURSING_UNITS.slice(0, 4);

    return pool.map((u, i) => {
      // realistic scores
      const cw = 22 + (i % 6);
      const ex = 50 + (i % 15);
      const total = cw + ex;
      const res = calculateGradeAndGP(total);

      return {
        code: u.code,
        title: u.title,
        creditUnits: u.creditUnits,
        courseworkScore: cw,
        examScore: ex,
        totalScore: total,
        grade: res.grade,
        gradePoint: res.gradePoint,
        status: res.isRetake ? 'RETAKE' : 'PASS',
      };
    });
  }, [selectedStage]);

  const [units, setUnits] = useState<ResultSlipUnitItem[]>(defaultUnitsForStage);

  useEffect(() => {
    setUnits(defaultUnitsForStage);
  }, [defaultUnitsForStage]);

  // Handler to update mark dynamically
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
      target.status = res.isRetake ? 'RETAKE' : 'PASS';
      copy[index] = target;
      return copy;
    });
  };

  // Calculations
  const semesterGPA = useMemo(() => {
    return calculateSemesterGPA(
      units.map((u) => ({ creditUnits: u.creditUnits, gradePoint: u.gradePoint }))
    );
  }, [units]);

  const cumulativeCGPA = useMemo(() => {
    return calculateCumulativeCGPA(
      units.map((u) => ({ creditUnits: u.creditUnits, gradePoint: u.gradePoint }))
    );
  }, [units]);

  const academicStanding = useMemo(() => {
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
        hospitalName: 'Masaka Regional Referral Hospital',
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

  // Transcript semesters data
  const transcriptSemesters: TranscriptSemesterBlock[] = useMemo(() => {
    return [
      {
        stage: 'Y1S1',
        stageLabel: 'Year 1 Semester 1',
        semesterGPA: 4.25,
        cumulativeCGPA: 4.25,
        units: [
          { code: 'NUR 1101', title: 'Anatomy & Physiology I', gradePoint: 4.5, grade: 'B+' },
          { code: 'NUR 1102', title: 'Fundamentals of Nursing Practice', gradePoint: 5.0, grade: 'A' },
          { code: 'NUR 1103', title: 'Microbiology & Infection Control', gradePoint: 4.0, grade: 'B' },
          { code: 'NUR 1104', title: 'First Aid & Disaster Management', gradePoint: 4.5, grade: 'B+' },
        ],
      },
      {
        stage: 'Y1S2',
        stageLabel: 'Year 1 Semester 2',
        semesterGPA: 4.1,
        cumulativeCGPA: 4.18,
        units: [
          { code: 'NUR 1201', title: 'Medical Nursing & Pathophysiology', gradePoint: 4.0, grade: 'B' },
          { code: 'NUR 1202', title: 'Pharmacology in Nursing Care', gradePoint: 4.5, grade: 'B+' },
          { code: 'NUR 1203', title: 'Community Health Nursing I', gradePoint: 4.0, grade: 'B' },
          { code: 'NUR 1204', title: 'Hospital Clinical Placement I', gradePoint: 5.0, grade: 'A' },
        ],
      },
    ];
  }, []);

  const awardClassification = useMemo(() => {
    return determineAwardClassification(cumulativeCGPA);
  }, [cumulativeCGPA]);

  return (
    <AdminPageWrapper
      eyebrow="Academic Documents & Examination Slips"
      title="Result Slips & Transcripts Generator"
      subtitle="Generate, preview, and print official UNMEB/semester result slips and cumulative academic transcripts."
    >
      {/* Top Configuration Card */}
      <div className="ac-glass-card rounded-2xl border border-[var(--pw-border)] p-5 mb-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--pw-border)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocType('slip')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                docType === 'slip'
                  ? 'bg-[var(--pw-blue,#3d8ef8)] text-white shadow-sm'
                  : 'ac-glass-btn-secondary ac-text-secondary hover:brightness-110'
              }`}
            >
              <FileText className="w-4 h-4" /> Semester Result Slip
            </button>
            <button
              type="button"
              onClick={() => setDocType('transcript')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                docType === 'transcript'
                  ? 'bg-[var(--pw-blue,#3d8ef8)] text-white shadow-sm'
                  : 'ac-glass-btn-secondary ac-text-secondary hover:brightness-110'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Academic Transcript
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Filters and selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-semibold ac-text-secondary block mb-1.5">Programme / Cohort</label>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="ac-input w-full p-2.5 rounded-xl"
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
            <label className="font-semibold ac-text-secondary block mb-1.5">Student / Trainee</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="ac-input w-full p-2.5 rounded-xl font-medium"
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.collegeRegNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold ac-text-secondary block mb-1.5">Academic Session / Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as SemesterStage)}
              className="ac-input w-full p-2.5 rounded-xl"
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
            <label className="font-semibold ac-text-secondary block mb-1.5">Assessment Scale</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'unmeb' | 'internal')}
              className="ac-input w-full p-2.5 rounded-xl"
            >
              <option value="unmeb">UNMEB Standard National Board Scale</option>
              <option value="internal">Institution Internal Semester Exam</option>
            </select>
          </div>
        </div>

        {/* Additional document settings */}
        {docType === 'slip' && (
          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[var(--pw-border)]/50 text-xs">
            <label className="flex items-center gap-2 cursor-pointer ac-text-secondary">
              <input
                type="checkbox"
                checked={showFeesBalance}
                onChange={(e) => setShowFeesBalance(e.target.checked)}
                className="rounded border-[var(--pw-border)]"
              />
              Include Outstanding Tuition Note
            </label>

            <div className="flex items-center gap-2">
              <span className="ac-text-secondary">Next Semester Begins:</span>
              <input
                type="date"
                value={nextSemesterDate}
                onChange={(e) => setNextSemesterDate(e.target.value)}
                className="ac-input px-2.5 py-1 rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Course units and inline marks editor (for Slip mode) */}
      {docType === 'slip' && (
        <div className="ac-glass-card rounded-2xl border border-[var(--pw-border)] p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-sm ac-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--pw-blue,#3d8ef8)]" />
              Course Units & Marks for {STAGE_LABELS[selectedStage]}
            </h3>
            <div className="text-xs font-mono ac-text-secondary flex items-center gap-3">
              <span>Semester GPA: <strong className="ac-text-primary text-sm">{semesterGPA.toFixed(2)}</strong></span>
              <span>Standing: <strong className={academicStanding === 'NORMAL_PROGRESS' ? 'text-emerald-400' : 'text-amber-400'}>{academicStanding}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--pw-s3)] ac-text-secondary border-y border-[var(--pw-border)] uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Unit Code</th>
                  <th className="py-2.5 px-3">Course Unit Title</th>
                  <th className="py-2.5 px-3 text-center">CU</th>
                  <th className="py-2.5 px-3 text-center">CW (30%)</th>
                  <th className="py-2.5 px-3 text-center">Exam (70%)</th>
                  <th className="py-2.5 px-3 text-center">Total (100%)</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                  <th className="py-2.5 px-3 text-center">GP</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pw-border)]/50">
                {units.map((u, idx) => (
                  <tr key={u.code} className="hover:bg-[var(--pw-s2)] transition">
                    <td className="py-2 px-3 font-mono font-bold ac-text-primary">{u.code}</td>
                    <td className="py-2 px-3 font-medium ac-text-primary">{u.title}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{u.creditUnits}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={u.courseworkScore || 0}
                        onChange={(e) => handleScoreChange(idx, Number(e.target.value), u.examScore || 0)}
                        className="ac-input w-16 p-1 text-center font-mono rounded"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={70}
                        value={u.examScore || 0}
                        onChange={(e) => handleScoreChange(idx, u.courseworkScore || 0, Number(e.target.value))}
                        className="ac-input w-16 p-1 text-center font-mono rounded"
                      />
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold ac-text-primary">
                      {u.totalScore}%
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-[var(--pw-blue,#3d8ef8)]">
                      {u.grade}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{u.gradePoint.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
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

      {/* Document Preview Container */}
      <div className="mt-6 mb-12">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--pw-border)]">
          <h3 className="text-sm font-semibold ac-text-secondary uppercase tracking-wider">
            Live Document Print Preview
          </h3>
          <span className="text-xs ac-text-muted">
            {docType === 'slip' ? 'Uganda UNMEB Formal Result Slip' : 'Uganda Tertiary Council Transcript'}
          </span>
        </div>

        {activeStudent && docType === 'slip' && (
          <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl overflow-x-auto shadow-inner">
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
              academicStanding={academicStanding === 'NORMAL_PROGRESS' ? 'NORMAL PROGRESS (NP)' : 'PROBATION (PB)'}
              wardPostings={wardPostings}
              showFeesBalance={showFeesBalance}
              nextSemesterStartDate={nextSemesterDate}
              registrarRemarks={registrarRemarks}
            />
          </div>
        )}

        {activeStudent && docType === 'transcript' && (
          <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl overflow-x-auto shadow-inner">
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
    </AdminPageWrapper>
  );
}
