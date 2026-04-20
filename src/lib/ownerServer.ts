import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

export type OwnerContext =
  | {
      user: User;
      admin: SupabaseClient;
    }
  | { error: NextResponse };

export async function getOwnerContext(request?: NextRequest): Promise<OwnerContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
    return { error: NextResponse.json({ error: 'Server not configured' }, { status: 500 }) };
  }

  let user: User | null = null;

  const bearer =
    request?.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';

  if (bearer) {
    const anon = createClient(supabaseUrl, supabaseAnon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon.auth.getUser(bearer);
    if (!error && data.user) {
      user = data.user;
    }
  }

  if (!user) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      user = data.user;
    }
  }

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row } = await admin.from('users').select('role').eq('user_id', user.id).single();

  if (!row || row.role !== 'owner') {
    return { error: NextResponse.json({ error: 'Owner access required' }, { status: 403 }) };
  }

  return { user, admin };
}
