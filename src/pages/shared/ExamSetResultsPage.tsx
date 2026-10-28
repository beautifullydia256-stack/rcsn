import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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
  Users,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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

  let query = supabase
    .from('exam_results')
    .select('student_id, subject, marks_obtained, total_marks, grade, final_score, activity_score, exam_score')
    .eq('school_id', schoolId)
    .in('student_id', studentIds);

  if (examSetId && examSetId !== '__ALL_SEMESTER_MARKS__') {
    query = query.or(`exam_set_id.eq.${examSetId},exam_set_id.is.null`);
  }

  const { data: examResults, error: resErr } = await query;

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
  (examResults || []).forEach((r: any) => {
    if (!resultMap.has(r.student_id)) resultMap.set(r.student_id, {});
    const sMap = resultMap.get(r.student_id)!;
    const rawVal = r.final_score != null ? r.final_score : r.marks_obtained;
    const marks = rawVal != null ? Number(rawVal) : null;
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
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isALevel = isALevelClass(className);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `OFFICIAL RESULTS BROADSHEET: ${className.toUpperCase()} — ${examSet.name.toUpperCase()} (${periodLabel})`,
    14,
    22,
  );
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, 14, 27);
  doc.setTextColor(0);

  const headRow = [
    'Rank',
    'Candidate Name',
    'Reg / Admin No',
    ...subjects,
    'Agg',
    ...(isALevel ? [] : ['Div']),
  ];

  const bodyRows = rows.map((r) => [
    r.rank != null ? String(r.rank) : '—',
    r.name,
    r.admissionNumber ?? '—',
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
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index >= 3) {
          data.cell.styles.halign = 'center';
        }
      }
    },
  });

  doc.save(`${schoolName}-${className}-${examSet.name}-Broadsheet.pdf`);
}

