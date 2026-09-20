import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { PRIMARY_GRADE_SCALE } from '@/lib/reportUtils';
import { useAcademicPeriod, isTertiarySchool } from '@/lib/academicPeriodTerminology';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

// ─── Grade helpers ────────────────────────────────────────────────────────────

const PRIMARY_POINTS: Record<string, number> = {
  D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, P8: 8, F9: 9,
};

const OLEVEL_POINTS: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 9,
};

const ALEVEL_POINTS: Record<string, number> = {
  A: 6, B: 5, C: 4, D: 3, E: 2, O: 1, F: 0,
};

function isALevelClass(cls: string) {
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test((cls || '').trim());
}

function isOLevelClass(cls: string) {
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test((cls || '').trim());
}

function gradeToPoints(grade: string, className: string): number | null {
  const g = (grade || '').trim().toUpperCase();
  if (!g || g === '—' || g === '-') return null;
  if (isALevelClass(className)) return ALEVEL_POINTS[g] ?? null;
  if (g in PRIMARY_POINTS) return PRIMARY_POINTS[g];
  if (isOLevelClass(className)) return OLEVEL_POINTS[g] ?? null;
  return PRIMARY_POINTS[g] ?? OLEVEL_POINTS[g] ?? null;
}

function markToGrade(
  marks: number,
  total: number,
  scale: { grade_code: string; min_pct: string; max_pct: string }[],
): string {
  const pct = (marks / total) * 100;
  const found = scale.find((s) => pct >= Number(s.min_pct) && pct <= Number(s.max_pct));
  return found?.grade_code ?? 'F9';
}

function computeDivision(aggregate: number, numSubjects: number, className: string): string {
  if (numSubjects === 0) return '—';
  if (isALevelClass(className)) return '—';
  if (isOLevelClass(className)) {
    const norm = (aggregate / numSubjects) * 8;
    if (norm <= 32) return 'I';
    if (norm <= 46) return 'II';
    if (norm <= 58) return 'III';
    if (norm <= 72) return 'IV';
    return 'U';
  }
  const norm = (aggregate / numSubjects) * 4;
  if (norm <= 12) return 'I';
  if (norm <= 24) return 'II';
  if (norm <= 29) return 'III';
  if (norm <= 34) return 'IV';
  return 'U';
}

function classesForSchoolType(type: string | null): string[] {
  if (isTertiarySchool(type)) {
    return [
      'Year 1 Semester 1',
      'Year 1 Semester 2',
      'Year 2 Semester 1',
      'Year 2 Semester 2',
      'Year 3 Semester 1',
      'Year 3 Semester 2',
    ];
  }
  if (type === 'Nursery/Primary') {
    return ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7'];
  }
  if (type === 'Secondary') {
    return ['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6'];
  }
  return [];
}

type ExamSet = { id: string; name: string; term: number; year: number };

type ResultRow = {
  studentId: string;
  name: string;
  admissionNumber: string | null;
  subjects: Record<string, { marks: number | null; total: number | null; grade: string }>;
  aggregate: number | null;
  division: string;
  rank: number | null;
};

async function fetchSchoolInfo(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return null;
  const { data: s } = await supabase
    .from('schools')
    .select('school_id, name, type')
    .eq('school_id', u.school_id)
    .single();
  return s as { school_id: string; name: string; type: string } | null;
}

async function fetchExamSetsForClass(schoolId: string): Promise<ExamSet[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const engine = await resolveCurrentSchoolTerm(supabase, schoolId, todayStr);
  const currentTerm = engine?.year != null && engine.term != null ? { year: engine.year, term: engine.term } : null;

  let q = supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', schoolId)
    .eq('is_active', true);

  if (currentTerm) {
    q = q.eq('year', currentTerm.year).eq('term', currentTerm.term);
  }

  const { data } = await q.order('year', { ascending: false }).order('term', { ascending: true }).order('name');
  return (data || []) as ExamSet[];
}

