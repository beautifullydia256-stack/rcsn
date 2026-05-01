/**
 * Shared report data builder for Edge Functions.
 * - buildReportDataFromScope: fetch + compute with FULL CLASS scope for ranking; return report_data[] and snapshot rows (no DB writes).
 * - buildReportDataFromSnapshotRows: build report_data[] from already-persisted snapshot rows (for generate-reports-final after lock).
 * Position calculation always uses full class; studentIds filter only which report_data to return.
 */

import {
  calculatePrimaryGrade,
  calculateDivision,
  calculateAggregate,
  calculateGradeOLevel,
  uaceGradeFromPercentDefault,
  uacePointsFromGrade,
} from './reportUtils.ts';
import { normalizeStudentDobIsoFromRow, studentAgeYearsAtReference } from './studentAge.ts';

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
  /** Exam set id for ordering merged senior rows (C1/C2 chronological). */
  exam_set_id?: string;
  /** ISO timestamp from exam_sets.created_at; earliest/latest in term drive C1/C2 activity. */
  exam_set_created_at?: string | null;
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
  /** DB line identity (generated from topic); use for merge with teacher saves. */
  exam_topic_key?: string | null;
  /** DB line identity (generated from paper_code / paper_number). */
  exam_paper_key?: string | null;
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

/** Senior 1–4 O-Level (not UACE); used to fix primary D1–F9 grades shown on O-Level cards. */
function isOlevelSeniorClassName(className: string | null | undefined): boolean {
  const c = String(className || '').trim();
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(c);
}

/** Senior 1–2: class offers full subject list; every learner should mirror `class_subjects`. */
function isOlevelSenior12ClassName(className: string | null | undefined): boolean {
  const c = String(className || '').trim();
  return /^(senior\s*[12]|s\.?\s*[12])\b/i.test(c);
}

function normalizeReportSubjectKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Shown on report rows when a profile subject has no `exam_results` line for this scope.
 * Keep in sync with `src/lib/secondaryOlevelReportCopy.ts`.
 */
export const OLEVEL_REPORT_MISSING_RESULT_LABEL = '—';
export const OLEVEL_REPORT_MISSING_DESCRIPTOR_LABEL = '—';

