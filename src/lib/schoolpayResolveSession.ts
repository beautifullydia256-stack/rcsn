/**
 * SchoolPay session resolution without Next.js — safe for Vercel `/api/*.ts` (Vite framework).
 */
import { createClient, type User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const SETTINGS_ROLES = new Set(['admin', 'owner', 'head_teacher', 'accountant']);

export type SchoolPayApiSessionOk = {
  user: User;
  schoolId: string;
  role: string;
};

function getSupabasePublicConfig(): { url: string; anon: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

function cookieGetterFromHeader(cookieHeader: string | null | undefined): (name: string) => string | undefined {
  const map = new Map<string, string>();
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [key, ...v] = part.trim().split('=');
      if (key) map.set(key.trim(), decodeURIComponent((v.join('=') || '').trim()));
    }
  }
  return (name) => map.get(name);
}

export type ResolveSchoolPaySessionResult =
  | { ok: true; session: SchoolPayApiSessionOk }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Bearer JWT (Vite SPA) or Supabase cookies — used by Next routes and Vercel `/api` handlers.
 */
export async function resolveSchoolPayApiSession(input: {
  authorizationHeader: string | null | undefined;
  cookieHeader: string | null | undefined;
}): Promise<ResolveSchoolPaySessionResult> {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return { ok: false, status: 500, body: { error: 'Server misconfigured (Supabase URL/key)' } };
  }
  const { url: supabaseUrl, anon: supabaseAnon } = cfg;
  const bearer = input.authorizationHeader?.replace(/^Bearer\s+/i, '').trim() || '';
  const getCookie = cookieGetterFromHeader(input.cookieHeader ?? undefined);

  let user: User | null = null;

  if (bearer) {
    const anon = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.getUser(bearer);
    if (!error && data.user) user = data.user;
  }

  if (!user) {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return getCookie(name) ?? undefined;
        },
        set() {},
        remove() {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  }

  if (!user) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  }

  const rowClient = bearer
    ? createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createServerClient(supabaseUrl, supabaseAnon, {
        cookies: {
          get(name: string) {
            return getCookie(name) ?? undefined;
          },
          set() {},
          remove() {},
        },
      });

  const { data: userRow, error: rowErr } = await rowClient
    .from('users')
    .select('school_id, role')
    .eq('user_id', user.id)
    .single();

  if (rowErr || !userRow?.school_id) {
    return { ok: false, status: 400, body: { error: 'School not found' } };
  }

  const role = String(userRow.role || '');
  if (!SETTINGS_ROLES.has(role)) {
    return { ok: false, status: 403, body: { error: 'Access denied' } };
  }

  return { ok: true, session: { user, schoolId: userRow.school_id as string, role } };
}
