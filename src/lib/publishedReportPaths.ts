import type { SupabaseClient } from '@supabase/supabase-js';
import { formatSupabaseError } from './supabaseError';

/** Deterministic storage paths for published-reports bucket (must match replace_published_reports_for_scope / patch_published_reports_for_students). */

export function getStudentIdFromPreviewReportData(rd: Record<string, unknown>): string | null {
  const st = rd.students;
  if (!Array.isArray(st) || st.length === 0) return null;
  const sid = (st[0] as { student_id?: string }).student_id;
  return typeof sid === 'string' && sid.length > 0 ? sid : null;
}

export function buildPublishedStudentReportStoragePath(params: {
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  examSetId: string;
  studentId: string;
}): string {
  return `reports/${params.schoolId}/${params.classId}/${params.term}_${params.year}/${params.examSetId}/students/${params.studentId}.pdf`;
}

export function buildPublishedClassBundleStoragePath(params: {
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  examSetId: string;
}): string {
  return `reports/${params.schoolId}/${params.classId}/${params.term}_${params.year}/${params.examSetId}/class_bundle.zip`;
}

export interface PersistPublishedReportsParams {
  supabase: SupabaseClient;
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  examSetId: string;
  studentRows: { student_id: string; storage_object_path: string }[];
  bundlePath: string | null;
  isClassReport: boolean;
}

/**
 * Persists published reports to the database.
 * First tries the transactional RPC (`replace_published_reports_for_scope` or `patch_published_reports_for_students`).
 * If the RPC fails (e.g. 403 / 42501 RLS restriction on database function), automatically falls back to
 * direct table operations on `published_student_reports` and `published_class_report_bundles`.
 */
export async function persistPublishedReports({
  supabase,
  schoolId,
  classId,
  term,
  year,
  examSetId,
  studentRows,
  bundlePath,
  isClassReport,
}: PersistPublishedReportsParams): Promise<{ error: Error | null }> {
  let primaryRpcErr: unknown = null;

  // Step 1: Attempt the atomic database RPC
  try {
    if (isClassReport) {
      const { error } = await supabase.rpc('replace_published_reports_for_scope', {
        p_school_id: schoolId,
        p_class_id: classId,
        p_term: term,
        p_year: year,
        p_exam_set_id: examSetId,
        p_student_rows: studentRows,
        p_bundle_storage_path: bundlePath,
      });
      if (!error) return { error: null };
      primaryRpcErr = error;
    } else {
      const { error } = await supabase.rpc('patch_published_reports_for_students', {
        p_school_id: schoolId,
        p_class_id: classId,
        p_term: term,
        p_year: year,
        p_exam_set_id: examSetId,
        p_student_rows: studentRows,
      });
      if (!error) return { error: null };
      primaryRpcErr = error;
    }
  } catch (rpcCatchErr) {
    primaryRpcErr = rpcCatchErr;
  }

  console.warn(
    `[persistPublishedReports] Primary publish RPC failed (${isClassReport ? 'replace_published_reports_for_scope' : 'patch_published_reports_for_students'}), attempting direct upsert fallback...`,
    primaryRpcErr
  );

  // Step 2: Resilient client-side fallback using direct table operations
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id ?? null;
    const now = new Date().toISOString();

    if (isClassReport) {
      await supabase
        .from('published_student_reports')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('term', term)
        .eq('year', year)
        .eq('exam_set_id', examSetId);

      try {
        await supabase
          .from('published_class_report_bundles')
          .delete()
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('year', year)
          .eq('exam_set_id', examSetId);
      } catch {
        // Non-critical if bundle table lacks delete policy
      }
    } else {
      // Invalidate existing class zip bundle so stale full-class downloads aren't served
      try {
        await supabase
          .from('published_class_report_bundles')
          .delete()
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('year', year)
          .eq('exam_set_id', examSetId);
      } catch {
        // Non-critical
      }
    }

    if (studentRows.length > 0) {
      const dbRows = studentRows.map((sr) => ({
        school_id: schoolId,
        class_id: classId,
        term,
        year,
        exam_set_id: examSetId,
        student_id: sr.student_id,
        storage_bucket: 'published-reports',
        storage_object_path: sr.storage_object_path,
        published_by: currentUserId,
        published_at: now,
      }));

      const { error: upsertErr } = await supabase
        .from('published_student_reports')
        .upsert(dbRows, {
          onConflict: 'school_id,class_id,term,year,exam_set_id,student_id',
        });

      if (upsertErr) {
        console.error('[persistPublishedReports] Direct upsert fallback failed:', upsertErr);
        throw upsertErr;
      }
    }

    if (isClassReport && bundlePath) {
      try {
        await supabase.from('published_class_report_bundles').insert({
          school_id: schoolId,
          class_id: classId,
          term,
          year,
          exam_set_id: examSetId,
          storage_bucket: 'published-reports',
          storage_object_path: bundlePath,
          published_by: currentUserId,
          published_at: now,
        });
      } catch (bErr) {
        console.warn('[persistPublishedReports] Class bundle row insert failed:', bErr);
      }
    }

    console.info('[persistPublishedReports] Direct fallback save succeeded.');
    return { error: null };
  } catch (fallbackCatchErr) {
    console.error('[persistPublishedReports] Both RPC and direct fallback failed:', fallbackCatchErr);
    const finalErr = primaryRpcErr || fallbackCatchErr;
    return {
      error: finalErr instanceof Error ? finalErr : new Error(formatSupabaseError(finalErr)),
    };
  }
}
