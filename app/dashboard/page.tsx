import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

function roleToDashboard(role?: string | null): string {
  switch ((role || '').toLowerCase()) {
    case 'owner':
      return '/dashboard/owner';
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'parent':
      return '/dashboard/parent';
    case 'student':
      return '/dashboard/student';
    case 'librarian':
      return '/dashboard/librarian';
    case 'accountant':
      return '/dashboard/accountant';
    case 'head_teacher':
      return '/dashboard/head-teacher';
    default:
      return '/dashboard/admin';
  }
}

export default async function DashboardEntry() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) { return (global as any)?.cookies?.get(name)?.value; },
      set() {},
      remove() {},
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Prefer role from metadata; fallback to users table
  let role = (session.user.user_metadata as any)?.role as string | undefined;
  if (!role) {
    const { data: u } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    role = u?.role as string | undefined;
  }

  redirect(roleToDashboard(role));
}
