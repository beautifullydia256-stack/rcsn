/**
 * Pre-generated report PDF cache.
 *
 * When the admin views a report preview, PDFs are generated in the background
 * and stored in Supabase Storage under the `published-reports` bucket with a
 * `pdf-cache/` prefix.  Download is then a signed-URL fetch — no Puppeteer.
 *
 * Cache key: school_id + student_id + class_name + term + year + exam_set_id + template_key
 * TTL: 48 hours (stale entries regenerate on next download or background pass).
 */

import { supabase } from './supabase';

const CACHE_BUCKET = 'published-reports';
const CACHE_PREFIX = 'pdf-cache';
const CACHE_TTL_HOURS = 48;

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function buildCachePath(
  schoolId: string,
  className: string,
  term: number,
  year: number,
  examSetId: string,
  studentId: string,
  templateKey: string,
): string {
  const cls = className.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const tKey = (templateKey || 'default').slice(0, 30);
  return `${CACHE_PREFIX}/${schoolId}/${cls}/${term}_${year}/${examSetId}/${studentId}_${tKey}.pdf`;
}

function staleCutoff(): string {
  const d = new Date();
  d.setHours(d.getHours() - CACHE_TTL_HOURS);
  return d.toISOString();
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Returns a map of studentId → storagePath for all non-stale cache entries
 * matching the given class/term/examSet/templateKey.
 */
export async function lookupCachedPdfs(
  schoolId: string,
  className: string,
  term: number,
  year: number,
  examSetId: string,
  templateKey: string,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('report_pdf_cache')
    .select('student_id, storage_path')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('term', term)
    .eq('year', year)
    .eq('exam_set_id', examSetId)
    .eq('template_key', templateKey || 'default')
    .gte('generated_at', staleCutoff());

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.student_id as string, row.storage_path as string);
  }
  return map;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Uploads a PDF blob to Storage and records the path in report_pdf_cache.
 * Returns the storage path on success, null on failure.
 */
export async function saveToPdfCache(
  schoolId: string,
  studentId: string,
  className: string,
  term: number,
  year: number,
  examSetId: string,
  templateKey: string,
  blob: Blob,
): Promise<string | null> {
  const path = buildCachePath(schoolId, className, term, year, examSetId, studentId, templateKey);

  const { error: upErr } = await supabase.storage
    .from(CACHE_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'application/pdf' });

  if (upErr) return null;

  await supabase.from('report_pdf_cache').upsert(
    {
      school_id:    schoolId,
      student_id:   studentId,
      class_name:   className,
      term,
      year,
      exam_set_id:  examSetId,
      template_key: templateKey || 'default',
      storage_path: path,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id,student_id,class_name,term,year,exam_set_id,template_key' },
  );

  return path;
}

// ─── Retrieve ─────────────────────────────────────────────────────────────────

/** Returns a 5-minute signed URL for a cached PDF, or null on failure. */
export async function getSignedCacheUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(CACHE_BUCKET)
    .createSignedUrl(storagePath, 300);
  return data?.signedUrl ?? null;
}

/** Downloads a cached PDF as a Blob (used to re-upload to the published path). */
export async function downloadCachedBlob(storagePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(CACHE_BUCKET).download(storagePath);
  if (error || !data) return null;
  return data;
}

// ─── Invalidate ───────────────────────────────────────────────────────────────

/**
 * Deletes all cache entries for a class+term+examSet.
 * Call this when the template for a class changes so the next preview
 * triggers a fresh background generation with the new template.
 */
export async function invalidateClassPdfCache(
  schoolId: string,
  className: string,
  term: number,
  year: number,
  examSetId: string,
): Promise<void> {
  // Fetch storage paths so we can delete the files too
  const { data: rows } = await supabase
    .from('report_pdf_cache')
    .select('storage_path')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('term', term)
    .eq('year', year)
    .eq('exam_set_id', examSetId);

  const paths = (rows ?? []).map((r) => r.storage_path as string).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(CACHE_BUCKET).remove(paths);
  }

  await supabase
    .from('report_pdf_cache')
    .delete()
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('term', term)
    .eq('year', year)
    .eq('exam_set_id', examSetId);
}
