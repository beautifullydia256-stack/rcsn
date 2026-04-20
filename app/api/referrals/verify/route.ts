import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  findReferralByCode,
  normalizeReferralCodeInput,
  REFERRAL_INVALID_MESSAGE,
} from '@/lib/referralLookup';
import { signReferralToken } from '@/lib/referralJwt';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = typeof body.code === 'string' ? body.code : '';
    const normalized = normalizeReferralCodeInput(raw);
    if (!normalized) {
      return NextResponse.json({ error: REFERRAL_INVALID_MESSAGE }, { status: 401 });
    }

    const validated = await findReferralByCode(supabaseAdmin, normalized);
    if (!validated) {
      return NextResponse.json({ error: REFERRAL_INVALID_MESSAGE }, { status: 401 });
    }

    let token: string;
    try {
      token = await signReferralToken(validated.id);
    } catch {
      return NextResponse.json(
        { error: 'Registration verification is not configured on the server.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      registeringUnder: validated.registeringUnder,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