function dedupeOlevelSubjectNamesPreserveOrder(names: string[]): string[] {
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

/**
 * Band1–4 from labels like "Senior 1", "Senior1", "S1", "S.1" (for matching `class_subjects.class_name`).
 */
export function olevelSeniorBandNumber(className: string | null | undefined): number | null {
  const c = String(className || '').trim();
  const m = c.match(/^senior\s*([1-4])(?:\s|$)|^s\.?\s*([1-4])(?:\s|$)/i);
  if (!m) return null;
  return parseInt(m[1] || m[2], 10);
}

/** Expand class labels so `class_subjects` fetch hits DB rows (e.g. UI/exam uses "S1", table has "Senior 1"). */
export function expandOlevelClassNamesForSubjectsQuery(names: string[]): string[] {
  const out = new Set<string>();
  for (const raw of names || []) {
    const t = String(raw || '').trim();
    if (!t) continue;
    out.add(t);
    const n = olevelSeniorBandNumber(t);
    if (n != null) {
      out.add(`Senior ${n}`);
      out.add(`Senior${n}`);
      out.add(`S${n}`);
      out.add(`S.${n}`);
      out.add(`s${n}`);
    }
  }
  return [...out];
}

/** Alias labels for A-Level class_name matching (e.g. Senior 5 vs S.5). */
function expandAlevelClassNamesForBandsQuery(names: string[]): string[] {
  const out = new Set<string>();
  const isALevelLabel = (label: string) => /^(senior\s*[56]|s\.?\s*[56])\b/i.test(String(label || '').trim());
  for (const raw of names || []) {
    const t = String(raw || '').trim();
    if (!t) continue;
    out.add(t);
    if (!isALevelLabel(t)) continue;
    const m = t.match(/^senior\s*([56])(?:\s|$)|^s\.?\s*([56])(?:\s|$)/i);
    const n = m ? parseInt(m[1] || m[2], 10) : null;
    if (n === 5 || n === 6) {
      out.add(`Senior ${n}`);
      out.add(`Senior${n}`);
      out.add(`S${n}`);
      out.add(`S.${n}`);
      out.add(`s${n}`);
    }
  }
  return [...out];
}

export type TeacherClassSubjectAssignmentRow = {
  class_name: string;
  subject: string;
  assignment_role: string;
  teacher_name: string;
};

/** A-Level report Teacher column: “Firstname L”. Keep in sync with `src/lib/secondarySubjectTeacherDisplay.ts`. */
function formatTeacherShortNameForReport(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return '';
  const parts = s.split(' ').filter(Boolean);
  const cap = (w: string) =>
    w.length === 0 ? '' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (parts.length === 1) return cap(parts[0]!);
  return `${cap(parts[0]!)} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}`;
}

function expandClassNameAliasesForTeacherLookup(raw: string): Set<string> {
  const out = new Set<string>();
  const t = String(raw || '').trim();
  if (!t) return out;
  out.add(t);
  const m = t.match(/^senior\s*([1-6])(?:\s|$)|^s\.?\s*([1-6])(?:\s|$)/i);
  if (!m) return out;
  const n = parseInt(m[1] || m[2], 10);
  if (!Number.isFinite(n)) return out;
  out.add(`Senior ${n}`);
  out.add(`Senior${n}`);
  out.add(`S${n}`);
  out.add(`S.${n}`);
  out.add(`s${n}`);
  return out;
}

function resolveSubjectTeacherShortNameFromAssignments(
  assignments: TeacherClassSubjectAssignmentRow[],
  studentClass: string,
  rowSubject: string,
): string | null {
  const subKey = normalizeReportSubjectKey(String(rowSubject ?? ''));
  if (!subKey) return null;
  const classCandidates = expandClassNameAliasesForTeacherLookup(String(studentClass || '').trim());
  const matches = (r: TeacherClassSubjectAssignmentRow) =>
    normalizeReportSubjectKey(r.subject) === subKey &&
    classCandidates.has(String(r.class_name || '').trim());
  const primary = assignments.find((r) => r.assignment_role === 'subject_teacher' && matches(r));
  const pn = primary?.teacher_name?.trim();
  if (pn) return formatTeacherShortNameForReport(pn);
  const anyRow = assignments.find((r) => matches(r));
  const an = anyRow?.teacher_name?.trim();
  if (an) return formatTeacherShortNameForReport(an);
  return null;
}

export async function fetchTeacherClassSubjectAssignmentsForSchool(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<TeacherClassSubjectAssignmentRow[]> {
  const { data: tcsRows, error: tcsErr } = await supabase
    .from('teacher_class_subjects')
    .select('class_name, subject, assignment_role, teacher_id')
    .eq('school_id', schoolId);
  if (tcsErr || !tcsRows?.length) return [];
  const ids = [...new Set(tcsRows.map((r: { teacher_id: string }) => r.teacher_id).filter(Boolean))];
  const { data: teacherNameRows } = ids.length
    ? await supabase.from('teachers').select('teacher_id, name').in('teacher_id', ids)
    : { data: [] as { teacher_id: string; name?: string }[] };
  const nameById = new Map(
    (teacherNameRows || []).map((t: { teacher_id: string; name?: string }) => [
      t.teacher_id,
      String(t.name || '').trim(),
    ]),
  );
  return (tcsRows as { class_name?: string; subject?: string; assignment_role?: string; teacher_id: string }[])
    .map((r) => ({
      class_name: String(r.class_name || '').trim(),
      subject: String(r.subject || '').trim(),
      assignment_role: String(r.assignment_role || 'subject_teacher'),
      teacher_name: nameById.get(r.teacher_id) || '',
    }))
    .filter((r) => r.class_name && r.subject && r.teacher_name);
}

type UacePctBand = { grade: string; min_pct: number; max_pct: number };

function parseUaceBandsJson(b: unknown): UacePctBand[] | null {
  if (b == null || !Array.isArray(b)) return null;
  const out: UacePctBand[] = [];
  for (const el of b) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    const grade = String(o.grade ?? '').trim();
    const min_pct = Number(o.min_pct);
    const max_pct = Number(o.max_pct);
    if (!grade || !Number.isFinite(min_pct) || !Number.isFinite(max_pct)) continue;
    out.push({ grade: grade.toUpperCase(), min_pct, max_pct });
  }
  return out.length ? out : null;
}

function uaceBandsForReportClass(reportCls: string, byKey: Map<string, UacePctBand[]>): UacePctBand[] | undefined {
  const t = String(reportCls || '').trim();
  if (!t) return undefined;
  const candidates = new Set<string>([t, ...expandAlevelClassNamesForBandsQuery([t])]);
  for (const [key, bands] of byKey) {
    const k = String(key || '').trim();
    if (candidates.has(k)) return bands;
  }
  for (const [key, bands] of byKey) {
    const keyCands = new Set<string>([String(key || '').trim(), ...expandAlevelClassNamesForBandsQuery([key])]);
    for (const c of candidates) {
      if (keyCands.has(c)) return bands;
    }
  }
  if (byKey.size === 1) {
    const first = [...byKey.values()][0];
    if (first?.length) return first;
  }
  return undefined;
}

/**
 * All `class_subjects` rows whose class label matches the same O-Level senior band (e.g. S1 / Senior 1 / Senior 1 Science).
 * Matches `public.olevel_subject_exam_coverage` / `olevel_class_senior_band` semantics so we do not depend on exact UI strings.
 */
function subjectsForOlevelSeniorBand(
  band: number,
  classSubjectsRows: { class_name: string; subject: string }[],
): string[] {
  const acc: string[] = [];
  for (const row of classSubjectsRows || []) {
    const cn = String(row.class_name || '').trim().replace(/\s+/g, ' ');
    const sub = String(row.subject || '').trim();
    if (!cn || !sub) continue;
    if (olevelSeniorBandNumber(cn) === band) acc.push(sub);
  }
  return dedupeOlevelSubjectNamesPreserveOrder(acc);
}

/**
 * Expected O-Level subjects per student from Postgres view `olevel_student_expected_subjects`
 * (compulsory first via offering_sort, then subsidiary). Edge preview/final uses this so the card
 * matches SQL.
 */
export async function fetchOlevelExpectedSubjectsByStudentId(
  supabase: SupabaseClient,
  schoolId: string,
  studentIds: string[],
): Promise<Record<string, string[]>> {
  if (!studentIds.length) return {};
  const { data, error } = await supabase
    .from('olevel_student_expected_subjects')
    .select('student_id, subject_name, offering_sort')
    .eq('school_id', schoolId)
    .in('student_id', studentIds)
    .order('student_id', { ascending: true })
    .order('offering_sort', { ascending: true })
    .order('subject_name', { ascending: true });
  if (error) throw new Error(error.message);
  const out: Record<string, string[]> = {};
  for (const row of data || []) {
    const r = row as { student_id?: string; subject_name?: string };
    const sid = r.student_id;
    const sub = String(r.subject_name || '').trim();
    if (!sid || !sub) continue;
    if (!out[sid]) out[sid] = [];
    out[sid].push(sub);
  }
  for (const sid of Object.keys(out)) {
    out[sid] = dedupeOlevelSubjectNamesPreserveOrder(out[sid]);
  }
  return out;
}

/**
 * A-Level (Senior 5–6): subjects on the student’s profile (`student_alevel_subjects`).
 * Principals first, then subsidiaries; same placeholder merge as O-Level reports.
 */
export async function fetchAlevelExpectedSubjectsByStudentId(
  supabase: SupabaseClient,
  schoolId: string,
  studentIds: string[],
): Promise<Record<string, string[]>> {
  if (!studentIds.length) return {};
  const { data, error } = await supabase
    .from('student_alevel_subjects')
    .select('student_id, subject_name, subject_role')
    .eq('school_id', schoolId)
    .in('student_id', studentIds);
  if (error) throw new Error(error.message);
  type Row = { student_id?: string; subject_name?: string; subject_role?: string };
  const rows = [...(data || [])] as Row[];
  rows.sort((a, b) => {
    const sa = String(a.student_id || '');
    const sb = String(b.student_id || '');
    if (sa !== sb) return sa.localeCompare(sb);
    const ra = a.subject_role === 'principal' ? 0 : 1;
    const rb = b.subject_role === 'principal' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return String(a.subject_name || '').localeCompare(String(b.subject_name || ''), undefined, { sensitivity: 'base' });
  });
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    const sid = r.student_id;
    const sub = String(r.subject_name || '').trim();
    if (!sid || !sub) continue;
    if (!out[sid]) out[sid] = [];
    out[sid].push(sub);
  }
  for (const sid of Object.keys(out)) {
    out[sid] = dedupeOlevelSubjectNamesPreserveOrder(out[sid]);
  }
  return out;
}

/**
 * A-Level: principal vs subsidiary per subject from `student_alevel_subjects.subject_role`.
 * Keys are `normalizeReportSubjectKey(subject_name)`.
 */
