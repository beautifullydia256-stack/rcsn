import { NextRequest, NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/ownerServer';

export async function GET(request: NextRequest) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const affiliateId = searchParams.get('affiliate_id') || '';
  const referralCodeId = searchParams.get('referral_code_id') || '';

  let q = ctx.admin.from('schools').select(
    `
    school_id,
    name,
    plan,
    created_at,
    owner_email,
    address,
    phone,
    referral_code_id,
    affiliate_id,
    referral_codes ( code ),
    affiliates ( name, email )
  `
  );

  if (affiliateId) {
    q = q.eq('affiliate_id', affiliateId);
  }
  if (referralCodeId) {
    q = q.eq('referral_code_id', referralCodeId);
  }

  const { data, error } = await q.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ schools: data || [] });
}
