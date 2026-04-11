/**
 * Shared report data builder for Edge Functions.
 * - buildReportDataFromScope: fetch + compute with FULL CLASS scope for ranking; return report_data[] and snapshot rows (no DB writes).
 * - buildReportDataFromSnapshotRows: build report_data[] from already-persisted snapshot rows (for generate-reports-final after lock).
 * Position calculation always uses full class; studentIds filter only which report_data to return.
 */

import { calculatePrimaryGrade, calculateDivision, calculateAggregate } from './reportUtils.ts';

/** Legacy DB placeholder; show MISSED only on reports like the grade column. */
function normalizeAutoMissedRemarks(text: unknown): string {
  const s = text == null ? '' : String(text).trim();
  if (s === 'MISSED - Entry created automatically') return 'MISSED';
  return s;
}

/** Match primary report preview: English → Mathematics → Science, then alphabetical. */
const PRIORITY_PRIMARY_SUBJECT_NAMES = ['English', 'Mathematics', 'Science'] as const;
function sortPrimarySubjectRowsForReport<T extends { subject_name: string }>(rows: T[]): T[] {
  const priorityIndex = (name: string) =>
    PRIORITY_PRIMARY_SUBJECT_NAMES.findIndex((p) => p.toLowerCase() === name.trim().toLowerCase());
  return [...rows].sort((a, b) => {
    const ai = priorityIndex(a.subject_name);
    const bi = priorityIndex(b.subject_name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.subject_name.localeCompare(b.subject_name, undefined, { sensitivity: 'base' });
  });
}

export interface BuildReportPayload {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  classNames?: string[];
  studentIds?: string[];
}

export interface SnapshotRowForPersist {
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  remarks?: string;
  teacher_initials?: string;
  teacher_comment?: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  attendance_percentage?: number;
  position?: number;
  aggregate?: number;
  average_percentage?: number;
  division?: string;
  fees_balance?: number;
  fees_paid?: number;
  fees_expected?: number;
  student_photo_url?: string | null;
  school_logo_url?: string | null;
  exam_set_name?: string;
  exam_set_term?: number;
  exam_set_year?: number;
  frozen_data?: Record<string, unknown>;
  nursery_skill_performance?: Record<string, unknown>;
  /** Senior secondary (exam_results): Activity Score [3], formative, exam, final, descriptor, line keys. */
  activity_score?: number | null;
  formative_score?: number | null;
  exam_score?: number | null;
  final_score?: number | null;
  descriptor?: string | null;
  paper_code?: string | null;
  paper_number?: string | null;
  topic?: string | null;
  /** Progressive report: Mid Term activity [3] / End of Term activity [3]. */
  continuous_c1?: number | null;
  continuous_c2?: number | null;
  /** O-Level teacher-entered remark (same as exam_results.overall_remark). */
  overall_remark?: string | null;
}

export interface BuildReportResult {
  reportDataList: unknown[];
  snapshotRowsForPersist: SnapshotRowForPersist[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function isMidTermName(name: string | null | undefined): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
}

function isEotName(name: string | null | undefined): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n.includes('end') || n.includes('eot') || n.includes('end of term');
}

/** Senior 1–6 class labels (matches app `isOLevelClass` ∪ `isALevelClass`). */
function isSeniorSecondaryClassName(className: string | null | undefined): boolean {
  const c = String(className || '').trim();
  return /^(senior\s*[1-6]|s\.?\s*[1-6])\b/i.test(c);
}

function isALevelClassName(className: string | null | undefined): boolean {
  const c = String(className || '').trim();
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(c);
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Senior O/A-Level: teachers save `final_score` (0–100) via RPC; `marks_obtained` is often NULL.
 * Primary reports use `marks_obtained` everywhere — align seniors so preview/PDF/snapshots match teacher entry.
 */
function seniorMarksTotalForReport(
  className: string,
  marksObtained: unknown,
  finalScore: unknown,
  totalMarks: unknown,
): { marks: number; total: number } {
  const total = Number(totalMarks || 100) || 100;
  if (!isSeniorSecondaryClassName(className)) {
    return { marks: Number(marksObtained || 0), total };
  }
  const fs = numOrUndef(finalScore);
  if (fs != null) return { marks: fs, total };
  return { marks: Number(marksObtained || 0), total };
}

/**
 * One row per subject/topic/paper line: Mid Term activity → continuous_c1, End of Term activity → continuous_c2;
 * scores/grade prefer End of Term row when both exam sets exist.
 */
function mergeSeniorSecondarySnapshotRows(rows: SnapshotRowForPersist[]): SnapshotRowForPersist[] {
  if (rows.length === 0) return rows;
  const isMid = (n: string) => /mid|midterm|mid-term/i.test(String(n || '').trim());
  /** Align with `isEotName` — avoid matching arbitrary "final" in set names. */
  const isEot = (n: string) => isEotName(n);
  const lineKey = (d: SnapshotRowForPersist) =>
    `${d.subject}\0${d.topic ?? ''}\0${d.paper_code ?? ''}\0${d.paper_number ?? ''}`;
  const byKey = new Map<string, SnapshotRowForPersist[]>();
  for (const d of rows) {
    const k = lineKey(d);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(d);
  }
  const merged: SnapshotRowForPersist[] = [];
  for (const group of byKey.values()) {
    if (group.length === 1) {
      const only = group[0];
      if (only.continuous_c1 != null || only.continuous_c2 != null) {
        merged.push({ ...only });
        continue;
      }
      const n = only.exam_set_name ?? '';
      const mid = isMid(n);
      const eot = isEot(n);
      const act = only.activity_score;
      merged.push({
        ...only,
        continuous_c1: mid ? act ?? null : null,
        continuous_c2: eot ? act ?? null : null,
      });
      continue;
    }
    const midRow = group.find((d) => isMid(d.exam_set_name ?? ''));
    const eotRow = group.find((d) => isEot(d.exam_set_name ?? ''));
    const base = eotRow || midRow || group[0];
    const c1 = midRow?.activity_score ?? null;
    const c2 = eotRow?.activity_score ?? null;
    const scoreFromRow = (d: SnapshotRowForPersist | undefined): number | undefined => {
      if (!d) return undefined;
      const fs = numOrUndef(d.final_score);
      if (fs != null) return fs;
      if (d.marks_obtained != null) {
        const m = Number(d.marks_obtained);
        if (!Number.isNaN(m)) return m;
      }
      return undefined;
    };
    const marks = Number(scoreFromRow(eotRow) ?? scoreFromRow(midRow) ?? scoreFromRow(base) ?? 0);
    const total = Number(eotRow?.total_marks ?? midRow?.total_marks ?? base.total_marks ?? 100);
    merged.push({
      ...base,
      marks_obtained: marks,
      total_marks: total,
      grade: String(eotRow?.grade ?? midRow?.grade ?? base.grade ?? ''),
      remarks: eotRow?.remarks ?? base.remarks,
      teacher_initials: eotRow?.teacher_initials ?? base.teacher_initials,
      teacher_comment: eotRow?.teacher_comment ?? base.teacher_comment,
      exam_set_name: eotRow?.exam_set_name ?? midRow?.exam_set_name ?? base.exam_set_name,
      exam_set_term: eotRow?.exam_set_term ?? base.exam_set_term,
      exam_set_year: eotRow?.exam_set_year ?? base.exam_set_year,
      activity_score: eotRow?.activity_score ?? midRow?.activity_score ?? base.activity_score,
      formative_score: eotRow?.formative_score ?? midRow?.formative_score ?? base.formative_score,
      exam_score: eotRow?.exam_score ?? midRow?.exam_score ?? base.exam_score,
      final_score: numOrUndef(eotRow?.final_score) ?? numOrUndef(eotRow?.marks_obtained) ?? base.final_score ?? base.marks_obtained ?? null,
      descriptor: eotRow?.descriptor ?? midRow?.descriptor ?? base.descriptor ?? null,
      overall_remark: eotRow?.overall_remark ?? midRow?.overall_remark ?? base.overall_remark ?? null,
      paper_code: eotRow?.paper_code ?? midRow?.paper_code ?? base.paper_code,
      paper_number: eotRow?.paper_number ?? midRow?.paper_number ?? base.paper_number,
      topic: eotRow?.topic ?? midRow?.topic ?? base.topic,
      continuous_c1: c1,
      continuous_c2: c2,
    });
  }
  return merged;
}

/** After raw exam rows are flattened into snapshot rows, merge Mid/Term activity into C1/C2 for seniors only. */
function mergeSnapshotRowsByStudent(snapshotData: SnapshotRowForPersist[]): SnapshotRowForPersist[] {
  const byStudent = new Map<string, SnapshotRowForPersist[]>();
  for (const row of snapshotData) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id)!.push(row);
  }
  const out: SnapshotRowForPersist[] = [];
  for (const rows of byStudent.values()) {
    const cls = rows[0]?.class_name ?? '';
    if (isSeniorSecondaryClassName(cls)) out.push(...mergeSeniorSecondarySnapshotRows(rows));
    else out.push(...rows);
  }
  return out;
}

