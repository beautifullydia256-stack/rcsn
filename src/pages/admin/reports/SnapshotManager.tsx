import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { useSnapshots } from '../../../hooks/useSnapshot';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { lockSnapshot } from '../../../services/snapshotService';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
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

  const navigate = useNavigate();
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
          className="rounded-lg border border-gray-600 bg-[#1e293b] px-6 py-3 font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className={`${adminCardClass} space-y-4`}>
              <h3 className="text-lg font-semibold text-white">Term {snapshot.term} {snapshot.year}</h3>
              <p className="text-sm text-gray-400">Status: {snapshot.status}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status:</span>
                  <span className={`font-semibold ${getStatusColor(snapshot.status)}`}>
                    {snapshot.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Students:</span>
                  <span className="font-semibold text-white">{snapshot.student_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Created:</span>
                  <span className="text-sm text-gray-300">
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </span>
                </div>
                {snapshot.locked_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Locked:</span>
                    <span className="text-sm text-gray-300">
                      {new Date(snapshot.locked_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-600">
                {snapshot.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleLockSnapshot(snapshot.id)}
                      className="rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex-1 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Lock
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                      className="rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 flex-1 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                {snapshot.status === 'locked' && (
                  <button
                    onClick={() => navigate(`/dashboard/admin/reports/bulk?snapshot=${snapshot.id}`)}
                    className="rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex-1 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Generate Reports
                  </button>
                )}
                {snapshot.status === 'generated' && (
                  <button
                    onClick={() => navigate(`/dashboard/admin/reports/viewer?snapshot=${snapshot.id}`)}
                    className="rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex-1 flex items-center justify-center gap-2"
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
              <p className="text-gray-400">No snapshots created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-gray-200 hover:bg-white/5 mt-4"
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
            <label className="block text-sm font-medium text-gray-200 mb-2">Select Exam Set</label>
            <select
              value={selectedExamSet}
              onChange={(e) => setSelectedExamSet(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-[#0f172a] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-600 bg-blue-600 px-6 py-3 font-medium text-white flex-1 hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Snapshot'}
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedExamSet('');
                setError('');
              }}
              className="rounded-lg border border-gray-600 bg-[#1e293b] px-6 py-3 font-medium text-gray-200 flex-1 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassModal>
    </AdminPageWrapper>
  );
}

