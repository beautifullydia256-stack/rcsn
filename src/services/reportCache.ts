import { supabase } from '../lib/supabase';
import { useCacheStore } from '../store/cacheStore';

/**
 * Get cached report from generated_reports table
 * 
 * CRITICAL: This function ONLY retrieves cached reports.
 * It NEVER generates reports or triggers generation.
 * Reports must be generated first using bulk generation.
 */
export async function getCachedReport(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<any | null> {
  // 1. Check in-memory cache first
  const cacheKey = `report:${snapshotId}:${studentId}:${templateId || 'default'}`;
  const cache = useCacheStore.getState();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 2. Check database cache (generated_reports table)
  let query = supabase
    .from('generated_reports')
    .select('report_data')
    .eq('snapshot_id', snapshotId)
    .eq('student_id', studentId);

  if (templateId) {
    query = query.eq('template_id', templateId);
  } else {
    query = query.is('template_id', null);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  if (data?.report_data) {
    // Cache in memory for faster subsequent access
    cache.set(cacheKey, data.report_data, 3600000); // 1 hour
    return data.report_data;
  }

  return null;
}

/**
 * Invalidate cache for a snapshot
 */
export function invalidateSnapshotCache(snapshotId: string): void {
  const cache = useCacheStore.getState();
  // Clear all reports for this snapshot
  // In a real implementation, you'd track cache keys per snapshot
  cache.clear();
}

/**
 * Preload reports for a class
 */
export async function preloadClassReports(
  snapshotId: string,
  classNames: string[]
): Promise<void> {
  // Get all students in these classes
  const { data: students } = await supabase
    .from('students')
    .select('student_id, current_class')
    .in('current_class', classNames);

  if (!students) return;

  // Preload reports for each student
  const preloadPromises = students.map((student) =>
    getCachedReport(snapshotId, student.student_id)
  );

  await Promise.all(preloadPromises);
}