async function fetchResultsForClassAndExamSet(
  schoolId: string,
  examSetId: string,
  className: string,
): Promise<ResultRow[]> {
  const { data: students, error: studErr } = await supabase
    .from('students')
    .select('student_id, name, first_name, last_name, admission_number')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active')
    .order('name');

  if (studErr) throw studErr;
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => s.student_id);

  const { data: examResults, error: resErr } = await supabase
    .from('exam_results')
    .select('student_id, subject, marks_obtained, total_marks, grade')
    .eq('school_id', schoolId)
    .eq('exam_set_id', examSetId)
    .in('student_id', studentIds);

  if (resErr) throw resErr;

  const { data: customScale } = await supabase
    .from('grading_scales')
    .select('grade_code, min_pct, max_pct')
    .eq('school_id', schoolId)
    .order('min_pct', { ascending: false });

  const activeScale =
    customScale && customScale.length > 0
      ? customScale
      : PRIMARY_GRADE_SCALE.map((s) => ({
          grade_code: s.grade,
          min_pct: String(s.min),
          max_pct: String(s.max),
        }));

  const resultMap = new Map<string, Record<string, { marks: number | null; total: number | null; grade: string }>>();
  (examResults || []).forEach((r) => {
    if (!resultMap.has(r.student_id)) resultMap.set(r.student_id, {});
    const sMap = resultMap.get(r.student_id)!;
    const marks = r.marks_obtained != null ? Number(r.marks_obtained) : null;
    const total = r.total_marks != null ? Number(r.total_marks) : 100;
    const grade = r.grade || (marks != null ? markToGrade(marks, total, activeScale) : '—');
    sMap[r.subject] = { marks, total, grade };
  });

  const rawRows: ResultRow[] = students.map((s) => {
    const sMap = resultMap.get(s.student_id) || {};
    const pointsList: number[] = [];
    Object.values(sMap).forEach(({ grade }) => {
      const pts = gradeToPoints(grade, className);
      if (pts !== null) pointsList.push(pts);
    });

    let aggregate: number | null = null;
    let division = '—';

    if (pointsList.length > 0) {
      if (isALevelClass(className)) {
        aggregate = pointsList.reduce((a, b) => a + b, 0);
        division = '—';
      } else {
        pointsList.sort((a, b) => a - b);
        const bestN = isOLevelClass(className)
          ? pointsList.slice(0, 8)
          : pointsList.slice(0, 4);
        aggregate = bestN.reduce((a, b) => a + b, 0);
        division = computeDivision(aggregate, bestN.length, className);
      }
    }

    const displayName =
      [s.first_name, s.last_name].filter(Boolean).join(' ') || s.name || 'Student';

    return {
      studentId: s.student_id,
      name: displayName,
      admissionNumber: s.admission_number ?? null,
      subjects: sMap,
      aggregate,
      division,
      rank: null,
    };
  });

  const withResults = rawRows.filter((r) => r.aggregate !== null);
  const withoutResults = rawRows.filter((r) => r.aggregate === null);

  if (isALevelClass(className)) {
    withResults.sort((a, b) => (b.aggregate ?? 0) - (a.aggregate ?? 0));
  } else {
    withResults.sort((a, b) => (a.aggregate ?? 999) - (b.aggregate ?? 999));
  }

  let currentRank = 1;
  withResults.forEach((row, i) => {
    if (i > 0) {
      const prev = withResults[i - 1];
      if (row.aggregate !== prev.aggregate) {
        currentRank = i + 1;
      }
    }
    row.rank = currentRank;
  });

  return [...withResults, ...withoutResults];
}

