import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';
import { useAuthStore } from '@/store/authStore';

type TeacherProfile = {
  teacher_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  gender: string | null;
};

export default function TeacherSettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { schoolId, teacherId, isLoading: ctxLoading } = useTeacherContext();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['teacher', 'profile', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<TeacherProfile | null> => {
      if (!schoolId || !teacherId) return null;
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, email, phone, employee_id, gender')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .maybeSingle();
      return data as TeacherProfile | null;
    },
    enabled: !!schoolId && !!teacherId,
  });

  const isLoading = ctxLoading || profileLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">Settings</h1>
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
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-32 rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && !profile && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Could not load your profile. Make sure you are linked as a teacher.</p>
        </div>
      )}

      {!isLoading && profile && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-6">
          <h2 className="text-lg font-semibold ac-text-primary">Profile</h2>
          <dl className="grid gap-3 sm:grid-cols-1">
            <div>
              <dt className="text-sm font-medium ac-text-muted">Name</dt>
              <dd className="mt-0.5 ac-text-primary">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium ac-text-muted">Email</dt>
              <dd className="mt-0.5 ac-text-primary">{profile.email ?? user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium ac-text-muted">Employee ID</dt>
              <dd className="mt-0.5 ac-text-primary">{profile.employee_id ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium ac-text-muted">Phone</dt>
              <dd className="mt-0.5 ac-text-primary">{profile.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium ac-text-muted">Gender</dt>
              <dd className="mt-0.5 ac-text-primary">{profile.gender ?? '—'}</dd>
            </div>
          </dl>
          <p className="text-sm ac-text-muted">
            To change your name or contact details, please contact your school admin.
          </p>
        </div>
      )}
    </div>
  );
}
