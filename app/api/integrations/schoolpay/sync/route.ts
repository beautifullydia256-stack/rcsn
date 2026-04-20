import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabaseServiceRole';
import { decryptSchoolPaySecret } from '@/lib/schoolpay/crypto';
import { syncSchoolPayForSchoolDay, syncSchoolPayRange } from '@/lib/schoolpay/runSync';

export const runtime = 'nodejs';

const SETTINGS_ROLES = new Set(['admin', 'owner', 'head_teacher', 'accountant']);

async function getSessionSchoolUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: userRow } = await supabase.from('users').select('school_id, role').eq('user_id', user.id).single();

  if (!userRow?.school_id) {
    return { error: NextResponse.json({ error: 'School not found' }, { status: 400 }) };
  }

  if (!SETTINGS_ROLES.has(String(userRow.role || ''))) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  }

  return { user, schoolId: userRow.school_id as string };
}

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const session = await getSessionSchoolUser(request);
  if ('error' in session) return session.error;

  let body: { transactionDate?: string; fromDate?: string; toDate?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const service = createServiceRoleClient();
  const { data: settings, error: sErr } = await service
    .from('schoolpay_school_settings')
    .select('*')
    .eq('school_id', session.schoolId)
    .maybeSingle();

  if (sErr || !settings?.enabled) {
    return NextResponse.json({ error: 'SchoolPay is not enabled for this school' }, { status: 400 });
  }

  const code = String(settings.schoolpay_school_code || '').trim();
  if (!code || !settings.api_password_encrypted) {
    return NextResponse.json({ error: 'Configure school code and API password first' }, { status: 400 });
  }

  let password: string;
  try {
    password = decryptSchoolPaySecret(settings.api_password_encrypted as string);
  } catch (e) {
    console.error('[schoolpay sync] decrypt', e);
    return NextResponse.json({ error: 'Could not read stored API password' }, { status: 500 });
  }

  const fromDate = body.fromDate?.trim();
  const toDate = body.toDate?.trim();

  let result:
    | Awaited<ReturnType<typeof syncSchoolPayForSchoolDay>>
    | Awaited<ReturnType<typeof syncSchoolPayRange>>;

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const days = (end.getTime() - start.getTime()) / (86400 * 1000);
    if (days < 0 || days > 31) {
      return NextResponse.json({ error: 'Invalid range (max 31 days)' }, { status: 400 });
    }
    result = await syncSchoolPayRange(service, session.schoolId, code, password, fromDate, toDate);
  } else {
    const transactionDate = body.transactionDate?.trim() || yesterdayIso();
    result = await syncSchoolPayForSchoolDay(service, session.schoolId, code, password, transactionDate);
  }

  const errMsg = result.ok ? null : result.error || 'sync_failed';
  await service
    .from('schoolpay_school_settings')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: errMsg,
    })
    .eq('school_id', session.schoolId);

  return NextResponse.json({ ...result });
}