export default function ExamSetResultsPage() {
  const user = useAuthStore((s) => s.user);
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

  const { data: classOptions = [] } = useQuery({
    queryKey: ['assessment-classes', school?.school_id, school?.type],
    queryFn: async () => {
      if (!school?.school_id) return [];
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
      const realClasses = Array.from(new Set([...fromStreams, ...fromStudents]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (realClasses.length > 0) return realClasses;
      return classesForSchoolType(school.type ?? null);
    },
    enabled: !!school?.school_id,
  });

  const isTertiary = isTertiarySchool(school?.type ?? null);

  const { data: rawExamSets = [] } = useQuery({
    queryKey: ['exam-sets-for-results', school?.school_id ?? ''],
    queryFn: () => fetchExamSetsForClass(school!.school_id),
    enabled: !!school?.school_id,
    staleTime: 5 * 60 * 1000,
  });

  const examSets = useMemo(() => {
    if (rawExamSets && rawExamSets.length > 0) return rawExamSets;
    return [
      {
        id: '__ALL_SEMESTER_MARKS__',
        name: isTertiary ? 'Continuous Assessment & Semester Marks' : 'Terminal Assessment Marks',
        term: 2,
        year: 2026,
        is_active: true,
      } as any,
    ];
  }, [rawExamSets, isTertiary]);

  useEffect(() => {
    if (classOptions.length > 0 && !selectedClass) {
      setSelectedClass(classOptions[0]);
    }
  }, [classOptions, selectedClass]);

  useEffect(() => {
    if (examSets.length > 0 && !selectedExamSetId) {
      setSelectedExamSetId(examSets[0].id);
    }
  }, [examSets, selectedExamSetId]);

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

  useEffect(() => {
    if (selectedClass && selectedExamSetId && school?.school_id) {
      void loadResults();
    }
  }, [selectedClass, selectedExamSetId, school?.school_id]);

  const handleDownload = () => {
    if (!selectedExamSet || !school?.name) return;
    downloadPDF(
      resultRows,
      subjects,
      selectedExamSet,
      selectedClass,
      school.name,
      formatPeriod(selectedExamSet.term, selectedExamSet.year, { includeYearComma: false }),
    );
  };

  const canDownload = resultRows.length > 0;

  const stats = useMemo(() => {
    const totalRanked = resultRows.filter((r) => r.rank !== null).length;
    const totalStudents = resultRows.length;
    const div1Count = resultRows.filter((r) => r.division === 'I').length;
    const bestAgg = resultRows.find((r) => r.rank === 1)?.aggregate ?? '—';
    return { totalRanked, totalStudents, div1Count, bestAgg };
  }, [resultRows]);

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            UHPAB &amp; SEMESTER ASSESSMENT RESULTS REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            CANDIDATE EXAMINATION PERFORMANCE, GRADES &amp; BROADSHEET LEDGER
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadResults}
            disabled={loading}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Reload Results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT BROADSHEET PDF</span>
          </button>
        </div>
      </div>

      {/* Alert */}
      {error && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            RANKED CANDIDATES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.totalRanked} / {stats.totalStudents}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            EVALUATED WITH VALID MARKS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOP AGGREGATE / GPA
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.bestAgg}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            HIGHEST COHORT RANK
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            HONORS / FIRST CLASS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.div1Count}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            DISTINCTION CANDIDATES
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CURRICULUM UNITS TESTED
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {subjects.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            RECORDED PAPERS / MODULES
          </div>
        </div>
      </div>

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#555555] block mb-1">
              Select Cohort / Stream:
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="gov-select text-xs font-mono"
            >
              <option value="">— Select Cohort —</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#555555] block mb-1">
              Assessment Series:
            </span>
            <select
              value={selectedExamSetId}
              onChange={(e) => setSelectedExamSetId(e.target.value)}
              className="gov-select text-xs font-mono"
            >
              <option value="">— Select Series —</option>
              {examSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatPeriod(s.term, s.year, { short: true })})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-[#555555]">
          AUDITED CANDIDATES: <span className="font-bold text-[#111111]">{resultRows.length}</span>
        </div>
      </div>

      {/* ── 4. BROADSHEET DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gov-table w-full text-left">
            <thead>
              <tr>
                <th className="w-12 text-center">RANK</th>
                <th>CANDIDATE NAME</th>
                <th>EXAM / NSIN NUMBER</th>
                {subjects.map((sub) => (
                  <th key={sub} className="text-center font-mono">
                    {sub}
                  </th>
                ))}
                <th className="text-center">AGGREGATE</th>
                <th className="text-center">CLASS / DIV</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <GovTableLoader colSpan={5 + subjects.length} message="COMPUTING ACADEMIC RESULTS BROADSHEET..." />
              ) : resultRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + subjects.length} className="text-center py-12 text-xs font-mono text-[#777777]">
                    NO EXAMINATION RESULTS ENTERED FOR THIS COHORT AND ASSESSMENT SERIES
                  </td>
                </tr>
              ) : (
                resultRows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="text-center font-mono text-xs font-bold text-[#111111]">
                      {r.rank != null ? `#${r.rank}` : '—'}
                    </td>
                    <td className="font-bold text-xs text-[#111111] whitespace-nowrap">
                      {r.name}
                    </td>
                    <td className="font-mono text-xs text-[#555555] whitespace-nowrap">
                      {r.admissionNumber || '—'}
                    </td>
                    {subjects.map((sub) => {
                      const item = r.subjects[sub];
                      return (
                        <td key={sub} className="text-center font-mono text-xs whitespace-nowrap">
                          {item ? (
                            <span>
                              <span className="font-bold text-[#111111]">{item.grade}</span>
                              {item.marks != null && (
                                <span className="text-[10px] text-[#777777] ml-1">({item.marks})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[#CCCCCC]">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center font-mono text-xs font-bold text-[#111111]">
                      {r.aggregate != null ? r.aggregate : '—'}
                    </td>
                    <td className="text-center">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 border border-[#CCCCCC] bg-[#F1F3F5] text-[#111111]">
                        {r.division}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
