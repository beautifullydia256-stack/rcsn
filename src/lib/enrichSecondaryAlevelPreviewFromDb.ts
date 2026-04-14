/**
 * After `generate-report-preview`, re-align A-Level (Senior 5–6) `students[0].results` and
 * `report_data.alevel.paperRows` with `exam_results_for_secondary_report` (Postgres merge of
 * multi-paper subjects). This fixes stale Edge bundles or cache where Biology still appears as
 * Paper 1 + Paper 2 instead of one weighted row.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isALevelClass } from '../components/reports/templates/helpers';
import { parseUaceBandsFromDb, resolveUaceBandsForClass, type UacePercentBand } from './uaceGradeBands';
import { calculateDivision } from './reportUtils';
import { computeOlevelMeanPercentOverExpectedFromResultRows } from './olevelReportAverage';
import {
  OLEVEL_MISSING_RESULTS_DESCRIPTOR,
  OLEVEL_MISSING_RESULTS_REMARK,
} from './secondaryOlevelReportCopy';
import {
  fetchTeacherClassSubjectAssignments,
  resolveSubjectTeacherShortName,
  type TeacherClassSubjectAssignment,
} from './secondarySubjectTeacherDisplay';
import {
  fetchReportSignatureTeacherNames,
  resolveSecondaryCommentsForPreviewAverage,
} from './secondaryPreviewCommentsFromDb';

type ResultRow = Record<string, unknown>;

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

function olevelSeniorBandNumber(className: string | null | undefined): number | null {
  const c = String(className || '').trim();
  const m = c.match(/^senior\s*([1-4])(?:\s|$)|^s\.?\s*([1-4])(?:\s|$)/i);
  if (!m) return null;
  return parseInt(m[1] || m[2], 10);
}

/** Same as Edge `expandOlevelClassNamesForSubjectsQuery` (Senior 1–4 aliases). */
function expandClassNamesForExamQuery(names: string[]): string[] {
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

function isMidTermName(name: string | null | undefined): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
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

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mergeResultsWithExpectedOrdered(
  results: ResultRow[],
  expectedOrdered: string[],
  examSetName: string,
  placeholderClassName?: string,
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
    class_name: placeholderClassName,
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

function examResultRowToAlevelResultRow(
  row: Record<string, unknown>,
  examSetName: string,
): ResultRow {
  const overallRaw =
    row.overall_remark != null && String(row.overall_remark).trim() !== ''
      ? String(row.overall_remark).trim()
      : '';
  const remarksRaw = row.remarks != null && String(row.remarks).trim() !== '' ? String(row.remarks).trim() : '';
  const overallOut = overallRaw || remarksRaw;
  const finalScore = numOrUndef(row.final_score) ?? null;
  const mo = numOrUndef(row.marks_obtained);
  const gradeDisplay = String(row.grade ?? '').trim();
  return {
    subject: row.subject,
    topic: row.topic != null ? String(row.topic) : '',
    marks_obtained: row.marks_obtained,
    total_marks: row.total_marks,
    grade: gradeDisplay,
    remarks: row.remarks,
    teacher_initials: row.teacher_initials,
    teacher_comment: overallOut,
    exam_set_name: examSetName,
    teacher_remark: overallOut,
    overall_remark: overallOut,
    remark: overallOut,
    class_name: row.class_name != null ? String(row.class_name) : undefined,
    final_score: finalScore ?? mo ?? null,
    nursery_skill_performance: undefined,
    activity_score: row.activity_score,
    formative_score: row.formative_score,
    exam_score: row.exam_score,
    descriptor: row.descriptor,
    paper_code: row.paper_code != null ? String(row.paper_code) : '',
    paper_number: row.paper_number != null ? String(row.paper_number) : '',
    continuous_c1: row.continuous_c1,
    continuous_c2: row.continuous_c2,
    c1: row.continuous_c1,
    c2: row.continuous_c2,
  };
}

function buildAlevelPaperRowsFromResults(
  resultsOut: ResultRow[],
  opts?: {
    defaultClassName?: string;
    teacherAssignments?: TeacherClassSubjectAssignment[];
  },
): Array<Record<string, unknown>> {
  const assignments = opts?.teacherAssignments ?? [];
  return resultsOut
    .filter((row) => String(row.subject ?? '').trim())
    .map((row) => {
      const missing = row.result_missing_placeholder === true;
      const mo = numOrUndef(row.final_score) ?? numOrUndef(row.marks_obtained);
      const tm = Number(row.total_marks ?? 100) || 100;
      const remark = String(
        (row.overall_remark ?? row.teacher_remark ?? row.remarks ?? row.teacher_comment ?? '') as string,
      ).trim();
      const pc = row.paper_code != null ? String(row.paper_code).trim() : '';
      const pn = row.paper_number != null ? String(row.paper_number).trim() : '';
      const paperBits = pc || pn;
      const cls = String(row.class_name ?? opts?.defaultClassName ?? '').trim();
      const subj = String(row.subject ?? '');
      const fromRoster =
        assignments.length > 0 && cls
          ? resolveSubjectTeacherShortName(assignments, cls, subj)
          : null;
      const initials = row.teacher_initials != null ? String(row.teacher_initials).trim() : '';
      const teacherDisplayName = fromRoster ?? (initials || null);
      return {
        subjectLabel: String(row.subject ?? ''),
        paperCode: String(missing ? '—' : paperBits ? paperBits : '—'),
        marksPercent:
          missing || mo == null || !Number.isFinite(mo) || tm <= 0 ? null : (mo / tm) * 100,
        gradeDisplay: missing ? '—' : String(row.grade ?? '—'),
        comment: remark,
        teacherDisplayName,
      };
    });
}

async function fetchAlevelExpectedSubjectsByStudentId(
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
    return String(a.subject_name || '').localeCompare(String(b.subject_name || ''), undefined, {
      sensitivity: 'base',
    });
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
    out[sid] = dedupeSubjectNamesPreserveOrder(out[sid]!);
  }
  return out;
}

export type AlevelPreviewEnrichMeta = {
  term: number;
  year: number;
  examSetId: string;
  classNames: string[];
};

export async function enrichSecondaryAlevelPreviewReportsFromDb(
  supabase: SupabaseClient,
  schoolId: string,
  meta: AlevelPreviewEnrichMeta,
  reports: unknown[],
): Promise<unknown[]> {
  if (!Array.isArray(reports) || reports.length === 0) return reports;

  const alevelStudentIds: string[] = [];
  for (const item of reports) {
    const rep = unwrapReportData(item);
    const st = rep?.students as unknown[] | undefined;
    const first = st?.[0] as Record<string, unknown> | undefined;
    if (!first?.student_id) continue;
    if (!isALevelClass(String(first.current_class ?? ''))) continue;
    alevelStudentIds.push(String(first.student_id));
  }
  const uniqueSids = [...new Set(alevelStudentIds)];
  if (!uniqueSids.length) return reports;

  let examSetsForTerm: { id: string; name?: string | null }[] = [];
  try {
    const { data: esRows, error: esErr } = await supabase
      .from('exam_sets')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('term', meta.term)
      .eq('year', meta.year);
    if (esErr) throw new Error(esErr.message);
    examSetsForTerm = (esRows || []) as { id: string; name?: string | null }[];
  } catch (e) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] exam_sets fetch failed', e);
    return reports;
  }

  const baseExamSet = examSetsForTerm.find((es) => es.id === meta.examSetId);
  if (!baseExamSet) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] exam set not found for term/year');
    return reports;
  }

  const examSetIdsToInclude: string[] =
    isMidTermName(baseExamSet.name) && examSetsForTerm.length
      ? [meta.examSetId]
      : examSetsForTerm.map((es) => es.id).filter(Boolean);
  if (examSetIdsToInclude.length === 0) examSetIdsToInclude.push(meta.examSetId);

  const examSetNameById = new Map<string, string>(
    examSetsForTerm.map((es) => [es.id, String(es.name ?? '').trim()]),
  );
  const displayExamSetName = String(baseExamSet.name ?? '').trim();

  const expandedClassNames =
    meta.classNames.length > 0 ? [...new Set(expandClassNamesForExamQuery(meta.classNames))] : meta.classNames;

  let rpcRows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await supabase.rpc('exam_results_for_secondary_report', {
      p_school_id: schoolId,
      p_exam_set_ids: examSetIdsToInclude,
      p_class_names: expandedClassNames.length > 0 ? expandedClassNames : null,
    });
    if (error) throw new Error(error.message);
    rpcRows = (data || []) as Record<string, unknown>[];
  } catch (e) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] RPC failed', e);
    return reports;
  }

  let teacherAssignments: TeacherClassSubjectAssignment[] = [];
  try {
    teacherAssignments = await fetchTeacherClassSubjectAssignments(supabase, schoolId);
  } catch (e) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] teacher_class_subjects fetch failed', e);
  }

  let expectedByStudent: Record<string, string[]> = {};
  try {
    expectedByStudent = await fetchAlevelExpectedSubjectsByStudentId(supabase, schoolId, uniqueSids);
  } catch (e) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] expected subjects fetch failed', e);
  }

  const rpcByStudent = new Map<string, Record<string, unknown>[]>();
  for (const row of rpcRows) {
    const sid = row.student_id != null ? String(row.student_id) : '';
    if (!sid || !uniqueSids.includes(sid)) continue;
    const cid = row.exam_set_id != null ? String(row.exam_set_id) : '';
    if (cid && !examSetIdsToInclude.includes(cid)) continue;
    if (!rpcByStudent.has(sid)) rpcByStudent.set(sid, []);
    rpcByStudent.get(sid)!.push(row);
  }

  const alevelClassLabels = [
    ...new Set(
      reports.flatMap((item) => {
        const r = unwrapReportData(item);
        const studentsArr = r?.students as unknown[] | undefined;
        const st = studentsArr?.[0] as Record<string, unknown> | undefined;
        if (!st?.student_id || !isALevelClass(String(st.current_class ?? ''))) return [];
        const c = String(st.current_class ?? '').trim();
        return c ? [c] : [];
      }),
    ),
  ];
  const prefsByClass = new Map<string, Record<string, string>>();
  const uaceBandsByClass = new Map<string, UacePercentBand[]>();
  try {
    const { data: bandRows, error: bandErr } = await supabase
      .from('school_class_uace_grade_bands')
      .select('class_name, bands')
      .eq('school_id', schoolId);
    if (!bandErr) {
      for (const row of bandRows || []) {
        const rr = row as { class_name?: string; bands?: unknown };
        const cn = String(rr.class_name || '').trim();
        const parsed = parseUaceBandsFromDb(rr.bands);
        if (cn && parsed?.length) uaceBandsByClass.set(cn, parsed);
      }
    }
  } catch (e) {
    console.warn('[enrichSecondaryAlevelPreviewFromDb] school_class_uace_grade_bands', e);
  }

  const expandedPrefLabels = [...new Set(expandClassNamesForExamQuery(alevelClassLabels))];
  if (expandedPrefLabels.length > 0) {
    try {
      const { data: pRows, error: pErr } = await supabase
        .from('teacher_exam_class_prefs')
        .select('class_name, grade_remarks_alevel')
        .eq('school_id', schoolId)
        .in('class_name', expandedPrefLabels);
      if (!pErr) {
        for (const row of pRows || []) {
          const rr = row as { class_name?: string; grade_remarks_alevel?: unknown };
          const cn = String(rr.class_name || '').trim();
          const gra = rr.grade_remarks_alevel;
          if (cn && gra && typeof gra === 'object' && gra !== null && !Array.isArray(gra)) {
            prefsByClass.set(cn, gra as Record<string, string>);
          }
        }
      }
    } catch (e) {
      console.warn('[enrichSecondaryAlevelPreviewFromDb] teacher_exam_class_prefs', e);
    }
  }

  return Promise.all(
    reports.map(async (item) => {
    const rep = unwrapReportData(item);
    if (!rep) return item;
    const students = rep.students as unknown[] | undefined;
    const st = students?.[0] as Record<string, unknown> | undefined;
    if (!st?.student_id || !isALevelClass(String(st.current_class ?? ''))) return item;

    const sid = String(st.student_id);
    const classForPrefs = String(st.current_class ?? '').trim();
    let prefGra = prefsByClass.get(classForPrefs);
    if (!prefGra) {
      for (const alt of expandClassNamesForExamQuery([classForPrefs])) {
        const hit = prefsByClass.get(alt);
        if (hit) {
          prefGra = hit;
          break;
        }
      }
    }
    if (!prefGra && prefsByClass.size === 1) {
      prefGra = [...prefsByClass.values()][0];
    }
    const uaceBands = resolveUaceBandsForClass(classForPrefs, uaceBandsByClass);

    const rawRpc = rpcByStudent.get(sid);
    if (!rawRpc?.length) {
      const prevSummaryEarly = (st.summary as Record<string, unknown> | undefined) ?? {};
      const avgEarly =
        numOrUndef(prevSummaryEarly.average) ?? numOrUndef(st.average as number | undefined);
      const prevCE = (st.comments as Record<string, unknown> | undefined) ?? {};
      let commentsEarly: Record<string, unknown> = { ...prevCE };
      if (
        avgEarly != null &&
        Number.isFinite(avgEarly) &&
        Number.isFinite(meta.term) &&
        Number.isFinite(meta.year) &&
        meta.term > 0 &&
        meta.year > 0
      ) {
        const resolved = await resolveSecondaryCommentsForPreviewAverage(
          supabase,
          schoolId,
          sid,
          classForPrefs,
          meta.term,
          meta.year,
          avgEarly,
        );
        commentsEarly = {
          ...prevCE,
          class_teacher_text: resolved.class_teacher_text,
          class_teacher_comment: resolved.class_teacher_text,
          head_teacher_text: resolved.head_teacher_text,
          headteacher_text: resolved.head_teacher_text,
          head_teacher_comment: resolved.head_teacher_text,
          headteacher_comment: resolved.head_teacher_text,
        };
      }
      const sigEarly = await fetchReportSignatureTeacherNames(supabase, schoolId, classForPrefs);
      commentsEarly = {
        ...commentsEarly,
        class_teacher_name:
          sigEarly.class_teacher_name || String(commentsEarly.class_teacher_name || '').trim(),
        head_teacher_name:
          sigEarly.head_teacher_name || String(commentsEarly.head_teacher_name || '').trim(),
      };
      const nextInner: Record<string, unknown> = {
        ...rep,
        students: [{ ...st, comments: commentsEarly }],
        ...(prefGra && Object.keys(prefGra).length > 0 ? { grade_remarks_alevel: prefGra } : {}),
        ...(uaceBands?.length ? { uace_percent_bands: uaceBands } : {}),
      };
      return wrapIfNeeded(item, nextInner);
    }

    const fromRpc: ResultRow[] = rawRpc.map((row) => {
      const esid = row.exam_set_id != null ? String(row.exam_set_id) : '';
      const esn = (esid && examSetNameById.get(esid)) || displayExamSetName;
      return examResultRowToAlevelResultRow(row, esn);
    });

    const expected = expectedByStudent[sid] ?? [];
    const examSet = rep.examSet as Record<string, unknown> | undefined;
    const examSetName = String(examSet?.name ?? displayExamSetName);
    const resultsOut =
      expected.length > 0
        ? mergeResultsWithExpectedOrdered(fromRpc, expected, examSetName, classForPrefs)
        : fromRpc;

    const recalc =
      expected.length > 0
        ? computeOlevelMeanPercentOverExpectedFromResultRows(resultsOut, expected)
        : null;
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

    const paperRows = buildAlevelPaperRowsFromResults(resultsOut, {
      defaultClassName: classForPrefs,
      teacherAssignments,
    });
    const prevAlevel = (rep.alevel as Record<string, unknown> | undefined) ?? {};
    const nextAlevel =
      paperRows.length > 0 ? { ...prevAlevel, paperRows } : { ...prevAlevel, paperRows: [] };

    const prevComments = (st.comments as Record<string, unknown> | undefined) ?? {};
    let nextComments: Record<string, unknown> = { ...prevComments };
    const avgPct =
      recalc != null && Number.isFinite(recalc)
        ? recalc
        : numOrUndef((summary as Record<string, unknown>).average) ??
          numOrUndef(prevSummary.average);
    if (
      avgPct != null &&
      Number.isFinite(avgPct) &&
      Number.isFinite(meta.term) &&
      Number.isFinite(meta.year) &&
      meta.term > 0 &&
      meta.year > 0
    ) {
      const resolved = await resolveSecondaryCommentsForPreviewAverage(
        supabase,
        schoolId,
        sid,
        classForPrefs,
        meta.term,
        meta.year,
        avgPct,
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
    const sigNames = await fetchReportSignatureTeacherNames(supabase, schoolId, classForPrefs);
    nextComments = {
      ...nextComments,
      class_teacher_name:
        sigNames.class_teacher_name || String(nextComments.class_teacher_name || '').trim(),
      head_teacher_name:
        sigNames.head_teacher_name || String(nextComments.head_teacher_name || '').trim(),
    };

    const nextInner: Record<string, unknown> = {
      ...rep,
      alevel: nextAlevel,
      students: [{ ...st, results: resultsOut, summary, comments: nextComments }],
      ...(prefGra && Object.keys(prefGra).length > 0 ? { grade_remarks_alevel: prefGra } : {}),
      ...(uaceBands?.length ? { uace_percent_bands: uaceBands } : {}),
    };
    return wrapIfNeeded(item, nextInner);
    }),
  );
}
