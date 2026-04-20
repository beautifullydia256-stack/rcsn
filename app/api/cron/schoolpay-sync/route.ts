import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceRole';
import { decryptSchoolPaySecret } from '@/lib/schoolpay/crypto';
import { syncSchoolPayRange } from '@/lib/schoolpay/runSync';

export const runtime = 'nodejs';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.SCHOOLPAY_SYNC_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === secret;
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Nightly pull for all schools with SchoolPay enabled. Call with
 * Authorization: Bearer $SCHOOLPAY_SYNC_CRON_SECRET (or CRON_SECRET).
 * Default window: last 3 days (SchoolPay webhooks are not retried).
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: schools, error } = await service
    .from('schoolpay_school_settings')
    .select('school_id, schoolpay_school_code, api_password_encrypted')
    .eq('enabled', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toDate = isoDateDaysAgo(0);
  const fromDate = isoDateDaysAgo(3);
  const results: { school_id: string; ok: boolean; detail?: unknown; error?: string }[] = [];

  for (const s of schools || []) {
    const row = s as {
      school_id: string;
      schoolpay_school_code: string;
      api_password_encrypted: string;
    };
    const code = String(row.schoolpay_school_code || '').trim();
    if (!code || !row.api_password_encrypted) {
      results.push({ school_id: row.school_id, ok: false, error: 'incomplete_config' });
      continue;
    }
    let password: string;
    try {
      password = decryptSchoolPaySecret(row.api_password_encrypted);
    } catch (e) {
      results.push({
        school_id: row.school_id,
        ok: false,
        error: e instanceof Error ? e.message : 'decrypt_failed',
      });
      continue;
    }

    const r = await syncSchoolPayRange(service, row.school_id, code, password, fromDate, toDate);
    const errMsg = r.ok ? null : r.error || 'sync_failed';
    await service
      .from('schoolpay_school_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: errMsg,
      })
      .eq('school_id', row.school_id);

    results.push({ school_id: row.school_id, ok: r.ok, detail: r });
  }

  return NextResponse.json({ ok: true, fromDate, toDate, results });
}
