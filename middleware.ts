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

  // Handle /login and /register first to avoid loops
  // Allow /login to render without forcing redirect (prevents flicker/loop);
  // if you want to send already-signed-in users away from /login, the client will do it after sign-in
  if (pathname.startsWith('/login')) {
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
  if (pathname.startsWith('/register')) {
    // Always allow register page to render regardless of existing session.
    // This prevents redirecting users away when they intend to create a new school.
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  // If no session and route is protected, redirect to login without redirect params to prevent loops
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If we have a session and user is on auth pages, send them to their dashboard when role is known
  if (session && isAuthPage) {
    const role = (session.user.user_metadata as any)?.role as string | undefined;
    if (role) {
      return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
    }
    // No role in metadata: allow auth page to render so client can resolve and redirect
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  // Optional role-based routing guard inside dashboard
  if (session && isProtected) {
    const role = (session.user.user_metadata as any)?.role as string | undefined;
    const lower = (role || '').toLowerCase();

    // If role is not yet known (common for staff accounts), allow client to resolve without redirecting
    if (!lower) {
      return res;
    }

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

    // If user hits generic /dashboard, route them to their role dashboard only when role is known
    if (pathname === '/dashboard') {
      if (role) {
        return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
      }
      // No role in metadata; let the client resolve destination
      return res;
    }
  }

  return res;
}

// Protect dashboard routes; leave public and assets alone
export const config = {
  matcher: [
    '/login',
    '/register',
    '/dashboard/:path*',
  ],
};


