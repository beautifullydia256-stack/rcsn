import { createClient, type User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SETTINGS_ROLES = new Set(['admin', 'owner', 'head_teacher', 'accountant']);

export type SchoolPayApiSessionOk = {
  user: User;
  schoolId: string;
  role: string;
};

/**
 * Resolve the current user for SchoolPay settings/sync routes: Bearer JWT (Vite SPA)
 * or Supabase cookies (Next).
 */
export async function getSchoolPayApiSession(
  request: NextRequest
): Promise<SchoolPayApiSessionOk | { error: NextResponse }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';

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
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  }

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const rowClient = bearer
    ? createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createServerClient(supabaseUrl, supabaseAnon, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
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
    return { error: NextResponse.json({ error: 'School not found' }, { status: 400 }) };
  }

  const role = String(userRow.role || '');
  if (!SETTINGS_ROLES.has(role)) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  }

  return { user, schoolId: userRow.school_id as string, role };
}
