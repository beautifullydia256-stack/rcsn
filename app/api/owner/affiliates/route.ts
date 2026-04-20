import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getOwnerContext } from '@/lib/ownerServer';

async function generateUniqueAffiliateCode(
  admin: import('@supabase/supabase-js').SupabaseClient,
  prefixRaw: string
): Promise<string> {
  const base = prefixRaw.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase() || 'AFF';
  for (let i = 0; i < 16; i++) {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    const code = `${base}-${suffix}`;
    const { data } = await admin.from('referral_codes').select('id').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

export async function GET(request: NextRequest) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const { data, error } = await ctx.admin
    .from('affiliates')
    .select('affiliate_id, name, phone, email, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ affiliates: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const { data: affiliate, error: insAff } = await ctx.admin
    .from('affiliates')
    .insert({
      name,
      email,
      phone: phone || null,
      status: 'ACTIVE',
    })
    .select('affiliate_id, name, phone, email, status, created_at')
    .single();

  if (insAff || !affiliate) {
    return NextResponse.json({ error: insAff?.message || 'Failed to create affiliate.' }, { status: 400 });
  }

  let code: string;
  try {
    code = await generateUniqueAffiliateCode(ctx.admin, name);
  } catch (e) {
    await ctx.admin.from('affiliates').delete().eq('affiliate_id', affiliate.affiliate_id);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Code generation failed' }, { status: 500 });
  }

  const { data: refRow, error: insRef } = await ctx.admin
    .from('referral_codes')
    .insert({
      code,
      type: 'AFFILIATE',
      affiliate_id: affiliate.affiliate_id,
      is_active: true,
    })
    .select('id, code, type, is_active, use_count, max_uses, expires_at, created_at')
    .single();

  if (insRef || !refRow) {
    await ctx.admin.from('affiliates').delete().eq('affiliate_id', affiliate.affiliate_id);
    return NextResponse.json({ error: insRef?.message || 'Failed to create referral code.' }, { status: 400 });
  }

  return NextResponse.json({ affiliate, referral_code: refRow });
}
