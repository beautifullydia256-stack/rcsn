import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { PRIMARY_GRADE_SCALE } from '@/lib/reportUtils';

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
    // Normalize to 8-subject UCE thresholds
    const norm = (aggregate / numSubjects) * 8;
    if (norm <= 32) return 'I';
    if (norm <= 46) return 'II';
    if (norm <= 58) return 'III';
    if (norm <= 72) return 'IV';
    return 'U';
  }
  // Primary — normalize to 4-subject PLE thresholds
  const norm = (aggregate / numSubjects) * 4;
  if (norm <= 12) return 'I';
  if (norm <= 24) return 'II';
  if (norm <= 29) return 'III';
  if (norm <= 34) return 'IV';
  return 'U';
}

// ─── Class list helpers ───────────────────────────────────────────────────────

function classesForSchoolType(type: string | null): string[] {
  if (type === 'Nursery/Primary') {
    return ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7'];
  }
  if (type === 'Secondary') {
    return ['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6'];
  }
  return [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Data fetching ────────────────────────────────────────────────────────────

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
  const cur = await resolveCurrentSchoolTerm(supabase, schoolId, todayStr);
  let q = supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', schoolId)
    .eq('is_active', true);
  if (cur?.year != null && cur?.term != null) {
    q = q.eq('year', cur.year).eq('term', cur.term);
  }
  const { data } = await q.order('name');
  return (data || []) as ExamSet[];
}

async function fetchGradingScale(schoolId: string) {
  const { data } = await supabase
    .from('grading_scale')
    .select('grade_code, min_pct, max_pct')
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order('min_pct', { ascending: false });
  return (data || []) as { grade_code: string; min_pct: string; max_pct: string }[];
}

async function fetchResultsForClassAndExamSet(
  schoolId: string,
  examSetId: string,
  className: string,
): Promise<ResultRow[]> {
  const [studentsRes, resultsRes] = await Promise.all([
    supabase
      .from('students')
      .select('student_id, name, admission_number')
      .eq('school_id', schoolId)
      .eq('current_class', className)
      .order('name'),
    supabase
      .from('exam_results')
      .select('student_id, subject, marks_obtained, total_marks, grade')
      .eq('school_id', schoolId)
      .eq('exam_set_id', examSetId)
      .eq('class_name', className),
  ]);

  const students = (studentsRes.data || []) as {
    student_id: string;
    name: string;
    admission_number: string | null;
  }[];
  const results = (resultsRes.data || []) as {
    student_id: string;
    subject: string;
    marks_obtained: number | null;
    total_marks: number | null;
    grade: string | null;
  }[];

  // Find all subjects that appear in results
  const subjectSet = new Set<string>();
  results.forEach((r) => subjectSet.add(r.subject));
  const subjects = [...subjectSet].sort();

  // Group results by student
  const byStudent = new Map<string, typeof results>();
  results.forEach((r) => {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id)!.push(r);
  });

  const rows: ResultRow[] = students.map((st) => {
    const stResults = byStudent.get(st.student_id) || [];
    const subjectMap: ResultRow['subjects'] = {};
    let totalPoints = 0;
    let pointCount = 0;

    for (const subj of subjects) {
      const r = stResults.find((x) => x.subject === subj);
      if (!r) {
        subjectMap[subj] = { marks: null, total: null, grade: '—' };
      } else {
        const grade = r.grade || '—';
        subjectMap[subj] = {
          marks: r.marks_obtained,
          total: r.total_marks,
          grade,
        };
        const pts = gradeToPoints(grade, className);
        if (pts !== null) {
          totalPoints += pts;
          pointCount++;
        }
      }
    }

    const hasResults = stResults.length > 0;
    const aggregate = hasResults && pointCount > 0 ? totalPoints : null;
    const division = aggregate !== null ? computeDivision(aggregate, pointCount, className) : '—';

    return {
      studentId: st.student_id,
      name: st.name,
      admissionNumber: st.admission_number,
      subjects: subjectMap,
      aggregate,
      division,
      rank: null,
    };
  });

  // Sort: A-Level (higher aggregate = better, descending); Primary/O-Level (lower = better, ascending)
  const isAL = isALevelClass(className);
  const ranked = rows
    .filter((r) => r.aggregate !== null)
    .sort((a, b) =>
      isAL ? (b.aggregate ?? 0) - (a.aggregate ?? 0) : (a.aggregate ?? 999) - (b.aggregate ?? 999),
    );
  const noResult = rows.filter((r) => r.aggregate === null);

  let pos = 1;
  ranked.forEach((r) => {
    r.rank = pos++;
  });

  return [...ranked, ...noResult];
}