export async function fetchAlevelSubjectRolesByStudentId(
  supabase: SupabaseClient,
  schoolId: string,
  studentIds: string[],
): Promise<Record<string, Record<string, 'principal' | 'subsidiary'>>> {
  if (!studentIds.length) return {};
  const { data, error } = await supabase
    .from('student_alevel_subjects')
    .select('student_id, subject_name, subject_role')
    .eq('school_id', schoolId)
    .in('student_id', studentIds);
  if (error) throw new Error(error.message);
  const out: Record<string, Record<string, 'principal' | 'subsidiary'>> = {};
  for (const r of data || []) {
    const row = r as { student_id?: string; subject_name?: string; subject_role?: string };
    const sid = String(row.student_id || '');
    const sub = String(row.subject_name || '').trim();
    if (!sid || !sub) continue;
    const roleRaw = String(row.subject_role || '').toLowerCase();
    const role: 'principal' | 'subsidiary' = roleRaw === 'subsidiary' ? 'subsidiary' : 'principal';
    if (!out[sid]) out[sid] = {};
    out[sid][normalizeReportSubjectKey(sub)] = role;
  }
  return out;
}

/** @deprecated Prefer `fetchOlevelExpectedSubjectsByStudentId` (DB view); kept for reference. */
export function buildExpectedOlevelSubjectsByStudentIdForReports(
  students: { student_id: string; current_class?: string | null }[],
  classSubjectsRows: { class_name: string; subject: string }[],
  olevelRows: { student_id: string; subject_name: string }[],
): Record<string, string[]> {
  const olevelByStudent = new Map<string, string[]>();
  for (const r of olevelRows || []) {
    const sid = r.student_id;
    const sn = String(r.subject_name || '').trim();
    if (!sid || !sn) continue;
    if (!olevelByStudent.has(sid)) olevelByStudent.set(sid, []);
    olevelByStudent.get(sid)!.push(sn);
  }
  const out: Record<string, string[]> = {};
  for (const st of students || []) {
    const sid = st.student_id;
    const clsRaw = String(st.current_class || '').trim();
    if (!sid || !clsRaw) continue;
    if (!isOlevelSeniorClassName(clsRaw)) continue;
    const band = olevelSeniorBandNumber(clsRaw);
    if (band == null) continue;
    let list: string[] = [];
    if (isOlevelSenior12ClassName(clsRaw)) {
      list = subjectsForOlevelSeniorBand(band, classSubjectsRows);
    } else {
      list = dedupeOlevelSubjectNamesPreserveOrder(olevelByStudent.get(sid) ?? []);
      if (!list.length) {
        list = subjectsForOlevelSeniorBand(band, classSubjectsRows);
      }
    }
    if (list.length) out[sid] = list;
  }
  return out;
}

type OlevelReportResultRow = Record<string, unknown>;

