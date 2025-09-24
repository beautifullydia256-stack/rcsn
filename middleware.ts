import { NextResponse, type NextRequest } from 'next/server';
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
    default:
      return '/dashboard';
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  const url = req.nextUrl;
  const pathname = url.pathname || '/';
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtected = pathname.startsWith('/dashboard');

  // If no session and route is protected, redirect to login
  if (!session && isProtected) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If we have a session and user is on auth pages, send them to their dashboard (relaxed login)
  if (session && isAuthPage) {
    const role = (session.user.user_metadata as any)?.role as string | undefined;
    return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
  }

  // Optional role-based routing guard inside dashboard
  if (session && isProtected) {
    const role = (session.user.user_metadata as any)?.role as string | undefined;
    const lower = (role || '').toLowerCase();

    // Enforce role-specific dashboard prefixes
    if (pathname.startsWith('/dashboard/admin') && lower !== 'admin' && lower !== 'owner') {
      return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
    }
    if (pathname.startsWith('/dashboard/teacher') && lower !== 'teacher' && lower !== 'owner' && lower !== 'admin') {
      return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
    }
    if (pathname.startsWith('/dashboard/parent') && lower !== 'parent' && lower !== 'owner' && lower !== 'admin') {
      return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
    }
    if (pathname.startsWith('/dashboard/student') && lower !== 'student' && lower !== 'owner' && lower !== 'admin') {
      return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
    }
  }

  return res;
}

// Protect dashboard routes; leave public and assets alone
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};


