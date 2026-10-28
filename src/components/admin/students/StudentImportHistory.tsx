import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import NativeModal from '@/components/NativeModal';

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
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Import History"
      subtitle="Audit log of batch enrollments and rollbacks"
      icon={History}
      size="2xl"
      variant="government"
    >
      <div className="space-y-4 text-xs text-slate-900 font-sans flex flex-col">
        {isLoading && <p className="text-slate-500">Loading history records...</p>}
        {error && <p className="text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{(error as Error).message}</p>}
        {!isLoading && batches && batches.length === 0 && (
          <p className="text-slate-500 text-center py-8 bg-slate-50 border border-slate-200 rounded-xl">No spreadsheet imports found.</p>
        )}
        {batches && batches.length > 0 && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="min-w-full text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold text-[11px]">
                  <th className="text-left p-2.5 border-r border-slate-200">Date</th>
                  <th className="text-left p-2.5 border-r border-slate-200">File Name</th>
                  <th className="text-left p-2.5 border-r border-slate-200">Mode</th>
                  <th className="text-left p-2.5 border-r border-slate-200">Class</th>
                  <th className="text-right p-2.5 border-r border-slate-200">Added</th>
                  <th className="text-left p-2.5 border-r border-slate-200">Status</th>
                  <th className="text-left p-2.5 border-r border-slate-200">Batch Code</th>
                  <th className="text-right p-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-2.5 whitespace-nowrap text-slate-600 border-r border-slate-200">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2.5 max-w-[140px] truncate text-slate-900 font-medium border-r border-slate-200" title={b.file_name}>
                      {b.file_name || '—'}
                    </td>
                    <td className="p-2.5 text-slate-600 border-r border-slate-200">{b.mode === 'full_school' ? 'Full school' : 'Specific class'}</td>
                    <td className="p-2.5 max-w-[120px] truncate text-slate-600 border-r border-slate-200" title={b.class_name || ''}>
                      {b.class_name || '—'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900 border-r border-slate-200">{b.students_added_count}</td>
                    <td className="p-2.5 border-r border-slate-200">
                      {b.status === 'undone' ? (
                        <span className="inline-flex px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                          Undone
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-500 border-r border-slate-200">{b.id.slice(0, 8)}…</td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        disabled={b.status === 'undone' || undoingId === b.id}
                        onClick={() => void handleUndo(b)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-40 shadow-sm"
                      >
                        <RotateCcw className="w-3 h-3 mr-1 inline" />
                        <span>{undoingId === b.id ? '…' : 'Rollback'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
