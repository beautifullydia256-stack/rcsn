import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

async function fetchHeadTeacherProfile(userId: string) {
  const { data: row, error } = await supabase
    .from('users')
    .select('name, email, role, school_id')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  if (!row) throw new Error('Profile not found');
  let schoolName = '';
  if (row.school_id) {
    const { data: s } = await supabase.from('schools').select('name').eq('school_id', row.school_id).maybeSingle();
    schoolName = (s?.name as string) || '';
  }
  return {
    name: (row.name as string | null) || '',
    email: (row.email as string | null) || '',
    role: (row.role as string | null) || '',
    schoolName,
  };
}

export default function HeadTeacherProfilePage() {
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ['head-teacher', 'profile', user?.id ?? ''],
    queryFn: () => fetchHeadTeacherProfile(user!.id),
    enabled: !!user?.id,
  });

  if (!user?.id) return null;

  if (q.isError) {
    return (
      <AdminPageWrapper title="Profile" subtitle="Your account">
        <div className={`${adminCardClass} text-red-200/90 text-sm`} role="alert">
          {q.error instanceof Error ? q.error.message : 'Could not load profile'}
        </div>
      </AdminPageWrapper>
    );
  }

  if (q.isPending || !q.data) {
    return (
      <AdminPageWrapper title="Profile" subtitle="Your account">
        <p className="ac-text-secondary text-sm">Loading…</p>
      </AdminPageWrapper>
    );
  }

  const d = q.data;

  return (
    <AdminPageWrapper title="Profile" subtitle="Your account">
      <div className={`${adminCardClass} space-y-3 max-w-lg`}>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Name</div>
          <div className="text-slate-100 font-medium">{d.name || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Email</div>
          <div className="text-slate-100">{d.email || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Role</div>
          <div className="text-slate-100 capitalize">{d.role?.replace(/_/g, ' ') || '—'}</div>
        </div>
        {d.schoolName && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">School</div>
            <div className="text-slate-100">{d.schoolName}</div>
          </div>
        )}
        <Link
          to="/auth/update-password"
          className="inline-block text-sm text-sky-400 hover:underline pt-2"
        >
          Change password
        </Link>
      </div>
    </AdminPageWrapper>
  );
}
