// Utility functions for managing exam results consistency

import { supabase } from './supabase';

export interface MissedExamRecord {
  school_id: string;
  exam_set_id: string;
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  remarks: string;
}

/**
 * Creates "missed exam" records for a new student when their class already has exam results
 */
export async function createMissedExamRecordsForNewStudent(
  schoolId: string,
  studentId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  try {
    // Check if this class has any existing exam results
    const { data: existingResults } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className)
      .limit(1);

    if (!existingResults || existingResults.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get all unique exam sets and subjects for this class
    const { data: classExamData } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className);

    if (!classExamData || classExamData.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get unique combinations of exam_set_id and subject
    // Use '|||' delimiter since '-' appears in UUIDs and subject names
    const uniqueExams = Array.from(
      new Set(classExamData.map(item => `${item.exam_set_id}|||${item.subject}`))
    ).map(combo => {
      const idx = combo.indexOf('|||');
      const exam_set_id = combo.slice(0, idx);
      const subject = combo.slice(idx + 3);
      return { exam_set_id, subject };
    });

    // Create "missed exam" records (0 marks) for the new student
    const missedExamRecords: MissedExamRecord[] = uniqueExams.map(exam => ({
      school_id: schoolId,
      exam_set_id: exam.exam_set_id,
      student_id: studentId,
      class_name: className,
      subject: exam.subject,
      marks_obtained: 0,
      total_marks: 100,
      grade: 'E',
      remarks: 'Missed exam - student added after exam period'
    }));

    if (missedExamRecords.length > 0) {
      const { error: examInsertError } = await supabase
        .from('exam_results')
        .insert(missedExamRecords);

      if (examInsertError) {
        return { 
          success: false, 
          recordsCreated: 0, 
          error: `Failed to create missed exam records: ${examInsertError.message}` 
        };
      }

      return { success: true, recordsCreated: missedExamRecords.length };
    }

    return { success: true, recordsCreated: 0 };
  } catch (error) {
    return { 
      success: false, 
      recordsCreated: 0, 
      error: `Error creating missed exam records: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Backfills missing exam results for existing students in a class
 * This ensures all students in a class have exam records if any student has results
 */
export async function backfillMissingExamResultsForClass(
  schoolId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  try {
    // Get all students in this class
    const { data: students } = await supabase
      .from('students')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('current_class', className)
      .eq('status', 'active');

    if (!students || students.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get all unique exam sets and subjects for this class
    const { data: classExamData } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className);

    if (!classExamData || classExamData.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get unique combinations of exam_set_id and subject
    // Use '|||' delimiter since '-' appears in UUIDs and subject names
    const uniqueExams = Array.from(
      new Set(classExamData.map(item => `${item.exam_set_id}|||${item.subject}`))
    ).map(combo => {
      const idx = combo.indexOf('|||');
      const exam_set_id = combo.slice(0, idx);
      const subject = combo.slice(idx + 3);
      return { exam_set_id, subject };
    });

    let totalRecordsCreated = 0;

    // For each student, check if they have all exam records
    for (const student of students) {
      const { data: existingStudentResults } = await supabase
        .from('exam_results')
        .select('exam_set_id, subject')
        .eq('school_id', schoolId)
        .eq('student_id', student.student_id);

      if (!existingStudentResults) continue;

      // Find missing exam combinations for this student
      const comboSep = '|||';
      const existingCombinations = new Set(
        existingStudentResults.map(item => `${item.exam_set_id}${comboSep}${item.subject}`)
      );

      const missingExams = uniqueExams.filter(
        exam => !existingCombinations.has(`${exam.exam_set_id}${comboSep}${exam.subject}`)
      );

      if (missingExams.length > 0) {
        // Create "missed exam" records for missing combinations
        const missedExamRecords: MissedExamRecord[] = missingExams.map(exam => ({
          school_id: schoolId,
          exam_set_id: exam.exam_set_id,
          student_id: student.student_id,
          class_name: className,
          subject: exam.subject,
          marks_obtained: 0,
          total_marks: 100,
          grade: 'E',
          remarks: 'Missed exam - backfilled for consistency'
        }));

        const { error: examInsertError } = await supabase
          .from('exam_results')
          .insert(missedExamRecords);

        if (examInsertError) {
          console.error(`Failed to backfill exam records for student ${student.student_id}:`, examInsertError);
        } else {
          totalRecordsCreated += missedExamRecords.length;
        }
      }
    }

    return { success: true, recordsCreated: totalRecordsCreated };
  } catch (error) {
    return { 
      success: false, 
      recordsCreated: 0, 
      error: `Error backfilling missing exam results: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Ensures exam results consistency for a class
 * This is the main function that should be called to maintain consistency
 */
export async function ensureExamResultsConsistency(
  schoolId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  return await backfillMissingExamResultsForClass(schoolId, className);
}

/**
 * Readable message from Supabase/PostgREST client errors (saves use HTTPS, not Realtime WebSockets).
 */
export function formatSupabaseCallError(
  err: { message?: string; details?: string; hint?: string; code?: string } | null | undefined,
): string {
  if (!err || typeof err !== 'object') return 'Request failed.';
  const msg = typeof err.message === 'string' ? err.message.trim() : '';
  const details = typeof err.details === 'string' ? err.details.trim() : '';
  const hint = typeof err.hint === 'string' ? err.hint.trim() : '';
  const code = typeof err.code === 'string' ? err.code.trim() : '';
  const parts: string[] = [];
  if (msg) parts.push(msg);
  if (details) parts.push(details);
  if (hint) parts.push(`Hint: ${hint}`);
  if (code) parts.push(`[${code}]`);
  return parts.length > 0 ? parts.join(' — ') : 'Request failed.';
}

/** Some RPCs return `{ error: string }` in the JSON body with HTTP 200 — treat as failure. */
export function throwIfRpcReturnedJsonError(data: unknown): void {
  if (data == null || typeof data !== 'object') return;
  const o = data as Record<string, unknown>;
  if (typeof o.error === 'string' && o.error.trim().length > 0) {
    throw new Error(o.error.trim());
  }
}

/**
 * Known teacher upsert RPCs return `{ success: true, ... }` on OK, or `{ error: string }` on failure.
 * PostgREST often still returns HTTP 200 — check `data`, not only `resp.error`.
 */
export function assertTeacherUpsertRpcResult(data: unknown): void {
  throwIfRpcReturnedJsonError(data);
  if (data == null || typeof data !== 'object') {
    throw new Error('No response from server. Nothing was saved.');
  }
  const o = data as Record<string, unknown>;
  if (o.success !== true) {
    throw new Error('Save was not confirmed. Nothing was saved.');
  }
}

/** One `exam_results` row (O-Level secondary line); used when picking a row per student for the teacher grid. */
export type SecondaryOlevelExamResultRow = {
  student_id: string;
  topic?: string | null;
  exam_topic_key?: string | null;
  activity_score?: unknown;
  formative_score?: unknown;
  exam_score?: unknown;
  final_score?: unknown;
  marks_obtained?: unknown;
  descriptor?: string | null;
  grade?: string | null;
  overall_remark?: string | null;
  teacher_initials?: string | null;
  updated_at?: string | null;
};

export function trimSecondaryOlevelTopicFilter(v: unknown): string {
  return String(v ?? '').trim();
}

function secondaryOlevelRowMatchesTopicFilter(row: SecondaryOlevelExamResultRow, topicFilter: string): boolean {
  const tf = trimSecondaryOlevelTopicFilter(topicFilter);
  if (tf === '') return true;
  const t = trimSecondaryOlevelTopicFilter(row.topic);
  const ek = trimSecondaryOlevelTopicFilter(row.exam_topic_key);
  return t === tf || ek === tf;
}

export function secondaryOlevelRowDataCompleteness(row: SecondaryOlevelExamResultRow): number {
  let s = 0;
  const nz = (v: unknown) => v != null && String(v).trim() !== '';
  if (nz(row.activity_score)) s += 2;
  if (nz(row.formative_score)) s += 2;
  if (nz(row.exam_score)) s += 2;
  if (nz(row.final_score)) s += 1;
  if (nz(row.marks_obtained)) s += 1;
  return s;
}

/** Normalize stored descriptor (older rows may still say Missed). */
export function normalizeOlevelDescriptorFromDb(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.toLowerCase() === 'missed') return 'Basic';
  return s;
}

/** When several line-key rows exist per student, keep the row that matches the global topic filter or the most complete / newest. */
export function secondaryOlevelDescriptorFromActivity(activityScore: number): string {
  if (!Number.isFinite(activityScore)) return '';
  if (activityScore < 1) return 'Basic';
  if (activityScore < 2.5) return 'Moderate';
  return 'Outstanding';
}

export function pickBestSecondaryOlevelExamRow(
  rows: SecondaryOlevelExamResultRow[],
  topicFilter: string,
): SecondaryOlevelExamResultRow | null {
  if (!rows.length) return null;
  const filtered = rows.filter((r) => secondaryOlevelRowMatchesTopicFilter(r, topicFilter));
  const candidates = filtered.length > 0 ? filtered : rows;
  const sorted = [...candidates].sort((a, b) => {
    const ds = secondaryOlevelRowDataCompleteness(b) - secondaryOlevelRowDataCompleteness(a);
    if (ds !== 0) return ds;
    const ta = new Date(a.updated_at || 0).getTime();
    const tb = new Date(b.updated_at || 0).getTime();
    return tb - ta;
  });
  return sorted[0] ?? null;
}

export function buildSecondaryOlevelExamResultsMapFromRows(
  rows: SecondaryOlevelExamResultRow[],
  topicFilter: string,
): Record<
  string,
  {
    topic: string;
    activityScore: string;
    descriptor: string;
    formative: string;
    exam: string;
    final: string;
    grade: string;
    remark: string;
    initials: string;
  }
> {
  const byStudent = new Map<string, SecondaryOlevelExamResultRow[]>();
  for (const r of rows) {
    const sid = r.student_id;
    if (!sid) continue;
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid)!.push(r);
  }
  const map: Record<
    string,
    {
      topic: string;
      activityScore: string;
      descriptor: string;
      formative: string;
      exam: string;
      final: string;
      grade: string;
      remark: string;
      initials: string;
    }
  > = {};
  for (const [sid, list] of byStudent) {
    const r = pickBestSecondaryOlevelExamRow(list, topicFilter);
    if (!r) continue;
    const activity = r.activity_score != null && r.activity_score !== '' ? Number(r.activity_score) : NaN;
    const descriptor =
      r.descriptor != null && String(r.descriptor).trim() !== ''
        ? normalizeOlevelDescriptorFromDb(String(r.descriptor).trim())
        : Number.isFinite(activity)
          ? secondaryOlevelDescriptorFromActivity(activity)
          : '';
    map[sid] = {
      topic: r.topic != null ? String(r.topic) : '',
      activityScore: r.activity_score != null && r.activity_score !== '' ? String(r.activity_score) : '',
      descriptor,
      formative: r.formative_score != null && r.formative_score !== '' ? String(r.formative_score) : '',
      exam: r.exam_score != null && r.exam_score !== '' ? String(r.exam_score) : '',
      final: r.final_score != null && r.final_score !== '' ? String(r.final_score) : '',
      grade: r.grade != null ? String(r.grade) : '',
      remark: r.overall_remark != null ? String(r.overall_remark) : '',
      initials: r.teacher_initials != null ? String(r.teacher_initials) : '',
    };
  }
  return map;
}
