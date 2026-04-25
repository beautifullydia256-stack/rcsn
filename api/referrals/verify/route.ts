import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Check if referral code exists and is valid
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !referralCode) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired referral code' },
        { status: 404 }
      );
    }

    // Check if code has reached max uses
    if (referralCode.max_uses && referralCode.current_uses >= referralCode.max_uses) {
      return NextResponse.json(
        { valid: false, message: 'Referral code has reached maximum uses' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'Referral code has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: referralCode,
      message: 'Referral code is valid'
    });

  } catch (error) {
    console.error('Error verifying referral code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Referral code is required' },
      { status: 400 }
    );
  }

  try {
    // Check if referral code exists and is valid
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !referralCode) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired referral code' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: referralCode,
      message: 'Referral code is valid'
    });

  } catch (error) {
    console.error('Error verifying referral code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}