function mergeOlevelReportResultsWithExpectedSubjects(
  results: OlevelReportResultRow[],
  expectedOrdered: string[],
  examSetName: string,
  placeholderClassName?: string,
): OlevelReportResultRow[] {
  if (!expectedOrdered.length) return results;
  const byKey = new Map<string, OlevelReportResultRow[]>();
  for (const r of results) {
    const k = normalizeReportSubjectKey(String(r.subject ?? ''));
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }
  const used = new Set<string>();
  const out: OlevelReportResultRow[] = [];
  const placeholder = (subject: string): OlevelReportResultRow => {
    const msg = OLEVEL_REPORT_MISSING_RESULT_LABEL;
    const desc = OLEVEL_REPORT_MISSING_DESCRIPTOR_LABEL;
    return {
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
      nursery_skill_performance: undefined,
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
      class_name: placeholderClassName,
      result_missing_placeholder: true,
    };
  };
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

/** Mean % over expected subjects after merge (placeholders = 0); one value per subject = mean of topic lines. */
function olevelMeanPercentOverExpectedFromMergedRows(
  resultsOut: OlevelReportResultRow[],
  expectedOrdered: string[],
): number | null {
  if (!expectedOrdered.length) return null;
  const byKey = new Map<string, OlevelReportResultRow[]>();
  for (const r of resultsOut) {
    const k = normalizeReportSubjectKey(String(r.subject ?? ''));
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }
  let sum = 0;
  for (const subj of expectedOrdered) {
    const k = normalizeReportSubjectKey(subj);
    const rows = byKey.get(k) ?? [];
    const vals: number[] = [];
    for (const r of rows) {
      if (r.result_missing_placeholder === true) continue;
      const fs = numOrUndef(r.final_score);
      if (fs != null) {
        vals.push(fs);
        continue;
      }
      const m = numOrUndef(r.marks_obtained);
      const t = Number(r.total_marks ?? 100) || 100;
      if (m != null && t > 0) vals.push((m / t) * 100);
    }
    sum += vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  return sum / expectedOrdered.length;
}

const PRIMARY_DIVISION_GRADES = new Set(['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9']);

function looksLikePrimaryDivisionGrade(g: string): boolean {
  return PRIMARY_DIVISION_GRADES.has((g || '').trim().toUpperCase());
}

function seniorClassNameFromRows(rows: SnapshotRowForPersist[]): string {
  for (const r of rows) {
    const c = (r.class_name || '').trim();
    if (c) return r.class_name;
  }
  return rows[0]?.class_name ?? '';
}

/** Same grouping as DB unique index (subject + exam_topic_key + exam_paper_key). */
function seniorResultLineKey(d: SnapshotRowForPersist): string {
  const tk =
    d.exam_topic_key != null && String(d.exam_topic_key).trim() !== ''
      ? String(d.exam_topic_key).trim()
      : String(d.topic ?? '').trim();
  let pk = '';
  if (d.exam_paper_key != null && String(d.exam_paper_key).trim() !== '') {
    pk = String(d.exam_paper_key).trim();
  } else {
    const pc = d.paper_code != null ? String(d.paper_code).trim() : '';
    const pn = d.paper_number != null ? String(d.paper_number).trim() : '';
    pk = pc || pn;
  }
  return `${String(d.subject || '')}\0${tk}\0${pk}`;
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

function uaceGradeFromPercentWithOptionalBands(pct: number, bands: UacePctBand[] | undefined): string {
  if (bands?.length) {
    const p = Number(pct);
    if (!Number.isFinite(p)) return 'F';
    for (const row of bands) {
      if (p >= row.min_pct && p <= row.max_pct) {
        return String(row.grade || '')
          .trim()
          .toUpperCase();
      }
    }
    return 'F';
  }
  return uaceGradeFromPercentDefault(pct);
}

/**
 * Principal passes: principals with grade ≠ F. Subsidiary passes: subsidiaries with grade O.
 * Total points: sum of principal UACE points +1 per subsidiary O (max 20). See UACE_ALEVEL_GRADING_LOGIC.md.
 */
function computeAlevelUaceReportStats(
  resultsOut: OlevelReportResultRow[],
  expectedOrdered: string[] | undefined,
  roles: Record<string, 'principal' | 'subsidiary'> | undefined,
  uaceBands: UacePctBand[] | undefined,
): {
  principalPasses: number;
  subsidiaryPasses: number;
  totalPointsNumerator: number;
  totalPointsDenominator: number;
} {
  const denom = 20;
  if (!expectedOrdered?.length) {
    return { principalPasses: 0, subsidiaryPasses: 0, totalPointsNumerator: 0, totalPointsDenominator: denom };
  }
  let principalPasses = 0;
  let subsidiaryPasses = 0;
  let totalPoints = 0;
  const roleOf = (subj: string): 'principal' | 'subsidiary' => {
    const k = normalizeReportSubjectKey(subj);
    return roles?.[k] === 'subsidiary' ? 'subsidiary' : 'principal';
  };

  for (const subj of expectedOrdered) {
    const k = normalizeReportSubjectKey(subj);
    if (!k) continue;
    const rows = resultsOut.filter((r) => normalizeReportSubjectKey(String(r.subject ?? '')) === k);
    if (rows.length === 0) continue;
    const vals: number[] = [];
    for (const r of rows) {
      if (r.result_missing_placeholder === true) continue;
      const fs = numOrUndef(r.final_score);
      if (fs != null) {
        vals.push(fs);
        continue;
      }
      const m = numOrUndef(r.marks_obtained);
      const t = Number(r.total_marks ?? 100) || 100;
      if (m != null && t > 0) vals.push((m / t) * 100);
    }
    const grade =
      vals.length > 0
        ? uaceGradeFromPercentWithOptionalBands(vals.reduce((a, b) => a + b, 0) / vals.length, uaceBands)
        : 'F';
    const role = roleOf(subj);
    if (role === 'principal') {
      if (grade !== 'F') principalPasses += 1;
      totalPoints += uacePointsFromGrade(grade);
    } else {
      // Subsidiary subjects: any grade except F = 1 point and 1 subsidiary pass.
      // Grade display stays as-is (A/B/C/D/E/O); only F means no pass/no point.
      if (grade !== 'F') subsidiaryPasses += 1;
      totalPoints += grade !== 'F' ? 1 : 0;
    }
  }

  return {
    principalPasses,
    subsidiaryPasses,
    totalPointsNumerator: totalPoints,
    totalPointsDenominator: denom,
  };
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

/** Sort exam lines within a subject/topic/paper group: chronological exam set (created_at), then stable id/name. */
function sortSeniorSnapshotGroupByExamOrder(group: SnapshotRowForPersist[]): SnapshotRowForPersist[] {
  return [...group].sort((a, b) => {
    const ta = a.exam_set_created_at ? Date.parse(String(a.exam_set_created_at)) : NaN;
    const tb = b.exam_set_created_at ? Date.parse(String(b.exam_set_created_at)) : NaN;
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    if (!Number.isNaN(ta) && Number.isNaN(tb)) return -1;
    if (Number.isNaN(ta) && !Number.isNaN(tb)) return 1;
    const ida = a.exam_set_id ?? '';
    const idb = b.exam_set_id ?? '';
    if (ida && idb && ida !== idb) return ida.localeCompare(idb);
    return String(a.exam_set_name ?? '').localeCompare(String(b.exam_set_name ?? ''));
  });
}

/** Prefer latest exam in term, but if that row omitted a field, take the first older row that has it (still teacher-saved). */
function coalesceNumFromGroup(
  sorted: SnapshotRowForPersist[],
  pick: (d: SnapshotRowForPersist) => unknown
): number | undefined {
  for (let i = sorted.length - 1; i >= 0; i--) {
    const n = numOrUndef(pick(sorted[i]));
    if (n !== undefined) return n;
  }
  return undefined;
}

function coalesceStrFromGroup(
  sorted: SnapshotRowForPersist[],
  pick: (d: SnapshotRowForPersist) => unknown
): string | undefined {
  for (let i = sorted.length - 1; i >= 0; i--) {
    const raw = pick(sorted[i]);
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s !== '') return s;
  }
  return undefined;
}

/**
 * One row per subject/topic/paper line: earliest exam in term → continuous_c1 activity, latest → continuous_c2;
 * other columns prefer the latest exam set row, with per-field fallback to older rows in the same line when latest omitted them.
 */
function mergeSeniorSecondarySnapshotRows(rows: SnapshotRowForPersist[]): SnapshotRowForPersist[] {
  if (rows.length === 0) return rows;
  const byKey = new Map<string, SnapshotRowForPersist[]>();
  for (const d of rows) {
    const k = seniorResultLineKey(d);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(d);
  }
  const merged: SnapshotRowForPersist[] = [];
  for (const group of byKey.values()) {
    const sorted = sortSeniorSnapshotGroupByExamOrder(group);
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];
    const c1 = earliest?.activity_score ?? null;
    const c2 = latest?.activity_score ?? null;
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
    const finalCoalesced =
      coalesceNumFromGroup(sorted, (d) => d.final_score) ?? coalesceNumFromGroup(sorted, (d) => d.marks_obtained);
    const marks = Number(finalCoalesced ?? scoreFromRow(latest) ?? scoreFromRow(earliest) ?? 0);
    const total = Number(latest?.total_marks ?? earliest?.total_marks ?? 100);
    const gradeCoalesced = coalesceStrFromGroup(sorted, (d) => d.grade) ?? '';
    merged.push({
      ...latest,
      marks_obtained: marks,
      total_marks: total,
      grade: gradeCoalesced,
      remarks: coalesceStrFromGroup(sorted, (d) => d.remarks) ?? latest.remarks,
      teacher_initials: coalesceStrFromGroup(sorted, (d) => d.teacher_initials) ?? latest.teacher_initials,
      teacher_comment: coalesceStrFromGroup(sorted, (d) => d.teacher_comment) ?? latest.teacher_comment,
      exam_set_name: latest.exam_set_name,
      exam_set_id: latest.exam_set_id,
      exam_set_created_at: latest.exam_set_created_at,
      exam_set_term: latest.exam_set_term,
      exam_set_year: latest.exam_set_year,
      activity_score: coalesceNumFromGroup(sorted, (d) => d.activity_score) ?? null,
      formative_score: coalesceNumFromGroup(sorted, (d) => d.formative_score) ?? null,
      exam_score: coalesceNumFromGroup(sorted, (d) => d.exam_score) ?? null,
      final_score: finalCoalesced ?? null,
      descriptor: coalesceStrFromGroup(sorted, (d) => d.descriptor) ?? null,
      overall_remark: coalesceStrFromGroup(sorted, (d) => d.overall_remark) ?? null,
      paper_code: latest.paper_code,
      paper_number: latest.paper_number,
      topic: coalesceStrFromGroup(sorted, (d) => d.topic) ?? latest.topic ?? null,
      exam_topic_key: latest.exam_topic_key ?? null,
      exam_paper_key: latest.exam_paper_key ?? null,
      continuous_c1: c1,
      continuous_c2: c2,
    });
  }
  return merged;
}

/** After raw exam rows are flattened into snapshot rows, merge multi–exam-set senior lines (chronological C1/C2) for seniors only. */
function mergeSnapshotRowsByStudent(snapshotData: SnapshotRowForPersist[]): SnapshotRowForPersist[] {
  const byStudent = new Map<string, SnapshotRowForPersist[]>();
  for (const row of snapshotData) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id)!.push(row);
  }
  const out: SnapshotRowForPersist[] = [];
  for (const rows of byStudent.values()) {
    const cls = seniorClassNameFromRows(rows);
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
    .select('id, name, term, year, created_at')
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

  const expandedClassNamesForExam =
    classNames.length > 0 ? [...new Set(expandOlevelClassNamesForSubjectsQuery(classNames))] : classNames;

  const { data: examResultsRaw, error: resultsError } = await supabase.rpc('exam_results_for_secondary_report', {
    p_school_id: schoolId,
    p_exam_set_ids: examSetIdsToInclude,
    p_class_names: expandedClassNamesForExam.length > 0 ? expandedClassNamesForExam : null,
  });
  if (resultsError) throw new Error(resultsError.message);

  const classNamesForAlevelPrefs = [...new Set([...classNames, ...expandedClassNamesForExam])].filter((c) =>
    isALevelClassName(String(c || '').trim()),
  );
  const alevelGradeRemarksByClass = new Map<string, Record<string, string>>();
  if (classNamesForAlevelPrefs.length > 0) {
    const { data: prefRows, error: prefErr } = await supabase
      .from('teacher_exam_class_prefs')
      .select('class_name, grade_remarks_alevel')
      .eq('school_id', schoolId)
      .in('class_name', classNamesForAlevelPrefs);
    if (!prefErr) {
      for (const row of prefRows || []) {
        const r = row as { class_name?: string; grade_remarks_alevel?: unknown };
        const cn = String(r.class_name || '').trim();
        const gra = r.grade_remarks_alevel;
        if (cn && gra && typeof gra === 'object' && gra !== null && !Array.isArray(gra)) {
          alevelGradeRemarksByClass.set(cn, gra as Record<string, string>);
        }
      }
    }
  }

  const uacePercentBandsByClass = new Map<string, UacePctBand[]>();
  {
    const { data: allBandRows, error: bandErr } = await supabase
      .from('school_class_uace_grade_bands')
      .select('class_name, bands')
      .eq('school_id', schoolId);
    if (!bandErr) {
      for (const row of allBandRows || []) {
        const r = row as { class_name?: string; bands?: unknown };
        const cn = String(r.class_name || '').trim();
        const parsed = parseUaceBandsJson(r.bands);
        if (cn && parsed?.length) uacePercentBandsByClass.set(cn, parsed);
      }
    }
  }

  const teacherClassSubjectAssignments = await fetchTeacherClassSubjectAssignmentsForSchool(supabase, schoolId);

  const allStudentIdsInClass = [...new Set((examResultsRaw || []).map((r: { student_id: string }) => r.student_id))];
  const classNamesFromResults = [...new Set((examResultsRaw || []).map((r: { class_name: string }) => r.class_name))];

  let commentSettingsQuery = supabase
    .from('class_teacher_comments_settings')
    .select('*')
    .eq('school_id', schoolId);
  if (classNamesFromResults.length > 0) {
    commentSettingsQuery = commentSettingsQuery.in('class_name', classNamesFromResults);
  }
  let classTeachersForReportNamesQuery = supabase
    .from('class_teachers')
    .select('class_name, teachers(name)')
    .eq('school_id', schoolId);
  if (classNamesFromResults.length > 0) {
    classTeachersForReportNamesQuery = classTeachersForReportNamesQuery.in('class_name', classNamesFromResults);
  }
  const examSetById = new Map<
    string,
    { id: string; name?: string; term?: number; year?: number; created_at?: string | null }
  >(
    (examSetsForTerm || []).map((es: { id: string; name?: string; term?: number; year?: number; created_at?: string | null }) => [
      es.id,
      {
        id: es.id,
        name: es.name,
        term: es.term,
        year: es.year,
        created_at: es.created_at ?? null,
      },
    ]),
  );

  const [
    { data: processedRows },
    { data: students },
    { data: attendanceData },
    { data: studentPayments },
    { data: studentPhotos },
    { data: schoolInfo },
    { data: commentSettings },
    { data: headteacherCommentSettings },
    { data: reportCommentsRows },
    { data: classTeachersForReportNames },
    { data: headTeacherUserForReport },
  ] = await Promise.all([
    supabase
      .from('processed_primary_exam_results')
      .select('student_id, exam_set_id, aggregate, division, class_position, class_teacher_comment, headteacher_comment')
      .eq('school_id', schoolId)
      .in('exam_set_id', examSetIdsToInclude)
      .in('student_id', allStudentIdsInClass),
    supabase.from('students').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_attendance').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_payments').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_photos').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('schools').select('*').eq('school_id', schoolId).single(),
    commentSettingsQuery,
    supabase.from('headteacher_comments_settings').select('*').eq('school_id', schoolId),
    supabase
      .from('report_comments')
      .select('student_id, comment_type, comment_text')
      .eq('school_id', schoolId)
      .eq('term', term)
      .eq('year', year)
      .in('student_id', allStudentIdsInClass),
    classTeachersForReportNamesQuery,
    supabase.from('users').select('name').eq('school_id', schoolId).eq('role', 'head_teacher').limit(1).maybeSingle(),
  ]);

  const classTeacherDisplayNameByClass: Record<string, string> = {};
  for (const row of classTeachersForReportNames || []) {
    const r = row as { class_name?: string; teachers?: { name?: string } | { name?: string }[] | null };
    const cn = String(r.class_name || '').trim();
    if (!cn) continue;
    const t = r.teachers;
    let nm = '';
    if (Array.isArray(t) && t[0]?.name != null) nm = String(t[0].name).trim();
    else if (t && typeof t === 'object' && !Array.isArray(t) && 'name' in t)
      nm = String((t as { name?: string }).name || '').trim();
    if (nm) classTeacherDisplayNameByClass[cn] = nm;
  }
  const headTeacherDisplayNameForReport = String(
    (headTeacherUserForReport as { name?: string } | null)?.name || '',
  ).trim();

  const studentById = new Map<string, Record<string, unknown>>();
  (students || []).forEach((s: { student_id: string }) => {
    if (s?.student_id) studentById.set(s.student_id, s as Record<string, unknown>);
  });

  const examResults = (examResultsRaw || [])
    .map((row: Record<string, unknown> & { student_id: string; exam_set_id: string }) => {
      const st = studentById.get(row.student_id);
      const es = examSetById.get(row.exam_set_id);
      return {
        ...row,
        students: st,
        exam_sets: es,
      };
    })
    .filter((r) => r.students && r.exam_sets);

  const processedByStudent: Record<string, { aggregate?: number; division?: string; class_position?: number; class_teacher_comment?: string; headteacher_comment?: string }> = {};
  (processedRows || []).forEach((row: { student_id: string; exam_set_id?: string; aggregate?: number; division?: string; class_position?: number; class_teacher_comment?: string; headteacher_comment?: string }) => {
    if (!row.student_id) return;
    if (hasMultipleSets && eotExamSetId) {
      if (row.exam_set_id !== eotExamSetId) return;
      processedByStudent[row.student_id] = {
        aggregate: row.aggregate != null ? Number(row.aggregate) : undefined,
        division: row.division && String(row.division).trim() ? row.division : undefined,
        class_position: row.class_position != null ? Number(row.class_position) : undefined,
        class_teacher_comment: row.class_teacher_comment && String(row.class_teacher_comment).trim() ? String(row.class_teacher_comment).trim() : undefined,
        headteacher_comment: row.headteacher_comment && String(row.headteacher_comment).trim() ? String(row.headteacher_comment).trim() : undefined,
      };
      return;
    }
    if (!processedByStudent[row.student_id]) {
      processedByStudent[row.student_id] = {
        aggregate: row.aggregate != null ? Number(row.aggregate) : undefined,
        division: row.division && String(row.division).trim() ? row.division : undefined,
        class_position: row.class_position != null ? Number(row.class_position) : undefined,
        class_teacher_comment: row.class_teacher_comment && String(row.class_teacher_comment).trim() ? String(row.class_teacher_comment).trim() : undefined,
        headteacher_comment: row.headteacher_comment && String(row.headteacher_comment).trim() ? String(row.headteacher_comment).trim() : undefined,
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

  let expectedOlevelSubjectsByStudentId: Record<string, string[]> = {};
  let expectedAlevelSubjectsByStudentId: Record<string, string[]> = {};
  let alevelSubjectRolesByStudentId: Record<string, Record<string, 'principal' | 'subsidiary'>> = {};
  if (allStudentIdsInClass.length > 0) {
    expectedOlevelSubjectsByStudentId = await fetchOlevelExpectedSubjectsByStudentId(
      supabase,
      schoolId,
      allStudentIdsInClass,
    );
    expectedAlevelSubjectsByStudentId = await fetchAlevelExpectedSubjectsByStudentId(
      supabase,
      schoolId,
      allStudentIdsInClass,
    );
    alevelSubjectRolesByStudentId = await fetchAlevelSubjectRolesByStudentId(
      supabase,
      schoolId,
      allStudentIdsInClass,
    );
  }

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
        subject?: string;
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

      const expectedList = dedupeOlevelSubjectNamesPreserveOrder(
        expectedOlevelSubjectsByStudentId[studentId] ?? [],
      );
      const expectedAlevelList = dedupeOlevelSubjectNamesPreserveOrder(
        expectedAlevelSubjectsByStudentId[studentId] ?? [],
      );
      let average: number;
      if (seniorClass && isOlevelSeniorClassName(classNameForSenior) && expectedList.length > 0) {
        let sumPct = 0;
        for (const subj of expectedList) {
          const sk = normalizeReportSubjectKey(subj);
          const matching = resultsForCalculation.filter(
            (r) => normalizeReportSubjectKey(String(r.subject || '')) === sk,
          );
          if (!matching.length) continue;
          const linePcts: number[] = [];
          for (const r of matching) {
            const { marks, total } = seniorMarksTotalForReport(
              classNameForSenior,
              r.marks_obtained,
              r.final_score,
              r.total_marks,
            );
            const t = Number(total) || 100;
            const m = Number(marks);
            if (Number.isFinite(m) && t > 0) linePcts.push((m / t) * 100);
          }
          sumPct += linePcts.length > 0 ? linePcts.reduce((a, b) => a + b, 0) / linePcts.length : 0;
        }
        average = sumPct / expectedList.length;
      } else if (seniorClass && isALevelClassName(classNameForSenior) && expectedAlevelList.length > 0) {
        let sumPct = 0;
        for (const subj of expectedAlevelList) {
          const sk = normalizeReportSubjectKey(subj);
          const matching = resultsForCalculation.filter(
            (r) => normalizeReportSubjectKey(String(r.subject || '')) === sk,
          );
          if (!matching.length) continue;
          const linePcts: number[] = [];
          for (const r of matching) {
            const { marks, total } = seniorMarksTotalForReport(
              classNameForSenior,
              r.marks_obtained,
              r.final_score,
              r.total_marks,
            );
            const t = Number(total) || 100;
            const m = Number(marks);
            if (Number.isFinite(m) && t > 0) linePcts.push((m / t) * 100);
          }
          sumPct += linePcts.length > 0 ? linePcts.reduce((a, b) => a + b, 0) / linePcts.length : 0;
        }
        average = sumPct / expectedAlevelList.length;
      } else if (validResults.length === 0) {
        average = 0;
      } else {
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
        average = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      }

      studentAverages[studentId] = average;
      if (validResults.length === 0) {
        studentAggregates[studentId] = fromDb?.aggregate ?? 0;
      } else {
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
      }
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

  // Comments are now resolved in the database via triggers and stored in processed_primary_exam_results
  // We read them directly from processedByStudent instead of calculating them here
  const resolvedComments: Record<string, { classTeacher: string; headTeacher: string }> = {};
  (students || []).forEach((student: { student_id: string; current_class?: string }) => {
    const fromDb = processedByStudent[student.student_id];
    
    // Check for saved overrides in report_comments table
    const studentComment = studentComments.find((c) => c.student_id === student.student_id);
    const savedClassTeacher = String(studentComment?.class_teacher_text || '').trim();
    const savedHeadTeacher = String(studentComment?.headteacher_text || '').trim();
    
    // Use saved overrides if present, otherwise use DB-resolved comments
    resolvedComments[student.student_id] = {
      classTeacher: savedClassTeacher || fromDb?.class_teacher_comment || '',
      headTeacher: savedHeadTeacher || fromDb?.headteacher_comment || '',
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
    const exam_topic_key =
      raw.exam_topic_key != null && String(raw.exam_topic_key).trim() !== ''
        ? String(raw.exam_topic_key).trim()
        : null;
    const exam_paper_key =
      raw.exam_paper_key != null && String(raw.exam_paper_key).trim() !== ''
        ? String(raw.exam_paper_key).trim()
        : null;
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
      exam_set_id: (result.exam_sets as { id?: string })?.id || undefined,
      exam_set_created_at:
        (result.exam_sets as { created_at?: string | null })?.created_at != null
          ? String((result.exam_sets as { created_at?: string | null }).created_at)
          : null,
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
      exam_topic_key,
      exam_paper_key,
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
        student_date_of_birth: normalizeStudentDobIsoFromRow(student as Record<string, unknown>),
        student_age_years: (() => {
          const v = (student as { age_years?: unknown } | undefined)?.age_years;
          if (v == null || v === '') return null;
          const n = Number(v);
          return !Number.isNaN(n) && n >= 0 && n <= 120 ? n : null;
        })(),
        class_teacher_name: classTeacherDisplayNameByClass[className] || '',
        head_teacher_name: headTeacherDisplayNameForReport,
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
    examSetId,
    expectedOlevelSubjectsByStudentId,
    expectedAlevelSubjectsByStudentId,
    alevelSubjectRolesByStudentId,
    alevelGradeRemarksByClass,
    uacePercentBandsByClass,
    teacherClassSubjectAssignments,
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
  snapshotId: string,
  expectedOlevelSubjectsByStudentId?: Record<string, string[]>,
  expectedAlevelSubjectsByStudentId?: Record<string, string[]>,
  alevelSubjectRolesByStudentId?: Record<string, Record<string, 'principal' | 'subsidiary'>>,
  alevelGradeRemarksByClass?: Map<string, Record<string, string>>,
  uacePercentBandsByClass?: Map<string, UacePctBand[]>,
  teacherClassSubjectAssignments?: TeacherClassSubjectAssignmentRow[],
): unknown[] {
  return buildReportDataListFromSnapshotRows(
    allSnapshotData,
    school,
    examSet,
    snapshotId,
    expectedOlevelSubjectsByStudentId,
    expectedAlevelSubjectsByStudentId,
    alevelSubjectRolesByStudentId,
    alevelGradeRemarksByClass,
    uacePercentBandsByClass,
    teacherClassSubjectAssignments,
  );
}

function buildReportDataListFromSnapshotRows(
  snapshotData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  baseExamSet: { id: string; name?: string; term?: number; year?: number },
  examSetId: string,
  expectedOlevelSubjectsByStudentId?: Record<string, string[]>,
  expectedAlevelSubjectsByStudentId?: Record<string, string[]>,
  alevelSubjectRolesByStudentId?: Record<string, Record<string, 'principal' | 'subsidiary'>>,
  alevelGradeRemarksByClass?: Map<string, Record<string, string>>,
  uacePercentBandsByClass?: Map<string, UacePctBand[]>,
  teacherClassSubjectAssignments?: TeacherClassSubjectAssignmentRow[],
): unknown[] {
  const mergedSnapshot = mergeSnapshotRowsByStudent(snapshotData);
  const uniqueStudentIds = [...new Set(mergedSnapshot.map((d) => d.student_id))];
  const list: unknown[] = [];
  const examSetName = baseExamSet?.name || '';

  for (const studentId of uniqueStudentIds) {
    const studentData = mergedSnapshot.filter((d) => d.student_id === studentId);
    if (studentData.length === 0) continue;
    const reportData = oneReportFromSnapshotRows(
      studentData,
      school,
      baseExamSet,
      examSetId,
      examSetName,
      expectedOlevelSubjectsByStudentId?.[studentId],
      expectedAlevelSubjectsByStudentId?.[studentId],
      alevelSubjectRolesByStudentId?.[studentId],
      alevelGradeRemarksByClass,
      uacePercentBandsByClass,
      teacherClassSubjectAssignments,
    );
    list.push(reportData);
  }
  return list;
}

function oneReportFromSnapshotRows(
  studentData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  examSet: { id: string; name?: string; term?: number; year?: number },
  _snapshotOrExamSetId: string,
  examSetName: string,
  expectedOlevelSubjectNames?: string[],
  expectedAlevelSubjectNames?: string[],
  alevelSubjectRolesForStudent?: Record<string, 'principal' | 'subsidiary'>,
  alevelGradeRemarksByClass?: Map<string, Record<string, string>>,
  uacePercentBandsByClass?: Map<string, UacePctBand[]>,
  teacherClassSubjectAssignments?: TeacherClassSubjectAssignmentRow[],
): unknown {
  const firstRecord = studentData[0];
  const frozenData = firstRecord.frozen_data || {};
  const reportClassName = seniorClassNameFromRows(studentData);
  const isSeniorClass = isSeniorSecondaryClassName(reportClassName);
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
      ? (() => {
          const rawO =
            d.overall_remark != null && String(d.overall_remark).trim() !== ''
              ? String(d.overall_remark).trim()
              : '';
          if (rawO !== '') return normalizeAutoMissedRemarks(rawO);
          const rawR =
            d.remarks != null && String(d.remarks).trim() !== '' ? String(d.remarks).trim() : '';
          return rawR !== '' ? normalizeAutoMissedRemarks(rawR) : '';
        })()
      : remark;
    const remarkOut = isSeniorClass ? overallOut : remark;
    let gradeDisplay = String(d.grade ?? '').trim();
    if (
      isOlevelSeniorClassName(reportClassName) &&
      looksLikePrimaryDivisionGrade(gradeDisplay)
    ) {
      const fs = numOrUndef(d.final_score) ?? numOrUndef(d.marks_obtained);
      const tot = Number(d.total_marks ?? 100) || 100;
      if (fs != null) gradeDisplay = calculateGradeOLevel(fs, tot).grade;
    }
    return {
      subject: d.subject,
      topic: d.topic ?? '',
      class_name: d.class_name ?? reportClassName,
      marks_obtained: d.marks_obtained,
      total_marks: d.total_marks,
      grade: gradeDisplay,
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

  let resultsOut: OlevelReportResultRow[] = results;
  if (
    isOlevelSeniorClassName(reportClassName) &&
    expectedOlevelSubjectNames &&
    expectedOlevelSubjectNames.length > 0
  ) {
    resultsOut = mergeOlevelReportResultsWithExpectedSubjects(
      results,
      expectedOlevelSubjectNames,
      examSetName,
      reportClassName,
    );
  } else if (
    isALevelClassName(reportClassName) &&
    expectedAlevelSubjectNames &&
    expectedAlevelSubjectNames.length > 0
  ) {
    resultsOut = mergeOlevelReportResultsWithExpectedSubjects(
      results,
      expectedAlevelSubjectNames,
      examSetName,
      reportClassName,
    );
  }

  const olevelRecalcMeanPct = (() => {
    if (
      !isOlevelSeniorClassName(reportClassName) ||
      !expectedOlevelSubjectNames ||
      expectedOlevelSubjectNames.length === 0
    ) {
      return null;
    }
    return olevelMeanPercentOverExpectedFromMergedRows(resultsOut, expectedOlevelSubjectNames);
  })();
  const summaryDivisionFromOlevelRecalc =
    olevelRecalcMeanPct != null && Number.isFinite(olevelRecalcMeanPct)
      ? calculateDivision(olevelRecalcMeanPct)
      : null;

  const alevelRecalcMeanPct = (() => {
    if (
      !isALevelClassName(reportClassName) ||
      !expectedAlevelSubjectNames ||
      expectedAlevelSubjectNames.length === 0
    ) {
      return null;
    }
    return olevelMeanPercentOverExpectedFromMergedRows(resultsOut, expectedAlevelSubjectNames);
  })();
  const summaryDivisionFromAlevelRecalc =
    alevelRecalcMeanPct != null && Number.isFinite(alevelRecalcMeanPct)
      ? calculateDivision(alevelRecalcMeanPct)
      : null;

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

  let alevel:
    | {
        paperRows?: Array<Record<string, unknown>>;
        principalPasses?: number;
        subsidiaryPasses?: number;
        totalPointsNumerator?: number;
        totalPointsDenominator?: number;
      }
    | undefined;
  if (isALevelClassName(reportClassName)) {
    const assign = teacherClassSubjectAssignments ?? [];
    const clsTrim = String(reportClassName || '').trim();
    const uaceBandsForStudent = uacePercentBandsByClass?.size
      ? uaceBandsForReportClass(clsTrim, uacePercentBandsByClass)
      : undefined;
    const uaceStats = computeAlevelUaceReportStats(
      resultsOut,
      expectedAlevelSubjectNames,
      alevelSubjectRolesForStudent,
      uaceBandsForStudent,
    );
    const paperRows = resultsOut
      .filter((row) => String(row.subject ?? '').trim())
      .map((row) => {
        const r = row as OlevelReportResultRow;
        const missing = r.result_missing_placeholder === true;
        const mo = numOrUndef(r.final_score) ?? numOrUndef(r.marks_obtained);
        const tm = Number(r.total_marks ?? 100) || 100;
        const remark = String(
          (r.overall_remark ?? r.teacher_remark ?? r.remarks ?? r.teacher_comment ?? '') as string,
        ).trim();
        const cls = String(r.class_name ?? reportClassName ?? '').trim();
        const subj = String(r.subject ?? '');
        const fromRoster =
          assign.length > 0 && cls
            ? resolveSubjectTeacherShortNameFromAssignments(assign, cls, subj)
            : null;
        const initialsRaw = (r.teacher_initials as string | null | undefined)?.trim();
        const teacherDisplayName = fromRoster ?? (initialsRaw || null);
        return {
          subjectLabel: String(r.subject ?? ''),
          paperCode: String(
            missing ? '—' : (r.paper_code ?? r.paper_number) != null && String(r.paper_code ?? r.paper_number).trim()
              ? String(r.paper_code ?? r.paper_number)
              : '—',
          ),
          marksPercent:
            missing || mo == null || !Number.isFinite(mo) || tm <= 0 ? null : (mo / tm) * 100,
          gradeDisplay: missing ? '—' : String(r.grade ?? '—'),
          comment: remark,
          teacherDisplayName,
        };
      });
    if (paperRows.length) {
      alevel = { paperRows, ...uaceStats };
    } else {
      alevel = { ...uaceStats };
    }
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
    student_date_of_birth?: string | null;
    student_age_years?: number | string | null;
    total_students_in_class?: number;
    attendance_present_days?: number;
    attendance_absent_days?: number;
    attendance_total_days?: number;
    next_term_begins_date?: string | null;
    student_stream?: string;
    report_date?: string;
  };
  const dobIso =
    frozen.student_date_of_birth != null && String(frozen.student_date_of_birth).trim()
      ? String(frozen.student_date_of_birth).trim().slice(0, 10)
      : null;
  const refIso =
    frozen.report_date != null && String(frozen.report_date).trim()
      ? String(frozen.report_date).trim().slice(0, 10)
      : null;
  const frozenAgeRaw = frozen.student_age_years;
  const frozenAgeNum =
    frozenAgeRaw != null && frozenAgeRaw !== '' ? Number(frozenAgeRaw) : NaN;
  const studentAgeYears =
    !Number.isNaN(frozenAgeNum) && frozenAgeNum >= 0 && frozenAgeNum <= 120
      ? frozenAgeNum
      : studentAgeYearsAtReference(dobIso, refIso);
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
        current_class: reportClassName || firstRecord.class_name,
        admission_number: frozen.admission_number || '',
        profile_photo: firstRecord.student_photo_url ?? null,
        date_of_birth: dobIso,
        age_years: studentAgeYears,
        stream: frozen.student_stream || undefined,
        current_stream: frozen.student_stream || undefined,
        stream_name: frozen.student_stream || undefined,
        next_term_begins_date: frozen.next_term_begins_date || undefined,
        results: resultsOut,
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
          class_teacher_name: String(frozen.class_teacher_name || ''),
          head_teacher_name: String(frozen.head_teacher_name || ''),
        },
        summary: {
          totalMarks: summaryRows.reduce(
            (s, d) => s + (numOrUndef(d.final_score) ?? Number(d.marks_obtained || 0)),
            0,
          ),
          totalPossibleMarks: summaryRows.reduce((s, d) => s + (d.total_marks || 100), 0),
          average: (() => {
            if (olevelRecalcMeanPct != null && Number.isFinite(olevelRecalcMeanPct)) {
              return Math.round(olevelRecalcMeanPct * 100) / 100;
            }
            if (alevelRecalcMeanPct != null && Number.isFinite(alevelRecalcMeanPct)) {
              return Math.round(alevelRecalcMeanPct * 100) / 100;
            }
            const v = firstSummaryRecord.average_percentage;
            if (v === null || v === undefined || v === '') return null;
            const n = Number(v);
            return Number.isNaN(n) ? null : Math.round(n);
          })(),
          aggregate: firstSummaryRecord.aggregate ?? null,
          division:
            summaryDivisionFromOlevelRecalc ??
            summaryDivisionFromAlevelRecalc ??
            firstSummaryRecord.division ??
            null,
          attendancePercentage: firstSummaryRecord.attendance_percentage ?? null,
          classPosition: firstSummaryRecord.position ?? null,
          totalStudents: frozen.total_students_in_class ?? null,
          performanceRemark:
            (summaryDivisionFromOlevelRecalc ??
              summaryDivisionFromAlevelRecalc ??
              firstSummaryRecord.division) ||
            'N/A',
          ...(reportDate && { reportDate }),
          ...(attendanceDetails && { attendanceDetails }),
        },
      },
    ],
  };
  if (alevel) baseReport.alevel = alevel;
  if (isALevelClassName(reportClassName) && alevelGradeRemarksByClass?.size) {
    const cls = String(reportClassName || '').trim();
    let gra = alevelGradeRemarksByClass.get(cls);
    if (!gra && alevelGradeRemarksByClass.size === 1) {
      gra = [...alevelGradeRemarksByClass.values()][0];
    }
    if (gra && Object.keys(gra).length > 0) {
      baseReport.grade_remarks_alevel = gra;
    }
  }
  if (isALevelClassName(reportClassName) && uacePercentBandsByClass?.size) {
    const cls = String(reportClassName || '').trim();
    const bands = uaceBandsForReportClass(cls, uacePercentBandsByClass);
    if (bands?.length) baseReport.uace_percent_bands = bands;
  }
  return baseReport;
}
