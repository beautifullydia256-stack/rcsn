import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { lockSnapshot } from '../../../services/snapshotService';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchExamSets(userId: string): Promise<{ schoolId: string; examSets: any[] }> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolId: '', examSets: [] };
  const { data: sets } = await supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', u.school_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { schoolId: u.school_id, examSets: sets || [] };
}

export default function ReportsGeneratePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [selectedExamSetId, setSelectedExamSetId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports-generate-examsets', user?.id ?? ''],
    queryFn: () => fetchExamSets(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const examSets = data?.examSets ?? [];

  const handleGenerate = async () => {
    if (!schoolId || !selectedExamSetId) {
      setError('Please select an exam set');
      return;
    }
    const examSet = examSets.find((es: any) => es.id === selectedExamSetId);
    if (!examSet) {
      setError('Exam set not found');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const snapshotId = await createSnapshotFromExamSet(
        schoolId,
        selectedExamSetId,
        examSet.term,
        examSet.year
      );
      await lockSnapshot(snapshotId);
      navigate(`/dashboard/admin/reports/bulk?snapshot=${snapshotId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare reports');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminPageWrapper
      title="Generate Reports"
      subtitle="Create student academic reports for an exam set"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/dashboard/admin/reports')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Reports
        </button>
      </div>

      <div className={`${adminCardClass} max-w-xl space-y-4`}>
        <div>
          <label className="block text-sm font-medium text-white/85 mb-2">Select exam set</label>
          <select
            value={selectedExamSetId}
            onChange={(e) => setSelectedExamSetId(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select exam set —</option>
            {examSets.map((es: any) => (
              <option key={es.id} value={es.id}>
                {es.name} – Term {es.term} {es.year}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedExamSetId || generating || isLoading}
          className="w-full rounded-xl border border-blue-500/50 bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Preparing…' : 'Generate Reports'}
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 text-white/70 text-sm">Loading exam sets…</div>
      )}
    </AdminPageWrapper>
  );
}