function downloadPDF(
  rows: ResultRow[],
  subjects: string[],
  examSet: ExamSet,
  className: string,
  schoolName: string,
  periodLabel: string,
  assessmentLabel: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isALevel = isALevelClass(className);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${className.toUpperCase()} — ${examSet.name.toUpperCase()} (${periodLabel})`,
    14,
    22,
  );
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 27);
  doc.setTextColor(0);

  const headRow = [
    '#',
    'Student Name',
    ...subjects,
    'Agg',
    ...(isALevel ? [] : ['Div']),
  ];

  const bodyRows = rows.map((r) => [
    r.rank != null ? String(r.rank) : '—',
    r.name,
    ...subjects.map((s) => r.subjects[s]?.grade ?? '—'),
    r.aggregate != null ? String(r.aggregate) : '—',
    ...(isALevel ? [] : [r.division]),
  ]);

  autoTable(doc, {
    startY: 32,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [46, 111, 216], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index >= 2) {
          data.cell.styles.halign = 'center';
        }
      }
    },
  });

  doc.save(`${schoolName} - ${className} - ${examSet.name} - ${periodLabel}.pdf`);
}

export default function ExamSetResultsPage() {
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { labels, formatPeriod } = useAcademicPeriod();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamSetId, setSelectedExamSetId] = useState('');
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: school } = useQuery({
    queryKey: ['school-info', user?.id ?? ''],
    queryFn: () => fetchSchoolInfo(user!.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Dynamic class resolution combining school type, class_streams, and students
  const { data: classOptions = [] } = useQuery({
    queryKey: ['assessment-classes', school?.school_id, school?.type],
    queryFn: async () => {
      if (!school?.school_id) return [];
      const presets = classesForSchoolType(school.type ?? null);
      const [streamsRes, studentsRes] = await Promise.all([
        supabase.from('class_streams').select('class_name').eq('school_id', school.school_id),
        supabase
          .from('students')
          .select('current_class')
          .eq('school_id', school.school_id)
          .eq('status', 'active')
          .not('current_class', 'is', null),
      ]);
      const fromStreams = (streamsRes.data || []).map((r: any) => r.class_name).filter(Boolean);
      const fromStudents = (studentsRes.data || []).map((r: any) => r.current_class).filter(Boolean);
      const combined = Array.from(new Set([...presets, ...fromStreams, ...fromStudents])).filter(Boolean).sort();
      return combined.length > 0 ? combined : presets;
    },
    enabled: !!school?.school_id,
  });

  const { data: examSets = [] } = useQuery({
    queryKey: ['exam-sets-for-results', school?.school_id ?? ''],
    queryFn: () => fetchExamSetsForClass(school!.school_id),
    enabled: !!school?.school_id,
    staleTime: 5 * 60 * 1000,
  });

  // Reset exam set when class changes
  useEffect(() => {
    setSelectedExamSetId('');
    setResultRows([]);
    setSubjects([]);
    setError(null);
  }, [selectedClass]);

  const selectedExamSet = examSets.find((e) => e.id === selectedExamSetId);

  const loadResults = async () => {
    if (!school?.school_id || !selectedClass || !selectedExamSetId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchResultsForClassAndExamSet(school.school_id, selectedExamSetId, selectedClass);
      const subjectSet = new Set<string>();
      rows.forEach((r) => Object.keys(r.subjects).forEach((s) => subjectSet.add(s)));
      setSubjects([...subjectSet].sort());
      setResultRows(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load assessment results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selectedExamSet || !school?.name) return;
    downloadPDF(
      resultRows,
      subjects,
      selectedExamSet,
      selectedClass,
      school.name,
      formatPeriod(selectedExamSet.term, selectedExamSet.year, { includeYearComma: false }),
      labels.periodAssessments === 'Exam Sets' ? 'Exam Set' : 'Assessment',
    );
  };

  const canLoad = !!selectedClass && !!selectedExamSetId;
  const canDownload = canLoad && resultRows.length > 0;

  // Aggregate stats
  const stats = useMemo(() => {
    const totalRanked = resultRows.filter((r) => r.rank !== null).length;
    const totalStudents = resultRows.length;
    const div1Count = resultRows.filter((r) => r.division === 'I').length;
    const bestAgg = resultRows.find((r) => r.rank === 1)?.aggregate ?? '—';
    return { totalRanked, totalStudents, div1Count, bestAgg };
  }, [resultRows]);

  return (
    <AdminPageWrapper
      eyebrow={labels.periodAssessments}
      title={`${labels.periodAssessments} Results &amp; Ranking`}
      subtitle={`Select a class cohort and ${labels.periodAssessments.toLowerCase()} series to generate ranked result ledgers and official print sheets.`}
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
                Ranked Learners
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.totalRanked} / {stats.totalStudents}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Evaluated with valid scores
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
                Top Aggregate / GPA
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.bestAgg}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Leading rank performance
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
                Division 1 / Honors
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.div1Count}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              First-class standing learners
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
                Subjects Graded
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {subjects.length}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Curriculum units tested
            </p>
          </div>
        </div>

        {/* Selection Toolbar */}
        <div
          className="rounded-2xl p-5 shadow-sm space-y-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Class / Cohort Level
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-xs font-medium text-slate-100"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <option value="">Select class cohort…</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {labels.periodAssessments === 'Exam Sets' ? 'Exam Set' : 'Assessment Series'}
              </label>
              <select
                value={selectedExamSetId}
                onChange={(e) => setSelectedExamSetId(e.target.value)}
                disabled={!selectedClass}
                className="w-full rounded-xl border px-3 py-2 text-xs font-medium text-slate-100 disabled:opacity-50"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <option value="">
                  Select {labels.periodAssessments === 'Exam Sets' ? 'exam set' : 'assessment'}…
                </option>
                {examSets.map((es) => (
                  <option key={es.id} value={es.id}>
                    {es.name} — {formatPeriod(es.term, es.year, { includeYearComma: false })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canLoad || loading}
                onClick={loadResults}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition shadow-sm"
              >
                {loading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                {loading ? 'Compiling…' : 'Load Results'}
              </button>

              <button
                type="button"
                disabled={!canDownload}
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Register Table */}
        {resultRows.length > 0 && selectedExamSet ? (
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="border-b p-4 border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                  {selectedClass} · {selectedExamSet.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatPeriod(selectedExamSet.term, selectedExamSet.year, { includeYearComma: false })} ·{' '}
                  <strong className="text-emerald-400">{stats.totalRanked}</strong> ranked learners,{' '}
                  <span className="text-slate-500">{stats.totalStudents - stats.totalRanked} pending marks</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead>
                  <tr
                    className="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                  >
                    <th className="py-3 px-3 text-center w-12"># Rank</th>
                    <th className="py-3 px-4">Learner Name</th>
                    {subjects.map((s) => (
                      <th key={s} className="py-3 px-3 text-center whitespace-nowrap">
                        {s}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center font-bold">Aggregate</th>
                    {!isALevelClass(selectedClass) && (
                      <th className="py-3 px-3 text-center font-bold">Division</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {resultRows.map((row) => (
                    <tr
                      key={row.studentId}
                      className={`transition hover:bg-white/[0.02] ${
                        row.rank === null ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold">
                        {row.rank != null ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs ${
                              row.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                                : row.rank <= 3
                                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {row.name}
                        {row.admissionNumber && (
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            ({row.admissionNumber})
                          </span>
                        )}
                      </td>

                      {subjects.map((s) => {
                        const sub = row.subjects[s];
                        return (
                          <td key={s} className="py-3 px-3 text-center">
                            {sub && sub.grade !== '—' ? (
                              <span className="rounded bg-white/5 px-2 py-0.5 font-semibold text-slate-200">
                                {sub.grade}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-mono font-bold text-teal-300">
                        {row.aggregate ?? '—'}
                      </td>

                      {!isALevelClass(selectedClass) && (
                        <td className="py-3 px-3 text-center">
                          {row.division !== '—' ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                row.division === 'I'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : row.division === 'II'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : row.division === 'III'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}
                            >
                              Div {row.division}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !loading && canLoad ? (
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <PosEmptyState
              icon={<Award className="w-8 h-8 text-teal-400" />}
              title="No Results Recorded"
              description={`No marks found for ${selectedClass} in this ${labels.periodAssessments.toLowerCase()}. Teachers can input marks via the Teacher Portal.`}
              accentColor="mint"
            />
          </div>
        ) : null}
      </div>
    </AdminPageWrapper>
  );
}
