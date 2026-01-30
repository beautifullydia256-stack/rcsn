import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { useSnapshots } from '../../../hooks/useSnapshot';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { lockSnapshot } from '../../../services/snapshotService';
import { GlassCard } from '../../../components/Glass/GlassCard';
import { GlassPanel } from '../../../components/Glass/GlassPanel';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { Plus, Lock, Trash2, Eye } from 'lucide-react';

export default function SnapshotManager() {
  const { user } = useAuthStore();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [examSets, setExamSets] = useState<any[]>([]);
  const [selectedExamSet, setSelectedExamSet] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  const { snapshots, loading, refetch } = useSnapshots(schoolId || '');

  useEffect(() => {
    const fetchSchoolId = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (data?.school_id) {
        setSchoolId(data.school_id);
      }
    };

    fetchSchoolId();
  }, [user]);

  useEffect(() => {
    const fetchExamSets = async () => {
      if (!schoolId) return;

      const { data } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) {
        setExamSets(data);
      }
    };

    fetchExamSets();
  }, [schoolId]);

  const handleCreateSnapshot = async () => {
    if (!selectedExamSet || !schoolId) {
      setError('Please select an exam set');
      return;
    }

    const examSet = examSets.find((es) => es.id === selectedExamSet);
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
      const { error } = await supabase
        .from('report_snapshots')
        .delete()
        .eq('id', snapshotId)
        .eq('status', 'draft'); // Only allow deleting draft snapshots

      if (error) throw error;
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to delete snapshot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-yellow-600';
      case 'locked':
        return 'text-blue-600';
      case 'generated':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Report Snapshots</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass glass-rounded px-6 py-3 font-medium transition-all duration-300 flex items-center gap-2 hover:glass-hover"
          >
            <Plus className="w-5 h-5" />
            Create Snapshot
          </button>
      </div>

      {error && (
        <GlassPanel variant="normal" className="p-4">
          <p className="text-red-500">{error}</p>
        </GlassPanel>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((snapshot) => (
            <GlassCard
              key={snapshot.id}
              title={`Term ${snapshot.term} ${snapshot.year}`}
              subtitle={`Status: ${snapshot.status}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={`font-semibold ${getStatusColor(snapshot.status)}`}>
                    {snapshot.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Students:</span>
                  <span className="font-semibold">{snapshot.student_count || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </span>
                </div>

                {snapshot.locked_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Locked:</span>
                    <span className="text-sm">
                      {new Date(snapshot.locked_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/20">
                  {snapshot.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleLockSnapshot(snapshot.id)}
                        className="glass glass-rounded px-4 py-2 font-medium transition-all duration-300 flex-1 flex items-center justify-center gap-2 text-sm hover:glass-hover"
                      >
                        <Lock className="w-4 h-4" />
                        Lock
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="glass glass-rounded px-4 py-2 font-medium transition-all duration-300 flex-1 flex items-center justify-center gap-2 text-sm text-red-500 hover:glass-hover"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                  {snapshot.status === 'locked' && (
                    <button
                      onClick={() => window.location.href = `/dashboard/admin/reports/generate?snapshot=${snapshot.id}`}
                      className="glass glass-rounded px-4 py-2 font-medium transition-all duration-300 flex-1 flex items-center justify-center gap-2 text-sm hover:glass-hover"
                    >
                      <Eye className="w-4 h-4" />
                      Generate Reports
                    </button>
                  )}
                  {snapshot.status === 'generated' && (
                    <button
                      onClick={() => window.location.href = `/dashboard/admin/reports/view?snapshot=${snapshot.id}`}
                      className="glass glass-rounded px-4 py-2 font-medium transition-all duration-300 flex-1 flex items-center justify-center gap-2 text-sm hover:glass-hover"
                    >
                      <Eye className="w-4 h-4" />
                      View Reports
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}

          {snapshots.length === 0 && (
            <GlassCard className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No snapshots created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-glass mt-4"
              >
                Create First Snapshot
              </button>
            </GlassCard>
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
            <div className="p-3 rounded-lg bg-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Select Exam Set</label>
            <select
              value={selectedExamSet}
              onChange={(e) => setSelectedExamSet(e.target.value)}
              className="glass glass-rounded px-4 py-2 w-full bg-transparent border-none outline-none"
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
              className="glass glass-rounded px-6 py-3 font-medium transition-all duration-300 flex-1 hover:glass-hover disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Snapshot'}
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedExamSet('');
                setError('');
              }}
              className="glass glass-rounded px-6 py-3 font-medium transition-all duration-300 flex-1 hover:glass-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