/** Snapshot row grade: primary uses D1–F9 unless DB already holds a non A–F scale; senior uses teacher-saved grade only (no recalculation). */
function gradeInfoForSnapshotRow(
  result: { grade?: unknown; marks_obtained?: unknown; total_marks?: unknown; final_score?: unknown },
  className: string,
  remarksNorm: string
): { grade: string; remark: string } {
  if (isSeniorSecondaryClassName(className)) {
    const g = result.grade != null ? String(result.grade).trim() : '';
    return { grade: g, remark: remarksNorm };
  }
  const dbGrade = result.grade != null && String(result.grade).trim();
  const isOldFormat = dbGrade && ['A', 'B', 'C', 'D', 'E', 'F'].includes(String(dbGrade).toUpperCase());
  if (dbGrade && !isOldFormat) return { grade: String(dbGrade), remark: remarksNorm };
  return calculatePrimaryGrade(Number(result.marks_obtained || 0), Number(result.total_marks || 100));
}

/**
 * Fetch all data and compute with FULL CLASS scope. Apply studentIds filter only when building reportDataList.
 * So single-student preview still gets correct class position and totalStudents.
 */
export async function buildReportDataFromScope(
  supabase: SupabaseClient,
  payload: BuildReportPayload
): Promise<BuildReportResult> {
  const { schoolId, term, year, examSetId, classNames = [], studentIds } = payload;

  const { data: examSetsForTerm, error: examSetsError } = await supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', schoolId)
    .eq('term', term)
    .eq('year', year);
  if (examSetsError) throw new Error(examSetsError.message);
  const baseExamSet = (examSetsForTerm || []).find((es: { id: string }) => es.id === examSetId);
  if (!baseExamSet) throw new Error('Exam set not found');

  const examSetIdsToInclude: string[] =
    isMidTermName(baseExamSet.name) && examSetsForTerm?.length
      ? [examSetId]
      : (examSetsForTerm || []).map((es: { id: string }) => es.id).filter(Boolean);
  if (examSetIdsToInclude.length === 0) examSetIdsToInclude.push(examSetId);

  const hasMultipleSets = examSetIdsToInclude.length > 1;
  const eotExamSetId: string | null = hasMultipleSets
    ? (examSetsForTerm || []).find((es: { id: string; name?: string }) => isEotName(es.name))?.id ?? null
    : null;

  let examResultsQuery = supabase
    .from('exam_results')
    .select(
      `*,
      students!inner(student_id, name, current_class, admission_number, expected_fee_amount),
      exam_sets!inner(id, name, term, year)`
    )
    .eq('school_id', schoolId)
    .in('exam_set_id', examSetIdsToInclude);
  if (classNames.length > 0) {
    examResultsQuery = examResultsQuery.in('class_name', classNames);
  }
  const { data: examResults, error: resultsError } = await examResultsQuery;
  if (resultsError) throw new Error(resultsError.message);

  const allStudentIdsInClass = [...new Set((examResults || []).map((r: { student_id: string }) => r.student_id))];
  const classNamesFromResults = [...new Set((examResults || []).map((r: { class_name: string }) => r.class_name))];

  let commentSettingsQuery = supabase
    .from('class_teacher_comments_settings')
    .select('*')
    .eq('school_id', schoolId);
  if (classNamesFromResults.length > 0) {
    commentSettingsQuery = commentSettingsQuery.in('class_name', classNamesFromResults);
  }
  const [
    { data: processedRows },
    { data: students },
    { data: attendanceData },
    { data: studentPayments },
    { data: studentPhotos },
    { data: schoolInfo },
    { data: commentSettings },
    { data: reportCommentsRows },
  ] = await Promise.all([
    supabase
      .from('processed_primary_exam_results')
      .select('student_id, exam_set_id, aggregate, division, class_position')
      .eq('school_id', schoolId)
      .in('exam_set_id', examSetIdsToInclude)
      .in('student_id', allStudentIdsInClass),
    supabase.from('students').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_attendance').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_payments').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_photos').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('schools').select('*').eq('school_id', schoolId).single(),
    commentSettingsQuery,
    supabase
      .from('report_comments')
      .select('student_id, comment_type, comment_text')
      .eq('school_id', schoolId)
      .eq('term', term)
      .eq('year', year)
      .in('student_id', allStudentIdsInClass),
  ]);

  const processedByStudent: Record<string, { aggregate?: number; division?: string; class_position?: number }> = {};
  (processedRows || []).forEach((row: { student_id: string; exam_set_id?: string; aggregate?: number; division?: string; class_position?: number }) => {
    if (!row.student_id) return;
    if (hasMultipleSets && eotExamSetId) {
      if (row.exam_set_id !== eotExamSetId) return;
      processedByStudent[row.student_id] = {
        aggregate: row.aggregate != null ? Number(row.aggregate) : undefined,
        division: row.division && String(row.division).trim() ? row.division : undefined,
        class_position: row.class_position != null ? Number(row.class_position) : undefined,
      };
      return;
    }
    if (!processedByStudent[row.student_id]) {
      processedByStudent[row.student_id] = {
        aggregate: row.aggregate != null ? Number(row.aggregate) : undefined,
        division: row.division && String(row.division).trim() ? row.division : undefined,
        class_position: row.class_position != null ? Number(row.class_position) : undefined,
      };
    }
  });

  let studentComments: { student_id: string; class_teacher_text?: string; headteacher_text?: string }[] = [];
  if (reportCommentsRows?.length) {
    const byStudent = new Map<string, { class_teacher_text?: string; headteacher_text?: string }>();
    for (const row of reportCommentsRows) {
      const r = row as { student_id: string; comment_type?: string; comment_text?: string };
      const t = String(r.comment_type || '').toLowerCase().replace(/\s+/g, '_');
      const text = String(r.comment_text || '');
      if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, {});
      const entry = byStudent.get(r.student_id)!;
      if (t === 'class_teacher' || t === 'class_teacher_comment') entry.class_teacher_text = text;
      else if (t === 'headteacher' || t === 'head_teacher' || t === 'headteacher_comment') entry.headteacher_text = text;
    }
    studentComments = Array.from(byStudent.entries()).map(([student_id, v]) => ({ student_id, ...v }));
  }

  const paidByStudent: Record<string, number> = {};
  (studentPayments || []).forEach((p: { student_id: string; amount_paid?: number }) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
  });

  const studentResultsByClass: Record<string, Record<string, unknown[]>> = {};
  (examResults || []).forEach((result: { class_name?: string; students?: { current_class?: string }; student_id: string }) => {
    const className = result.class_name || result.students?.current_class;
    const studentId = result.student_id;
    if (!studentResultsByClass[className as string]) studentResultsByClass[className as string] = {};
    if (!studentResultsByClass[className as string][studentId]) studentResultsByClass[className as string][studentId] = [];
    studentResultsByClass[className as string][studentId].push(result);
  });

  const studentPositions: Record<string, number> = {};
  const studentAverages: Record<string, number> = {};
  const studentAggregates: Record<string, number> = {};

  Object.entries(studentResultsByClass).forEach(([, classStudents]) => {
    const studentAveragesList: { studentId: string; average: number; aggregate: number }[] = [];
    Object.entries(classStudents).forEach(([studentId, results]) => {
      const fromDb = processedByStudent[studentId];
      let resultsForCalculation = results as {
        marks_obtained?: number;
        total_marks?: number;
        final_score?: unknown;
        class_name?: string;
        students?: { current_class?: string };
        exam_sets?: { id?: string };
        exam_set_id?: string;
      }[];
      if (hasMultipleSets && eotExamSetId) {
        resultsForCalculation = resultsForCalculation.filter(
          (r) => (r.exam_set_id ?? r.exam_sets?.id) === eotExamSetId
        );
      }
      const classNameForSenior = String(
        resultsForCalculation[0]?.class_name || resultsForCalculation[0]?.students?.current_class || '',
      );
      const seniorClass = isSeniorSecondaryClassName(classNameForSenior);
      const validResults = resultsForCalculation.filter((r) => {
        if (seniorClass) {
          const fs = numOrUndef(r.final_score);
          if (fs != null) return true;
          return r.marks_obtained != null && r.total_marks != null;
        }
        return r.marks_obtained != null && r.total_marks != null;
      });
      if (validResults.length === 0) {
        studentAverages[studentId] = 0;
        studentAggregates[studentId] = fromDb?.aggregate ?? 0;
        if (fromDb?.class_position != null) studentPositions[studentId] = fromDb.class_position;
        return;
      }
      const totalMarks = validResults.reduce((s, r) => {
        if (seniorClass) {
          const { marks } = seniorMarksTotalForReport(
            classNameForSenior,
            r.marks_obtained,
            r.final_score,
            r.total_marks,
          );
          return s + marks;
        }
        return s + Number(r.marks_obtained || 0);
      }, 0);
      const totalPossible = validResults.reduce((s, r) => s + Number(r.total_marks || 100), 0);
      const average = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      studentAverages[studentId] = average;
      studentAggregates[studentId] =
        fromDb?.aggregate ??
        calculateAggregate(
          validResults.map((r) => {
            if (seniorClass) {
              const { marks, total } = seniorMarksTotalForReport(
                classNameForSenior,
                r.marks_obtained,
                r.final_score,
                r.total_marks,
              );
              return { marks_obtained: marks, total_marks: total };
            }
            return { marks_obtained: Number(r.marks_obtained || 0), total_marks: Number(r.total_marks || 100) };
          }),
        );
      if (fromDb?.class_position != null) studentPositions[studentId] = fromDb.class_position;
      studentAveragesList.push({ studentId, average, aggregate: studentAggregates[studentId] });
    });
    studentAveragesList.sort((a, b) => b.average - a.average);
    studentAveragesList.forEach((item, index) => {
      if (studentPositions[item.studentId] == null) studentPositions[item.studentId] = index + 1;
    });
  });

  const attendanceByStudent: Record<string, { presentDays: number; totalDays: number; percentage: number }> = {};
  (attendanceData || []).forEach((att: { student_id: string; present?: boolean }) => {
    if (!attendanceByStudent[att.student_id]) {
      attendanceByStudent[att.student_id] = { presentDays: 0, totalDays: 0, percentage: 0 };
    }
    if (att.present) attendanceByStudent[att.student_id].presentDays++;
    attendanceByStudent[att.student_id].totalDays++;
  });
  Object.keys(attendanceByStudent).forEach((sid) => {
    const a = attendanceByStudent[sid];
    a.percentage = a.totalDays > 0 ? Math.round((a.presentDays / a.totalDays) * 100) : 0;
  });

  const resolvedComments: Record<string, { classTeacher: string; headTeacher: string }> = {};
  (students || []).forEach((student: { student_id: string; current_class?: string }) => {
    const average = studentAverages[student.student_id] || 0;
    const bounded = Math.max(0, Math.min(100, average));
    const classSetting = (commentSettings || []).find(
      (s: { class_name?: string; min_percent?: number; max_percent?: number; comment_text?: string }) =>
        s.class_name === student.current_class && bounded >= Number(s.min_percent || 0) && bounded <= Number(s.max_percent || 100)
    );
    const studentComment = studentComments.find((c) => c.student_id === student.student_id);
    resolvedComments[student.student_id] = {
      classTeacher: classSetting?.comment_text || studentComment?.class_teacher_text || '',
      headTeacher: classSetting?.comment_text || studentComment?.headteacher_text || '',
    };
  });

  const snapshotData: SnapshotRowForPersist[] = [];
  (examResults || []).forEach((result: Record<string, unknown> & { student_id: string; class_name?: string; subject?: string; marks_obtained?: number; total_marks?: number; grade?: string; remarks?: string; teacher_initials?: string; teacher_comment?: string; students?: { current_class?: string; name?: string; admission_number?: string; expected_fee_amount?: number }; exam_sets?: { name?: string; term?: number; year?: number } }) => {
    const student = (students || []).find((s: { student_id: string }) => s.student_id === result.student_id) as { expected_fee_amount?: number; stream?: string; current_stream?: string; stream_name?: string } | undefined;
    const attendance = attendanceByStudent[result.student_id];
    const studentPhoto = (studentPhotos || []).find((p: { student_id: string }) => p.student_id === result.student_id) as { photo_url?: string } | undefined;
    const expectedFee = Number(student?.expected_fee_amount || 0);
    const totalPaid = paidByStudent[result.student_id] || 0;
    const feesBalance = Math.max(0, expectedFee - totalPaid);
    const className = (result.class_name || (result.students as { current_class?: string })?.current_class) as string;
    const raw = result as Record<string, unknown>;
    const isSeniorRow = isSeniorSecondaryClassName(className);
    const overallRaw =
      raw.overall_remark != null && String(raw.overall_remark).trim() !== ''
        ? String(raw.overall_remark).trim()
        : '';
    const remarksNorm = isSeniorRow
      ? normalizeAutoMissedRemarks(overallRaw || String(result.remarks ?? '').trim())
      : normalizeAutoMissedRemarks(result.remarks);
    const final_score_raw = raw.final_score != null && raw.final_score !== '' ? numOrUndef(raw.final_score) ?? null : null;
    const gradeInfo = gradeInfoForSnapshotRow(
      { ...result, final_score: final_score_raw ?? raw.final_score },
      className,
      remarksNorm,
    );
    const activity_score = raw.activity_score != null && raw.activity_score !== '' ? numOrUndef(raw.activity_score) ?? null : null;
    const formative_score = raw.formative_score != null && raw.formative_score !== '' ? numOrUndef(raw.formative_score) ?? null : null;
    const exam_score = raw.exam_score != null && raw.exam_score !== '' ? numOrUndef(raw.exam_score) ?? null : null;
    const descriptor = raw.descriptor != null && String(raw.descriptor).trim() ? String(raw.descriptor) : null;
    const paper_code = raw.paper_code != null && String(raw.paper_code).trim() ? String(raw.paper_code) : null;
    const paper_number = raw.paper_number != null && String(raw.paper_number).trim() ? String(raw.paper_number) : null;
    const topic = raw.topic != null && String(raw.topic).trim() ? String(raw.topic) : null;
    const average = studentAverages[result.student_id] || 0;
    const fromDb = processedByStudent[result.student_id];
    const division = fromDb?.division ?? calculateDivision(average);
    const presentDays = attendance?.presentDays ?? 0;
    const totalDays = attendance?.totalDays ?? 0;
    const absentDays = totalDays - presentDays;
    const { marks: marksForSnapshot, total: totalMarksForSnapshot } = seniorMarksTotalForReport(
      className,
      result.marks_obtained,
      final_score_raw ?? raw.final_score,
      result.total_marks,
    );
    snapshotData.push({
      student_id: result.student_id,
      class_name: className || '',
      subject: String(result.subject || ''),
      marks_obtained: marksForSnapshot,
      total_marks: totalMarksForSnapshot,
      grade: isSeniorRow ? String(raw.grade ?? '').trim() : gradeInfo.grade,
      remarks: result.remarks != null ? remarksNorm : undefined,
      overall_remark: overallRaw || undefined,
      teacher_initials: result.teacher_initials as string | undefined,
      teacher_comment: isSeniorRow
        ? overallRaw || undefined
        : (result.teacher_comment && String(result.teacher_comment).trim())
            ? String(result.teacher_comment)
            : String(remarksNorm || gradeInfo.remark || ''),
      class_teacher_comment: resolvedComments[result.student_id]?.classTeacher || '',
      headteacher_comment: resolvedComments[result.student_id]?.headTeacher || '',
      attendance_percentage: attendance?.percentage,
      position: processedByStudent[result.student_id]?.class_position ?? studentPositions[result.student_id],
      aggregate: processedByStudent[result.student_id]?.aggregate ?? studentAggregates[result.student_id],
      average_percentage: average,
      division,
      fees_balance: feesBalance,
      fees_paid: totalPaid,
      fees_expected: expectedFee,
      student_photo_url: studentPhoto?.photo_url || null,
      school_logo_url: (schoolInfo as { logo_url?: string })?.logo_url || null,
      exam_set_name: (result.exam_sets as { name?: string })?.name || baseExamSet?.name || '',
      exam_set_term: (result.exam_sets as { term?: number })?.term ?? baseExamSet?.term ?? term,
      exam_set_year: (result.exam_sets as { year?: number })?.year ?? baseExamSet?.year ?? year,
      activity_score,
      formative_score,
      exam_score,
      final_score: final_score_raw,
      descriptor,
      paper_code,
      paper_number,
      topic,
      frozen_data: {
        student_name: (result.students as { name?: string })?.name || '',
        admission_number: (result.students as { admission_number?: string })?.admission_number || '',
        school_name: (schoolInfo as { name?: string })?.name || '',
        school_address: (schoolInfo as { address?: string; location?: string })?.address || (schoolInfo as { location?: string })?.location || '',
        school_phone: (schoolInfo as { phone?: string; contact_phone?: string })?.phone || (schoolInfo as { contact_phone?: string })?.contact_phone || '',
        school_email: (schoolInfo as { email?: string; contact_email?: string })?.email || (schoolInfo as { contact_email?: string })?.contact_email || '',
        school_motto: (schoolInfo as { motto?: string })?.motto || '',
        total_students_in_class: Object.keys(studentResultsByClass[className] || {}).length,
        attendance_present_days: presentDays,
        attendance_absent_days: absentDays,
        attendance_total_days: totalDays,
        next_term_begins_date: (schoolInfo as { next_term_begins_date?: string })?.next_term_begins_date ?? null,
        student_stream: (student as { stream?: string })?.stream ?? (student as { current_stream?: string })?.current_stream ?? (student as { stream_name?: string })?.stream_name ?? '',
        school_subtitle: (schoolInfo as { subtitle?: string })?.subtitle ?? '',
        school_pobox: (schoolInfo as { pobox?: string })?.pobox ?? '',
        report_date: new Date().toISOString().slice(0, 10),
      },
      nursery_skill_performance: (() => {
        const raw = (result as { nursery_skill_performance?: unknown }).nursery_skill_performance;
        if (raw == null) return undefined;
        return typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      })(),
    });
  });

  const reportDataList = buildReportDataListFromSnapshotRows(
    snapshotData,
    schoolInfo as Record<string, unknown>,
    baseExamSet as { id: string; name?: string; term?: number; year?: number },
    examSetId
  );

  const toReturn = studentIds?.length
    ? reportDataList.filter((r: unknown) => {
        const item = r as { students?: { student_id?: string }[] };
        return item?.students?.[0] && studentIds.includes(item.students[0].student_id as string);
      })
    : reportDataList;

  /** Raw exam-set rows persisted to snapshot; merge for C1/C2 happens in `buildReportDataListFromSnapshotRows`. */
  return { reportDataList: toReturn, snapshotRowsForPersist: snapshotData };
}

