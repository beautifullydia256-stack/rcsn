import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;
type ExamSet = { id: string; name: string; term?: number; year?: number };
type CurrentTerm = { year: number; term: number } | null;

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
  return null;
}

async function fetchCurrentTerm(schoolId: string): Promise<CurrentTerm> {
  const { data } = await supabase
    .from('school_terms')
    .select('year, term, start_date, end_date')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true });
  const todayStr = new Date().toISOString().slice(0, 10);
  const current = (data || []).find(
    (r: { start_date?: string; end_date: string }) =>
      r.end_date >= todayStr && (r.start_date == null || r.start_date <= todayStr)
  );
  return current ? { year: current.year, term: current.term } : null;
}

export default function TeacherExamResultsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { classNames, isLoading: ctxLoading } = useTeacherContext();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('');

  const { data: schoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const { data: currentTerm } = useQuery({
    queryKey: ['teacher', 'current-term', schoolId ?? ''],
    queryFn: () => fetchCurrentTerm(schoolId!),
    enabled: !!schoolId,
  });

  const { data: allExamSets = [] } = useQuery({
    queryKey: ['teacher', 'exam-sets', schoolId ?? ''],
    queryFn: async (): Promise<ExamSet[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('exam_sets')
        .select('id, name, term, year')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      return (data as ExamSet[]) ?? [];
    },
    enabled: !!schoolId,
  });

  // Teachers only see exam sets for the current term (no editing past terms)
  const examSets =
    currentTerm != null
      ? allExamSets.filter((es) => es.term === currentTerm.term && es.year === currentTerm.year)
      : [];

  // Reset exam set selection if it's no longer in the filtered list
  useEffect(() => {
    if (
      selectedExamSetId &&
      examSets.length > 0 &&
      !examSets.some((es) => es.id === selectedExamSetId)
    ) {
      setSelectedExamSetId('');
    }
  }, [examSets, selectedExamSetId]);

  const isLoading = ctxLoading || typeLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">Exam Results</h1>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher')}
        >
          Back
        </button>
      </div>

      {isLoading && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="animate-pulse flex items-center justify-center py-8">
            <div className="h-6 w-48 rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && !schoolId && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Sign in and select a school to enter exam results.</p>
        </div>
      )}

      {!isLoading && schoolId && !schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Unable to determine school type. Contact your admin to set school type (Primary or Secondary).</p>
        </div>
      )}

      {!isLoading && schoolId && schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-6">
          <h2 className="ac-text-primary font-medium">
            {schoolType === 'Nursery/Primary' ? 'Primary / Nursery' : 'Secondary'} exam results
          </h2>
          <p className="ac-text-muted text-sm">Select a class and exam set to enter or view marks. Only the current term is available for editing.</p>

          {currentTerm == null && (
            <p className="text-sm text-amber-600 dark:text-amber-400">No current term is set. Ask your admin to set the current term in school settings so you can enter marks.</p>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm ac-text-muted">Class</span>
              <select
                className="teacher-dropdown rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[180px]"
                style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  Select class
                </option>
                {classNames.map((c) => (
                  <option
                    key={c}
                    value={c}
                    style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                  >
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm ac-text-muted">Exam set</span>
              <select
                className="teacher-dropdown teacher-exam-set-select rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[180px]"
                style={{
                  backgroundColor: 'var(--ac-bg)',
                  color: 'var(--ac-text-primary)',
                }}
                value={selectedExamSetId}
                onChange={(e) => setSelectedExamSetId(e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  Select exam set
                </option>
                {examSets.map((es) => (
                  <option
                    key={es.id}
                    value={es.id}
                    style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                  >
                    {es.name ?? 'Unnamed'} {es.year != null ? `(${es.year})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedClass && selectedExamSetId && (
            <div className="pt-4 border-t border-[var(--ac-border)]">
              <p className="ac-text-muted text-sm mb-2">Mark entry for <strong className="ac-text-primary">{selectedClass}</strong> in the selected exam set.</p>
              <p className="ac-text-muted text-sm">Use the admin Exam Results flow or ask your admin to enable teacher mark entry for this exam set.</p>
            </div>
          )}

          {classNames.length === 0 && (
            <p className="ac-text-muted text-sm">No classes assigned to you yet. Ask your admin to assign you to classes.</p>
          )}
        </div>
      )}
    </div>
  );
}
