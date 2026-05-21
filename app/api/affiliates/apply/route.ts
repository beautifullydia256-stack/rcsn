import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    const payment_info =
      typeof body.payment_info === 'string' && body.payment_info.trim() ? body.payment_info.trim() : null;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }
    if (!/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('affiliate_id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An affiliate application with this email already exists. Contact support if you need help.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({ name, email, phone, payment_info, status: 'ACTIVE' })
      .select('affiliate_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, affiliate_id: data.affiliate_id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
