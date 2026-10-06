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
    >
      <div className="p-6 space-y-4 text-xs text-white flex flex-col max-h-[75vh] overflow-y-auto no-scrollbar">
        {isLoading && <p className="text-white/60">Loading history records...</p>}
        {error && <p className="text-rose-400">{(error as Error).message}</p>}
        {!isLoading && batches && batches.length === 0 && (
          <p className="text-white/50 text-center py-8">No spreadsheet imports found.</p>
        )}
        {batches && batches.length > 0 && (
          <div className="overflow-x-auto border border-white/15 rounded-2xl bg-black/20 no-scrollbar">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-white/60 uppercase font-bold tracking-wider text-[10px]">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">File Name</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-left p-3">Class</th>
                  <th className="text-right p-3">Added</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Batch Code</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 whitespace-nowrap text-white/80">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 max-w-[140px] truncate text-white font-medium" title={b.file_name}>
                      {b.file_name || '—'}
                    </td>
                    <td className="p-3 text-white/70">{b.mode === 'full_school' ? 'Full school' : 'Specific class'}</td>
                    <td className="p-3 max-w-[120px] truncate text-white/70" title={b.class_name || ''}>
                      {b.class_name || '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-white">{b.students_added_count}</td>
                    <td className="p-3">
                      {b.status === 'undone' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Undone
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-white/50">{b.id.slice(0, 8)}…</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={b.status === 'undone' || undoingId === b.id}
                        onClick={() => void handleUndo(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-semibold text-[11px] transition-all disabled:opacity-40"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{undoingId === b.id ? '…' : 'Undo'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-3 border-t border-white/15 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
          >
            Close
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
