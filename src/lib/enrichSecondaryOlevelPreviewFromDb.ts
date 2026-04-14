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

/**
 * After the client recomputes O-Level mean % (expected subjects, missing = 0), comments must use
 * the same average as `summary.average`. The edge preview still resolves comments from the
 * pre-merge average, which skews bands (e.g. 56% shown with 61–80% comment text).
 * Mirrors `reportDataBuilder` / `snapshotLock`: saved `report_comments` override template bands.
 */
async function resolveSecondaryCommentsForPreviewAverage(
  supabase: SupabaseClient,
  schoolId: string,
  studentId: string,
  currentClass: string,
  term: number,
  year: number,
  averagePercent: number,
): Promise<{ class_teacher_text: string; head_teacher_text: string }> {
  const bounded = Math.max(0, Math.min(100, averagePercent));
  try {
    const [ctRes, htRes, rcRes] = await Promise.all([
      supabase
        .from('class_teacher_comments_settings')
        .select('min_percent,max_percent,comment_text')
        .eq('school_id', schoolId)
        .eq('class_name', currentClass)
        .order('min_percent', { ascending: true }),
      supabase
        .from('headteacher_comments_settings')
        .select('min_percent,max_percent,comment_text')
        .eq('school_id', schoolId)
        .order('min_percent', { ascending: true }),
      supabase
        .from('report_comments')
        .select('comment_type,comment_text')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('year', year),
    ]);

    let savedCt = '';
    let savedHt = '';
    for (const row of rcRes.data || []) {
      const r = row as { comment_type?: string; comment_text?: string };
      const t = String(r.comment_type || '').toLowerCase().replace(/\s+/g, '_');
      const text = String(r.comment_text || '');
      if (t === 'class_teacher' || t === 'class_teacher_comment') savedCt = text;
      else if (t === 'headteacher' || t === 'head_teacher' || t === 'headteacher_comment') savedHt = text;
    }

    const ctRows = (ctRes.data || []) as { min_percent?: number; max_percent?: number; comment_text?: string }[];
    const htRows = (htRes.data || []) as { min_percent?: number; max_percent?: number; comment_text?: string }[];
    const classMatch = ctRows.find(
      (s) => bounded >= Number(s.min_percent ?? 0) && bounded <= Number(s.max_percent ?? 100),
    );
    const headMatch = htRows.find(
      (s) => bounded >= Number(s.min_percent ?? 0) && bounded <= Number(s.max_percent ?? 100),
    );
    const ct = String(savedCt).trim() || String(classMatch?.comment_text || '').trim();
    const ht = String(savedHt).trim() || String(headMatch?.comment_text || '').trim();
    return { class_teacher_text: ct, head_teacher_text: ht };
  } catch (e) {
    console.warn('[enrichSecondaryOlevelPreviewFromDb] comment resolve failed', e);
    return { class_teacher_text: '', head_teacher_text: '' };
  }
}

/** Class teacher from `class_teachers` → `teachers`; head teacher from `users` role head_teacher. */
async function fetchReportSignatureTeacherNames(
  supabase: SupabaseClient,
  schoolId: string,
  className: string,
): Promise<{ class_teacher_name: string; head_teacher_name: string }> {
  const cn = String(className || '').trim();
  try {
    const [ctRes, htRes] = await Promise.all([
      cn
        ? supabase
            .from('class_teachers')
            .select('teachers(name)')
            .eq('school_id', schoolId)
            .eq('class_name', cn)
            .maybeSingle()
        : Promise.resolve({ data: null as { teachers?: { name?: string } | { name?: string }[] } | null }),
      supabase
        .from('users')
        .select('name')
        .eq('school_id', schoolId)
        .eq('role', 'head_teacher')
        .limit(1)
        .maybeSingle(),
    ]);
    let classTeacherName = '';
    const ctRow = ctRes.data as { teachers?: { name?: string } | { name?: string }[] | null } | null;
    if (ctRow?.teachers) {
      const t = ctRow.teachers;
      if (Array.isArray(t) && t[0]?.name != null) classTeacherName = String(t[0].name).trim();
      else if (t && typeof t === 'object' && 'name' in t)
        classTeacherName = String((t as { name?: string }).name || '').trim();
    }
    const headName = String((htRes.data as { name?: string } | null)?.name || '').trim();
    return { class_teacher_name: classTeacherName, head_teacher_name: headName };
  } catch {
    return { class_teacher_name: '', head_teacher_name: '' };
  }
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
