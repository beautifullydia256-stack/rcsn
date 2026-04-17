/**
 * After `generate-report-preview`, align `students[0].results` with
 * `olevel_student_expected_subjects` (same source as SQL checks).
 * Ensures the admin UI shows missing-result rows even when a stale Edge bundle
 * only returns `exam_results` lines.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isOLevelClass } from '../components/reports/templates/helpers';
import {
  OLEVEL_MISSING_RESULTS_DESCRIPTOR,
  OLEVEL_MISSING_RESULTS_REMARK,
} from './secondaryOlevelReportCopy';
import { computeOlevelMeanPercentOverExpectedFromResultRows } from './olevelReportAverage';
import { calculateDivision } from './reportUtils';
import {
  fetchReportSignatureTeacherNames,
  resolveSecondaryCommentsForPreviewAverage,
} from './secondaryPreviewCommentsFromDb';

function normalizeReportSubjectKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function dedupeSubjectNamesPreserveOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = normalizeReportSubjectKey(n);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(n).trim());
  }
  return out;
}

type ResultRow = Record<string, unknown>;

function mergeOlevelResultsWithExpected(
  results: ResultRow[],
  expectedOrdered: string[],
  examSetName: string,
): ResultRow[] {
  if (!expectedOrdered.length) return results;
  const byKey = new Map<string, ResultRow[]>();
  for (const r of results) {
    const k = normalizeReportSubjectKey(String(r.subject ?? ''));
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }
  const used = new Set<string>();
  const out: ResultRow[] = [];
  const msg = OLEVEL_MISSING_RESULTS_REMARK;
  const desc = OLEVEL_MISSING_RESULTS_DESCRIPTOR;
  const placeholder = (subject: string): ResultRow => ({
    subject,
    topic: '',
    marks_obtained: '',
    total_marks: 100,
    grade: '',
    remarks: msg,
    teacher_initials: '',
    teacher_comment: msg,
    exam_set_name: examSetName,
    teacher_remark: msg,
    overall_remark: msg,
    remark: msg,
    final_score: null,
    activity_score: null,
    formative_score: null,
    exam_score: null,
    descriptor: desc,
    paper_code: '',
    paper_number: '',
    continuous_c1: undefined,
    continuous_c2: undefined,
    c1: undefined,
    c2: undefined,
    result_missing_placeholder: true,
  });
  for (const subj of expectedOrdered) {
    const k = normalizeReportSubjectKey(subj);
    if (!k) continue;
    used.add(k);
    const rows = byKey.get(k);
    if (rows?.length) out.push(...rows);
    else out.push(placeholder(subj));
  }
  for (const [k, rows] of byKey) {
    if (used.has(k)) continue;
    out.push(...rows);
  }
  return out;
}

function unwrapReportData(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  if ('report_data' in o && o.report_data && typeof o.report_data === 'object') {
    return o.report_data as Record<string, unknown>;
  }
  return o;
}

function wrapIfNeeded(original: unknown, inner: Record<string, unknown>): unknown {
  if (original && typeof original === 'object' && 'report_data' in (original as object)) {
    return { ...(original as object), report_data: inner };
  }
  return inner;
}

export async function enrichSecondaryOlevelPreviewReportsFromDb(
  supabase: SupabaseClient,
  schoolId: string,
  reports: unknown[],
): Promise<unknown[]> {
  if (!Array.isArray(reports) || reports.length === 0) return reports;

  const studentIds: string[] = [];
  for (const item of reports) {
    const rep = unwrapReportData(item);
    const st = rep?.students as unknown[] | undefined;
    const first = st?.[0] as Record<string, unknown> | undefined;
    if (!first?.student_id) continue;
    if (!isOLevelClass(String(first.current_class ?? ''))) continue;
    studentIds.push(String(first.student_id));
  }
  const uniqueSids = [...new Set(studentIds)];
  if (!uniqueSids.length) return reports;

  const { data: expRows, error } = await supabase
    .from('olevel_student_expected_subjects')
    .select('student_id, subject_name, offering_sort')
    .eq('school_id', schoolId)
    .in('student_id', uniqueSids)
    .order('student_id', { ascending: true })
    .order('offering_sort', { ascending: true })
    .order('subject_name', { ascending: true });

  if (error) {
    console.warn('[enrichSecondaryOlevelPreviewFromDb]', error.message);
    return reports;
  }
  if (!expRows?.length) return reports;

  const expectedByStudent = new Map<string, string[]>();
  for (const row of expRows) {
    const r = row as { student_id?: string; subject_name?: string };
    const sid = r.student_id;
    const sn = String(r.subject_name || '').trim();
    if (!sid || !sn) continue;
    if (!expectedByStudent.has(sid)) expectedByStudent.set(sid, []);
    expectedByStudent.get(sid)!.push(sn);
  }
  for (const sid of expectedByStudent.keys()) {
    expectedByStudent.set(sid, dedupeSubjectNamesPreserveOrder(expectedByStudent.get(sid)!));
  }

  return Promise.all(
    reports.map(async (item) => {
      const rep = unwrapReportData(item);
      if (!rep) return item;
      const students = rep.students as unknown[] | undefined;
      const st = students?.[0] as Record<string, unknown> | undefined;
      if (!st?.student_id || !isOLevelClass(String(st.current_class ?? ''))) return item;

      const sid = String(st.student_id);
      const names = expectedByStudent.get(sid);
      if (!names?.length) return item;

      const examSet = rep.examSet as Record<string, unknown> | undefined;
      const examSetName = String(examSet?.name ?? '');
      const term = Number(examSet?.term);
      const year = Number(examSet?.year);
      const rawResults = st.results;
      const merged = mergeOlevelResultsWithExpected(
        Array.isArray(rawResults) ? (rawResults as ResultRow[]) : [],
        names,
        examSetName,
      );
      const recalc = computeOlevelMeanPercentOverExpectedFromResultRows(merged, names);
      const prevSummary = (st.summary as Record<string, unknown> | undefined) ?? {};
      const summary =
        recalc != null && Number.isFinite(recalc)
          ? {
              ...prevSummary,
              average: Math.round(recalc * 100) / 100,
              division: calculateDivision(recalc),
              performanceRemark: calculateDivision(recalc),
            }
          : prevSummary;

      const prevComments = (st.comments as Record<string, unknown> | undefined) ?? {};
      let nextComments: Record<string, unknown> = { ...prevComments };

      if (
        recalc != null &&
        Number.isFinite(recalc) &&
        Number.isFinite(term) &&
        Number.isFinite(year) &&
        term > 0 &&
        year > 0
      ) {
        const currentClass = String(st.current_class ?? '');
        const resolved = await resolveSecondaryCommentsForPreviewAverage(
          supabase,
          schoolId,
          sid,
          currentClass,
          term,
          year,
          recalc,
        );
        nextComments = {
          ...prevComments,
          class_teacher_text: resolved.class_teacher_text,
          class_teacher_comment: resolved.class_teacher_text,
          head_teacher_text: resolved.head_teacher_text,
          headteacher_text: resolved.head_teacher_text,
          head_teacher_comment: resolved.head_teacher_text,
          headteacher_comment: resolved.head_teacher_text,
        };
      }

      const currentClassForNames = String(st.current_class ?? '');
      const sigNames = await fetchReportSignatureTeacherNames(supabase, schoolId, currentClassForNames);
      nextComments = {
        ...nextComments,
        class_teacher_name:
          sigNames.class_teacher_name || String(nextComments.class_teacher_name || '').trim(),
        head_teacher_name:
          sigNames.head_teacher_name || String(nextComments.head_teacher_name || '').trim(),
      };

      const nextInner = {
        ...rep,
        students: [{ ...st, results: merged, summary, comments: nextComments }],
      };
      return wrapIfNeeded(item, nextInner);
    }),
  );
}
