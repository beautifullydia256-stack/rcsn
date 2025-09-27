import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

// Logs an affiliate click. Expects query params or JSON body with affiliate_id or utm_campaign and url
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ua = req.headers.get('user-agent') || '';

    const json = await req.json().catch(() => ({}));
    const utm_source = json.utm_source || url.searchParams.get('utm_source') || undefined;
    const utm_medium = json.utm_medium || url.searchParams.get('utm_medium') || undefined;
    const utm_campaign = json.utm_campaign || url.searchParams.get('utm_campaign') || undefined;
    const clickUrl = json.url || url.searchParams.get('url') || url.toString();
    const code = json.code || url.searchParams.get('code') || undefined;

    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    // Lookup affiliate by utm_campaign if provided
    let affiliate_id = json.affiliate_id as string | undefined;
    if (!affiliate_id && utm_campaign) {
      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('affiliate_id, email')
        .ilike('email', `${utm_campaign}@%`)
        .maybeSingle();
      affiliate_id = aff?.affiliate_id;
    }

    if (!affiliate_id && !utm_campaign) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await supabaseAdmin.from('affiliate_clicks').insert({
      affiliate_id,
      code,
      url: clickUrl,
      ip,
      user_agent: ua,
      utm_source,
      utm_medium,
      utm_campaign,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}


