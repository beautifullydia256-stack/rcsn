import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REFERRAL_INVALID_MESSAGE = 'Invalid or inactive referral code. Please contact support.';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Create admin Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Normalize the referral code (uppercase, trimmed)
    const normalizedCode = code.trim().toUpperCase();

    // Query the referral_codes table with the actual current structure
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select(`
        id,
        code,
        type,
        is_active,
        expires_at,
        max_uses,
        use_count,
        affiliate_id,
        affiliates (
          name,
          status
        )
      `)
      .eq('code', normalizedCode)
      .maybeSingle();

    if (error || !referralCode) {
      return NextResponse.json(
        { error: REFERRAL_INVALID_MESSAGE },
        { status: 400 }
      );
    }

    // Validate the referral code
    if (!referralCode.is_active) {
      return NextResponse.json(
        { error: REFERRAL_INVALID_MESSAGE },
        { status: 400 }
      );
    }

    // Check if expired
    if (referralCode.expires_at) {
      const expiry = new Date(referralCode.expires_at);
      if (expiry < new Date()) {
        return NextResponse.json(
          { error: REFERRAL_INVALID_MESSAGE },
          { status: 400 }
        );
      }
    }

    // Check if max uses reached
    if (referralCode.max_uses && referralCode.use_count >= referralCode.max_uses) {
      return NextResponse.json(
        { error: REFERRAL_INVALID_MESSAGE },
        { status: 400 }
      );
    }

    // Return success with referral details
    return NextResponse.json({
      success: true,
      referral: {
        id: referralCode.id,
        code: referralCode.code,
        type: referralCode.type,
        affiliate_name: referralCode.affiliates?.name || null
      }
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}