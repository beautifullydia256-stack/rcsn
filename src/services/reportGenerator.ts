import { supabase } from '../lib/supabase';
import { transformSnapshotToReportFormat } from './reportDataTransformer';

/**
 * Get cached report from generated_reports table
 * 
 * CRITICAL: This function ONLY retrieves cached reports.
 * It NEVER generates reports or does calculations.
 * Reports must be generated first using bulk generation.
 */
export async function getCachedReport(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<any | null> {
  // Check cache first
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

  return data?.report_data || null;
}

/**
 * DEPRECATED: Use getCachedReport instead
 * This function is kept for backward compatibility but should not be used
 * for new code. Reports must be generated via bulk generation first.
 */
export async function generateReportFromSnapshot(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<any> {
  // First check cache
  const cached = await getCachedReport(snapshotId, studentId, templateId);
  if (cached) {
    return cached;
  }

  // If not cached, transform from snapshot (for viewing draft snapshots)
  // But this should rarely happen - reports should be generated first
  return transformSnapshotToReportFormat(snapshotId, studentId);
}

/**
 * Trigger bulk report generation via Edge Function
 * 
 * This function calls the server-side Edge Function for bulk generation.
 * All actual generation happens server-side.
 */
export async function triggerBulkGeneration(
  snapshotId: string,
  templateId?: string,
  classNames?: string[],
  studentIds?: string[]
): Promise<{ success: boolean; generatedCount?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-reports-bulk', {
      body: {
        snapshotId,
        templateId,
        classNames,
        studentIds,
      },
    });

    if (error) throw error;

    return {
      success: data?.success || false,
      generatedCount: data?.generatedCount,
      error: data?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Bulk generation failed',
    };
  }
}

/**
 * DEPRECATED: Use triggerBulkGeneration instead
 * This client-side function is kept for backward compatibility
 * but should use Edge Function for actual generation.
 */
export async function bulkGenerateReports(
  snapshotId: string,
  templateId?: string,
  onProgress?: (progress: number, total: number) => void
): Promise<string[]> {
  // Call Edge Function instead
  const result = await triggerBulkGeneration(snapshotId, templateId);
  
  if (!result.success) {
    throw new Error(result.error || 'Bulk generation failed');
  }

  // Return empty array - actual IDs are stored in database
  return [];
}

