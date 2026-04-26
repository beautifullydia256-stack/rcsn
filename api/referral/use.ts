import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Increment the usage count for the referral code (update both columns for compatibility)
    const { data: updatedCode, error } = await supabase
      .from('referral_codes')
      .update({ 
        current_uses: supabase.raw('current_uses + 1'),
        use_count: supabase.raw('COALESCE(use_count, 0) + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .select('id, code, current_uses, use_count, max_uses')
      .single();

    if (error || !updatedCode) {
      return NextResponse.json(
        { error: 'Failed to record referral code usage' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Referral code usage recorded',
      usage: {
        current_uses: updatedCode.current_uses,
        use_count: updatedCode.use_count,
        max_uses: updatedCode.max_uses
      }
    });

  } catch (error) {
    console.error('Error recording referral code usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}