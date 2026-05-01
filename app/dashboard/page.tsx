import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { roleToDashboard } from '@/src/lib/rbac';

export default async function DashboardEntry() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set() {},
      remove() {},
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Prefer role from users table (source of truth); fallback to metadata
  const { data: u } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();
  
  const role = u?.role || (session.user.user_metadata as any)?.role;

  redirect(roleToDashboard(role));
}
