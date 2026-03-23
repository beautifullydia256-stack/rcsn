import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';

const STALE_TIME_MS = 5 * 60 * 1000;

const cardClass = 'rounded-xl border border-gray-200 bg-white shadow-sm p-6';

export async function fetchReportsGenerateExamSetsPage(userId: string): Promise<{ schoolId: string; examSets: any[] }> {
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
    queryFn: () => fetchReportsGenerateExamSetsPage(user!.id),
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
      navigate(`/dashboard/admin/reports/bulk?snapshot=${snapshotId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare reports');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-page="reports-generate-hub">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Generate Reports</h1>
          <p className="text-gray-600 text-sm mt-1">Create student academic reports for exams and terms · Select exam set below</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin/reports')}
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
        >
          Back to Reports
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className={cardClass}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-gray-900 text-lg font-medium mb-2">Select exam set</h3>
            <p className="text-gray-500 text-sm">Choose the exam set to generate reports for</p>
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm text-center">Loading exam sets…</p>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedExamSetId}
                onChange={(e) => setSelectedExamSetId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">— Select exam set —</option>
                {examSets.map((es: any) => (
                  <option key={es.id} value={es.id}>
                    {es.name} – Term {es.term} {es.year}
                  </option>
                ))}
              </select>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedExamSetId || generating}
                className="w-full px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Preparing…' : 'Generate Reports'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