/**
 * Build report_data[] from already-persisted snapshot rows (e.g. after lock in generate-reports-final).
 */
export function buildReportDataFromSnapshotRows(
  allSnapshotData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  examSet: { id: string; name?: string; term?: number; year?: number },
  snapshotId: string
): unknown[] {
  return buildReportDataListFromSnapshotRows(
    allSnapshotData,
    school,
    examSet,
    snapshotId
  );
}

function buildReportDataListFromSnapshotRows(
  snapshotData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  baseExamSet: { id: string; name?: string; term?: number; year?: number },
  examSetId: string
): unknown[] {
  const mergedSnapshot = mergeSnapshotRowsByStudent(snapshotData);
  const uniqueStudentIds = [...new Set(mergedSnapshot.map((d) => d.student_id))];
  const list: unknown[] = [];
  const examSetName = baseExamSet?.name || '';

  for (const studentId of uniqueStudentIds) {
    const studentData = mergedSnapshot.filter((d) => d.student_id === studentId);
    if (studentData.length === 0) continue;
    const reportData = oneReportFromSnapshotRows(studentData, school, baseExamSet, examSetId, examSetName);
    list.push(reportData);
  }
  return list;
}

function oneReportFromSnapshotRows(
  studentData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  examSet: { id: string; name?: string; term?: number; year?: number },
  _snapshotOrExamSetId: string,
  examSetName: string
): unknown {
  const firstRecord = studentData[0];
  const frozenData = firstRecord.frozen_data || {};
  const isSeniorClass = isSeniorSecondaryClassName(firstRecord.class_name);
  const effectiveRemark = (d: SnapshotRowForPersist) => {
    if (isSeniorClass) {
      const o = d.overall_remark != null && String(d.overall_remark).trim() !== '' ? String(d.overall_remark).trim() : '';
      if (o !== '') return normalizeAutoMissedRemarks(o);
    }
    return normalizeAutoMissedRemarks(
      (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || ''),
    );
  };
  const results = studentData.map((d) => {
    const remark = effectiveRemark(d);
    const finalScore = isSeniorClass
      ? (numOrUndef(d.final_score) ?? null)
      : (numOrUndef(d.final_score) ?? d.marks_obtained);
    const overallOut = isSeniorClass
      ? (d.overall_remark != null ? String(d.overall_remark) : '')
      : remark;
    const remarkOut = isSeniorClass ? overallOut : remark;
    return {
      subject: d.subject,
      topic: d.topic ?? '',
      marks_obtained: d.marks_obtained,
      total_marks: d.total_marks,
      grade: d.grade,
      remarks: d.remarks,
      teacher_initials: d.teacher_initials,
      teacher_comment: remarkOut,
      exam_set_name: d.exam_set_name ?? examSetName,
      teacher_remark: remarkOut,
      overall_remark: overallOut,
      remark: remarkOut,
      final_score: finalScore,
      nursery_skill_performance: d.nursery_skill_performance,
      activity_score: d.activity_score,
      formative_score: d.formative_score,
      exam_score: d.exam_score,
      descriptor: d.descriptor,
      paper_code: d.paper_code,
      paper_number: d.paper_number,
      continuous_c1: d.continuous_c1,
      continuous_c2: d.continuous_c2,
      c1: d.continuous_c1,
      c2: d.continuous_c2,
    };
  });

  const isBot = (n: string) => /beginning|bot/i.test(String(n || '').trim());
  const isMid = (n: string) => /mid|midterm|mid-term/i.test(String(n || '').trim());
  const isEot = (n: string) => isEotName(n);
  const eotRows = studentData.filter((d) => isEot(d.exam_set_name ?? ''));
  const summaryRows = eotRows.length > 0 ? eotRows : studentData;
  const firstSummaryRecord = eotRows.length > 0 ? eotRows[0] : firstRecord;
  const toPrimaryGrade = (g: string, m: unknown, t: number): string => {
    const grade = (g ?? '').toString().trim();
    if (grade && !['A', 'B', 'C', 'D', 'E', 'F'].includes(grade.toUpperCase())) return grade;
    const total = t > 0 ? t : 100;
    const marksNum = Number(m);
    if (m !== '' && m != null && !Number.isNaN(marksNum)) return calculatePrimaryGrade(marksNum, total).grade;
    return grade || '';
  };
  let subjects: {
    subject_name: string;
    eot_marks: number | '';
    mot_marks: number | '';
    bot_marks: number | '';
    eot_grade: string;
    mot_grade: string;
    bot_grade: string;
    total_marks: number;
    teacher_comment: string;
    teacher_name: string;
  }[] = [];
  if (!isSeniorClass) {
    const subjectMap = new Map<
      string,
      {
        subject_name: string;
        eot_marks: number | '';
        mot_marks: number | '';
        bot_marks: number | '';
        eot_grade: string;
        mot_grade: string;
        bot_grade: string;
        total_marks: number;
        teacher_comment: string;
        teacher_name: string;
      }
    >();
    for (const d of studentData) {
      const sub = d.subject ?? '';
      if (!sub) continue;
      const existing = subjectMap.get(sub);
      const marks = d.marks_obtained ?? '';
      const total = Number(d.total_marks ?? 100);
      const grade = toPrimaryGrade(d.grade ?? '', marks, total);
      const teacherComment = (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
      const teacherName = d.teacher_initials ?? '';
      const examName = d.exam_set_name ?? examSetName;
      if (!existing) {
        subjectMap.set(sub, {
          subject_name: sub,
          eot_marks: isEot(examName) ? marks : '',
          mot_marks: isMid(examName) ? marks : '',
          bot_marks: isBot(examName) ? marks : '',
          eot_grade: isEot(examName) ? grade : '',
          mot_grade: isMid(examName) ? grade : '',
          bot_grade: isBot(examName) ? grade : '',
          total_marks: total,
          teacher_comment: teacherComment,
          teacher_name: teacherName,
        });
      } else {
        if (isEot(examName)) {
          existing.eot_marks = marks;
          existing.eot_grade = grade;
        } else if (isMid(examName)) {
          existing.mot_marks = marks;
          existing.mot_grade = grade;
        } else if (isBot(examName)) {
          existing.bot_marks = marks;
          existing.bot_grade = grade;
        }
        if (teacherComment) existing.teacher_comment = teacherComment;
        if (teacherName) existing.teacher_name = teacherName;
      }
    }
    subjects = sortPrimarySubjectRowsForReport(
      Array.from(subjectMap.values()).map((s) => {
        if (s.eot_marks === '' && s.mot_marks === '' && s.bot_marks === '') {
          const first = studentData.find((d) => (d.subject ?? '') === s.subject_name);
          if (first) {
            const m = first.marks_obtained ?? '';
            const t = Number(first.total_marks ?? 100) || 100;
            const g = toPrimaryGrade(first.grade ?? '', m, t);
            s.eot_marks = m;
            s.eot_grade = g;
            s.mot_marks = m;
            s.mot_grade = g;
          }
        }
        return s;
      }),
    );
  }

  let alevel: { paperRows?: Array<Record<string, unknown>> } | undefined;
  if (isALevelClassName(firstRecord.class_name)) {
    const paperRows = studentData
      .filter((d) => String(d.subject || '').trim())
      .map((d) => {
        const remark = effectiveRemark(d);
        const tm = Number(d.total_marks ?? 100) || 100;
        const mo = Number(d.marks_obtained ?? 0);
        return {
          subjectLabel: String(d.subject ?? ''),
          paperCode: String(d.paper_code ?? d.paper_number ?? '—'),
          marksPercent: tm > 0 ? (mo / tm) * 100 : null,
          gradeDisplay: String(d.grade ?? '—'),
          comment: remark,
          teacherDisplayName: d.teacher_initials ?? null,
        };
      });
    if (paperRows.length) alevel = { paperRows };
  }

  const frozen = frozenData as {
    school_name?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    school_motto?: string;
    school_subtitle?: string;
    school_pobox?: string;
    student_name?: string;
    admission_number?: string;
    total_students_in_class?: number;
    attendance_present_days?: number;
    attendance_absent_days?: number;
    attendance_total_days?: number;
    next_term_begins_date?: string | null;
    student_stream?: string;
    report_date?: string;
  };
  const attendanceDetails =
    frozen.attendance_total_days != null
      ? {
          presentDays: frozen.attendance_present_days ?? 0,
          absentDays: frozen.attendance_absent_days ?? 0,
          totalSchoolDays: frozen.attendance_total_days ?? 0,
        }
      : undefined;
  const reportDate = frozen.report_date || undefined;
  const phoneOut =
    frozen.school_phone || (school?.phone as string) || (school?.contact_phone as string) || '';
  const emailOut =
    frozen.school_email || (school?.email as string) || (school?.contact_email as string) || '';
  const baseReport: Record<string, unknown> = {
    school: {
      ...school,
      name: frozen.school_name || (school?.name as string) || '',
      address: frozen.school_address || (school?.address as string) || '',
      phone: phoneOut,
      email: emailOut,
      contact_phone: phoneOut || (school?.contact_phone as string) || '',
      contact_email: emailOut || (school?.contact_email as string) || '',
      motto: frozen.school_motto || (school?.motto as string) || '',
      subtitle: frozen.school_subtitle || (school?.subtitle as string) || '',
      pobox: frozen.school_pobox || (school?.pobox as string) || '',
      logo_url: firstRecord.school_logo_url ?? (school?.logo_url as string) ?? null,
    },
    examSet: {
      id: examSet.id,
      name: examSet?.name || '',
      term: examSet?.term ?? 0,
      year: examSet?.year ?? 0,
      ...(reportDate && { date: reportDate }),
    },
    students: [
      {
        student_id: firstRecord.student_id,
        name: frozen.student_name || '',
        current_class: firstRecord.class_name,
        admission_number: frozen.admission_number || '',
        profile_photo: firstRecord.student_photo_url ?? null,
        stream: frozen.student_stream || undefined,
        current_stream: frozen.student_stream || undefined,
        stream_name: frozen.student_stream || undefined,
        next_term_begins_date: frozen.next_term_begins_date || undefined,
        results,
        subjects,
        attendance: [],
        fees: {
          expected: firstRecord.fees_expected ?? 0,
          paid: firstRecord.fees_paid ?? 0,
          balance: firstRecord.fees_balance ?? 0,
        },
        comments: {
          class_teacher_text: firstRecord.class_teacher_comment || '',
          headteacher_text: firstRecord.headteacher_comment || '',
          head_teacher_text: firstRecord.headteacher_comment || '',
        },
        summary: {
          totalMarks: summaryRows.reduce(
            (s, d) => s + (numOrUndef(d.final_score) ?? Number(d.marks_obtained || 0)),
            0,
          ),
          totalPossibleMarks: summaryRows.reduce((s, d) => s + (d.total_marks || 100), 0),
          average: (() => {
            const v = firstSummaryRecord.average_percentage;
            if (v === null || v === undefined || v === '') return null;
            const n = Number(v);
            return Number.isNaN(n) ? null : Math.round(n);
          })(),
          aggregate: firstSummaryRecord.aggregate ?? null,
          division: firstSummaryRecord.division ?? null,
          attendancePercentage: firstSummaryRecord.attendance_percentage ?? null,
          classPosition: firstSummaryRecord.position ?? null,
          totalStudents: frozen.total_students_in_class ?? null,
          performanceRemark: firstSummaryRecord.division || 'N/A',
          ...(reportDate && { reportDate }),
          ...(attendanceDetails && { attendanceDetails }),
        },
      },
    ],
  };
  if (alevel) baseReport.alevel = alevel;
  return baseReport;
}
