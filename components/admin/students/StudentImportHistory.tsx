import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';

export type ImportBatchRow = {
  id: string;
  created_at: string;
  file_name: string;
  students_added_count: number;
  row_error_count: number;
  mode: string;
  class_name: string | null;
  status: string;
  undone_at: string | null;
};

async function fetchBatches(schoolId: string): Promise<ImportBatchRow[]> {
  const { data, error } = await supabase
    .from('student_import_batches')
    .select(
      'id, created_at, file_name, students_added_count, row_error_count, mode, class_name, status, undone_at'
    )
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ImportBatchRow[]) || [];
}

export type StudentImportHistoryProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
};

export function StudentImportHistory({ isOpen, onClose, schoolId }: StudentImportHistoryProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const { data: batches, isLoading, refetch, error } = useQuery({
    queryKey: ['admin', 'student-import-batches', schoolId, user?.id],
    queryFn: () => fetchBatches(schoolId),
    enabled: isOpen && !!schoolId,
  });

  if (!isOpen) return null;

  const handleUndo = async (b: ImportBatchRow) => {
    if (b.status === 'undone') return;
    const live = await supabase
      .from('students')
      .select('student_id', { count: 'exact', head: true })
      .eq('import_batch_id', b.id);
    const n = live.count ?? b.students_added_count;
    const ok = window.confirm(
      `Are you sure you want to undo this import?\n\n` +
        `${n} student record(s) from this batch will be removed. Existing students from other sources are not affected.`
    );
    if (!ok) return;
    setUndoingId(b.id);
    try {
      const { error: rpcErr } = await supabase.rpc('undo_student_import_batch', { p_batch_id: b.id });
      if (rpcErr) throw new Error(rpcErr.message);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(user?.id ?? '') });
      await refetch();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Undo failed');
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="ac-glass-card w-full max-w-4xl max-h-[min(90vh,800px)] overflow-hidden rounded-2xl border border-[var(--ac-border)] flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="text-lg font-semibold ac-text-primary">Import history</h2>
          <button type="button" onClick={onClose} className="text-sm ac-text-muted hover:ac-text-primary">
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {isLoading && <p className="ac-text-secondary text-sm">Loading…</p>}
          {error && <p className="text-rose-600 text-sm">{(error as Error).message}</p>}
          {!isLoading && batches && batches.length === 0 && (
            <p className="ac-text-secondary text-sm">No imports yet.</p>
          )}
          {batches && batches.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--ac-border)] ac-text-muted">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">File</th>
                    <th className="text-left p-2">Mode</th>
                    <th className="text-left p-2">Class</th>
                    <th className="text-right p-2">Added</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Batch ID</th>
                    <th className="text-right p-2"> </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--ac-border)] ac-text-secondary">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="p-2 max-w-[140px] truncate" title={b.file_name}>
                        {b.file_name || '—'}
                      </td>
                      <td className="p-2">{b.mode === 'full_school' ? 'Full school' : 'Specific class'}</td>
                      <td className="p-2 max-w-[120px] truncate" title={b.class_name || ''}>
                        {b.class_name || '—'}
                      </td>
                      <td className="p-2 text-right">{b.students_added_count}</td>
                      <td className="p-2">
                        {b.status === 'undone' ? (
                          <span className="text-amber-600">Undone</span>
                        ) : (
                          <span className="text-emerald-600">Active</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs break-all max-w-[100px]">{b.id.slice(0, 8)}…</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          disabled={b.status === 'undone' || undoingId === b.id}
                          onClick={() => void handleUndo(b)}
                          className="text-rose-600 hover:underline text-xs font-medium disabled:opacity-40"
                        >
                          {undoingId === b.id ? '…' : 'Undo import'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
