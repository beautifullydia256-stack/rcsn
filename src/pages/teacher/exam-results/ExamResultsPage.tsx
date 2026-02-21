import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase
    .from('schools')
    .select('type')
    .eq('school_id', schoolId)
    .single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
  return null;
}

export default function TeacherExamResultsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data: schoolType, isLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

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

      {!isLoading && schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <h2 className="ac-text-primary font-medium mb-2">
            {schoolType === 'Nursery/Primary' ? 'Primary / Nursery' : 'Secondary'} exam results
          </h2>
          <p className="ac-text-muted text-sm mb-4">
            Enter and view exam results for your classes. Select a class and exam set to get started.
          </p>
          <p className="ac-text-muted text-sm">
            Class and exam set selectors will appear here. You can enter marks and view results by class.
          </p>
        </div>
      )}

      {!isLoading && !schoolType && schoolId && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Unable to determine school type. Contact your admin to set school type (Primary or Secondary).</p>
        </div>
      )}

      {!isLoading && !schoolId && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Enter and view exam results for your classes. Select a class and exam set below to get started.</p>
        </div>
      )}
    </div>
  );
}
