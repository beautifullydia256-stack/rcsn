import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { lockSnapshot } from '../../../services/snapshotService';

const STALE_TIME_MS = 5 * 60 * 1000;

const cardClass =
  'rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20';

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
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header – same layout as old 2f00b44 reports page */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Generate Reports</h1>
          <p className="text-white/80 text-sm mt-1">Create student academic reports for exams and terms</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin/reports')}
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
        >
          Back to Reports
        </button>
      </div>

      {/* Main card – same style as old report options cards */}
      <div className={`${cardClass} p-6 max-w-xl`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white text-lg font-medium">Select exam set</h2>
            <p className="text-white/70 text-sm">Choose the exam set to generate reports for</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-white/70 text-sm">Loading exam sets…</p>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedExamSetId}
              onChange={(e) => setSelectedExamSetId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select exam set —</option>
              {examSets.map((es: any) => (
                <option key={es.id} value={es.id}>
                  {es.name} – Term {es.term} {es.year}
                </option>
              ))}
            </select>
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedExamSetId || generating}
              className="w-full px-6 py-3 rounded-lg bg-blue-600 border border-blue-500/50 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Preparing…' : 'Generate Reports'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