// ─── PDF generation ───────────────────────────────────────────────────────────

function downloadPDF(
  rows: ResultRow[],
  subjects: string[],
  examSet: ExamSet,
  className: string,
  schoolName: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isAL = isALevelClass(className);

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Class: ${className}   |   Exam Set: ${examSet.name}   |   Term ${examSet.term}, ${examSet.year}`,
    doc.internal.pageSize.getWidth() / 2,
    20,
    { align: 'center' },
  );
  doc.text(
    `Printed: ${new Date().toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    doc.internal.pageSize.getWidth() / 2,
    25,
    { align: 'center' },
  );

  // Build table columns: # | Name | [subj Mk | Gr] | Agg | Div
  const head: string[] = ['#', 'Student Name', ...subjects.flatMap((s) => [s, '']), 'Agg', 'Div'];
  const subHead: string[] = ['', '', ...subjects.flatMap(() => ['Mk', 'Gr']), '', ''];

  const body: (string | number)[][] = rows.map((r) => {
    const subjCells = subjects.flatMap((s) => {
      const sub = r.subjects[s];
      if (!sub || sub.grade === '—') return ['—', '—'];
      return [sub.marks != null ? String(sub.marks) : '—', sub.grade];
    });
    return [
      r.rank != null ? String(r.rank) : '—',
      r.name,
      ...subjCells,
      r.aggregate != null ? String(r.aggregate) : '—',
      isAL ? '—' : r.division,
    ];
  });

  autoTable(doc, {
    startY: 29,
    head: [head, subHead],
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
    headStyles: { fillColor: [30, 80, 60], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 40 },
      [2 + subjects.length * 2]: { cellWidth: 10, halign: 'center' },
      [3 + subjects.length * 2]: { cellWidth: 10, halign: 'center' },
    },
    didParseCell(data) {
      // Merge the two header rows for # and Name columns
      if (data.section === 'head' && data.row.index === 0 && (data.column.index === 0 || data.column.index === 1)) {
        data.cell.rowSpan = 2;
      }
      // Color subject Mk columns to distinguish them
      if (data.section === 'body') {
        const col = data.column.index;
        if (col >= 2 && col < 2 + subjects.length * 2 && (col - 2) % 2 === 0) {
          data.cell.styles.textColor = [40, 40, 40];
        }
        // Color grade columns green/amber/red
        if (col >= 2 && col < 2 + subjects.length * 2 && (col - 2) % 2 === 1) {
          const grade = String(data.cell.raw || '');
          if (['D1', 'D2', 'A', 'B'].includes(grade)) data.cell.styles.textColor = [0, 120, 60];
          else if (['F9', 'F'].includes(grade)) data.cell.styles.textColor = [180, 0, 0];
        }
        // Highlight no-result rows
        if (Array.isArray(data.row.raw) && data.row.raw[0] === '—') {
          data.cell.styles.textColor = [150, 150, 150];
        }
      }
    },
  });

  doc.save(`${schoolName} - ${className} - ${examSet.name} - Term${examSet.term} ${examSet.year}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamSetResultsPage() {
  const user = useAuthStore((s) => s.user);

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

  const classOptions = classesForSchoolType(school?.type ?? null);

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
      // Extract subjects from first student with results
      const subjectSet = new Set<string>();
      rows.forEach((r) => Object.keys(r.subjects).forEach((s) => subjectSet.add(s)));
      setSubjects([...subjectSet].sort());
      setResultRows(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selectedExamSet || !school?.name) return;
    downloadPDF(resultRows, subjects, selectedExamSet, selectedClass, school.name);
  };

  const canLoad = !!selectedClass && !!selectedExamSetId;
  const canDownload = canLoad && resultRows.length > 0;

  return (
    <AdminPageWrapper
      eyebrow="Exams"
      title="Exam Set Results"
      subtitle="Select a class and exam set to view and download the ranked student result sheet."
    >
      {/* Selectors */}
      <div className={`${adminCardClass} mb-6 p-4 sm:p-5`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 items-end">
          <div>
            <label className="block ac-text-secondary text-xs mb-1 font-medium">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="ac-input rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select class…</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block ac-text-secondary text-xs mb-1 font-medium">Exam Set</label>
            <select
              value={selectedExamSetId}
              onChange={(e) => setSelectedExamSetId(e.target.value)}
              disabled={!selectedClass}
              className="ac-input rounded-lg px-3 py-2 w-full disabled:opacity-50"
            >
              <option value="">Select exam set…</option>
              {examSets.map((es) => (
                <option key={es.id} value={es.id}>{es.name} — Term {es.term} {es.year}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canLoad || loading}
              onClick={loadResults}
              className="flex-1 rounded-lg bg-[var(--ac-text-primary)] text-[var(--ac-card-bg)] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Loading…' : 'Load Results'}
            </button>
            <button
              type="button"
              disabled={!canDownload}
              onClick={handleDownload}
              className="flex-1 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Preview table */}
      {resultRows.length > 0 && selectedExamSet && (
        <div className={`${adminCardClass} overflow-x-auto`}>
          <div className="px-4 py-2 border-b border-[var(--ac-border)] flex items-center justify-between">
            <span className="ac-text-secondary text-sm">
              {selectedClass} · {selectedExamSet.name} · Term {selectedExamSet.term} {selectedExamSet.year} ·{' '}
              <span className="ac-text-primary font-medium">{resultRows.filter((r) => r.rank !== null).length}</span> ranked,{' '}
              <span className="ac-text-muted">{resultRows.filter((r) => r.rank === null).length}</span> no results
            </span>
          </div>
          <div className="ac-table-wrap">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                  <th className="px-3 py-2 font-medium ac-text-muted w-10 text-center">#</th>
                  <th className="px-3 py-2 font-medium ac-text-muted">Student Name</th>
                  {subjects.map((s) => (
                    <th key={s} className="px-3 py-2 font-medium ac-text-muted text-center whitespace-nowrap">{s}</th>
                  ))}
                  <th className="px-3 py-2 font-medium ac-text-muted text-center">Agg</th>
                  {!isALevelClass(selectedClass) && (
                    <th className="px-3 py-2 font-medium ac-text-muted text-center">Div</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row, i) => (
                  <tr
                    key={row.studentId}
                    className={`border-b border-[var(--ac-border)] ${
                      row.rank === null ? 'opacity-50' : 'hover:bg-[var(--ac-sidebar-active-bg)]'
                    }`}
                  >
                    <td className="px-3 py-2 text-center ac-text-muted">
                      {row.rank ?? '—'}
                    </td>
                    <td className="px-3 py-2 ac-text-primary font-medium">{row.name}</td>
                    {subjects.map((s) => {
                      const sub = row.subjects[s];
                      return (
                        <td key={s} className="px-3 py-2 text-center">
                          {sub && sub.grade !== '—' ? (
                            <span className="ac-text-secondary">{sub.grade}</span>
                          ) : (
                            <span className="ac-text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center ac-text-primary font-medium">
                      {row.aggregate ?? '—'}
                    </td>
                    {!isALevelClass(selectedClass) && (
                      <td className="px-3 py-2 text-center">
                        {row.division !== '—' ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              row.division === 'I'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : row.division === 'II'
                                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                : row.division === 'III'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : 'bg-red-500/20 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {row.division}
                          </span>
                        ) : (
                          <span className="ac-text-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && resultRows.length === 0 && canLoad && (
        <div className={`${adminCardClass} py-12 text-center ac-text-muted`}>
          No results found for {selectedClass} in this exam set. Teachers may not have entered results yet.
        </div>
      )}
    </AdminPageWrapper>
  );
}
