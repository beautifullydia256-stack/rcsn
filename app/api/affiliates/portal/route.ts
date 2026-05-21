import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const { data: affiliate, error: affErr } = await supabaseAdmin
      .from('affiliates')
      .select('affiliate_id, name, email, phone, status, payment_info, created_at')
      .ilike('email', email)
      .maybeSingle();

    if (affErr || !affiliate) {
      return NextResponse.json(
        { error: 'No affiliate account found for this email. Make sure you applied at pwezacore.com/affiliate.' },
        { status: 404 }
      );
    }

    const affiliateId = (affiliate as { affiliate_id: string }).affiliate_id;

    // Load referral codes assigned to this affiliate
    const { data: codes } = await supabaseAdmin
      .from('referral_codes')
      .select('id, code, type, is_active, use_count')
      .eq('affiliate_id', affiliateId);

    // Count schools referred via this affiliate's codes
    const codeIds = (codes || []).map((c: { id: string }) => c.id);
    let schoolsReferred = 0;
    if (codeIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .in('referral_code_id', codeIds);
      schoolsReferred = count ?? 0;
    }

    // Load earnings
    const { data: earnings } = await supabaseAdmin
      .from('affiliate_earnings')
      .select('id, amount_cents, currency, status, created_at')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    const totalEarnedUgx = ((earnings || []) as { amount_cents: number; currency: string; status: string }[]).reduce(
      (sum, e) => (e.status !== 'cancelled' ? sum + (e.amount_cents ?? 0) : sum),
      0
    );

    return NextResponse.json({
      ...affiliate,
      referral_codes: codes || [],
      schools_referred: schoolsReferred,
      total_earned_ugx: totalEarnedUgx,
      earnings: earnings || [],
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
