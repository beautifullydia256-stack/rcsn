import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { lockSnapshot } from '../../../services/snapshotService';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { Plus, Lock, Trash2, Eye } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchSnapshotsPage(userId: string): Promise<{ schoolId: string; examSets: any[]; snapshots: any[] }> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolId: '', examSets: [], snapshots: [] };

  const [examSetsRes, snapshotsRes] = await Promise.all([
    supabase.from('exam_sets').select('id, name, term, year').eq('school_id', u.school_id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('report_snapshots').select('id, term, year, status, student_count, created_at, locked_at').eq('school_id', u.school_id).order('created_at', { ascending: false }),
  ]);
  return {
    schoolId: u.school_id,
    examSets: examSetsRes.data || [],
    snapshots: snapshotsRes.data || [],
  };
}

export default function SnapshotManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedExamSet, setSelectedExamSet] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'snapshots', user?.id ?? ''],
    queryFn: () => fetchSnapshotsPage(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const examSets = data?.examSets ?? [];
  const snapshots = data?.snapshots ?? [];
  const loading = isLoading;

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['admin', 'snapshots', user?.id] });

  const handleCreateSnapshot = async () => {
    if (!selectedExamSet || !schoolId) {
      setError('Please select an exam set');
      return;
    }

    const examSet = examSets.find((es: any) => es.id === selectedExamSet);
    if (!examSet) {
      setError('Exam set not found');
      return;
    }

    setCreating(true);
    setError('');

    try {
      await createSnapshotFromExamSet(
        schoolId,
        selectedExamSet,
        examSet.term,
        examSet.year
      );
      setShowCreateModal(false);
      setSelectedExamSet('');
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleLockSnapshot = async (snapshotId: string) => {
    try {
      await lockSnapshot(snapshotId);
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to lock snapshot');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;

    try {
      const { error: err } = await supabase
        .from('report_snapshots')
        .delete()
        .eq('id', snapshotId)
        .eq('status', 'draft');

      if (err) throw err;
      refetch();
    } catch (err: any) {
      setError((err as Error).message || 'Failed to delete snapshot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-yellow-400';
      case 'locked':
        return 'text-blue-400';
      case 'generated':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <AdminPageWrapper title="Report Snapshots">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20 flex items-center gap-2 backdrop-blur-xl"
        >
          <Plus className="w-5 h-5" />
          Create Snapshot
        </button>
      </div>

      {error && (
        <div className={`${adminCardClass} p-4 border-red-500/50`}>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className={`${adminCardClass} space-y-4`}>
              <h3 className="text-lg font-semibold text-white">Term {snapshot.term} {snapshot.year}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Status:</span>
                  <span className={`font-semibold ${getStatusColor(snapshot.status)}`}>
                    {snapshot.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Students:</span>
                  <span className="font-semibold text-white">{snapshot.student_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Created:</span>
                  <span className="text-sm text-white/85">
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </span>
                </div>
                {snapshot.locked_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Locked:</span>
                    <span className="text-sm text-white/85">
                      {new Date(snapshot.locked_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t border-white/20">
                {snapshot.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleLockSnapshot(snapshot.id)}
                      className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 flex-1 flex items-center justify-center gap-2 backdrop-blur-xl"
                    >
                      <Lock className="w-4 h-4" />
                      Lock
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 flex-1 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                {snapshot.status === 'locked' && (
                  <button
                    onClick={() => navigate(`/dashboard/admin/reports/bulk?snapshot=${snapshot.id}`)}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 flex-1 flex items-center justify-center gap-2 backdrop-blur-xl"
                  >
                    <Eye className="w-4 h-4" />
                    Generate Reports
                  </button>
                )}
                {snapshot.status === 'generated' && (
                  <button
                    onClick={() => navigate(`/dashboard/admin/reports/viewer?snapshot=${snapshot.id}`)}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 flex-1 flex items-center justify-center gap-2 backdrop-blur-xl"
                  >
                    <Eye className="w-4 h-4" />
                    View Reports
                  </button>
                )}
              </div>
            </div>
          ))}

          {snapshots.length === 0 && (
            <div className={`${adminCardClass} col-span-full text-center py-12`}>
              <p className="text-white/85">No snapshots created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20 mt-4 backdrop-blur-xl"
              >
                Create First Snapshot
              </button>
            </div>
          )}
        </div>
      )}

      <GlassModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedExamSet('');
          setError('');
        }}
        title="Create New Snapshot"
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">Select Exam Set</label>
            <select
              value={selectedExamSet}
              onChange={(e) => setSelectedExamSet(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Exam Set --</option>
              {examSets.map((es) => (
                <option key={es.id} value={es.id}>
                  {es.name} - Term {es.term} {es.year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCreateSnapshot}
              disabled={creating || !selectedExamSet}
              className="rounded-xl border border-blue-500/50 bg-blue-600 px-6 py-3 font-medium text-white flex-1 hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Snapshot'}
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedExamSet('');
                setError('');
              }}
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white flex-1 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassModal>
    </AdminPageWrapper>
  );
}

