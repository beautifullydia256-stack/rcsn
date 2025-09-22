import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

// Records a conversion and provisional earning after successful signup via UTM
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    const body = await req.json();
    const { affiliate_id, utm_campaign, referred_user_id, code, plan = 'Pro', amount_cents = 0, currency = 'UGX' } = body || {};

    let affId = affiliate_id as string | undefined;
    if (!affId && utm_campaign) {
      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('affiliate_id, email')
        .ilike('email', `${utm_campaign}@%`)
        .maybeSingle();
      affId = aff?.affiliate_id;
    }

    if (!affId || !referred_user_id) {
      return NextResponse.json({ error: 'Missing affiliate or referred user' }, { status: 400 });
    }

    await supabaseAdmin.from('affiliate_earnings').insert({
      affiliate_id: affId,
      code,
      referred_user_id,
      plan,
      amount_cents,
      currency,
      status: 'pending'
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}


