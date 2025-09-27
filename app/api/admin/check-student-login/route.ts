import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { student_id, admission_number } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Check if student already has a login
    let existingUsers: any[] = [];
    try {
      const result = await supabaseAdmin.auth.admin.listUsers();
      if (result.data) {
        existingUsers = result.data.users || [];
      }
    } catch (listError) {
      console.warn('Could not list users:', listError);
      // Return no login found if we can't check
      return NextResponse.json({
        hasLogin: false,
        email: '',
        userId: ''
      });
    }

    // Check if student already has a login account
    const existingUser = existingUsers.find(u => 
      u.user_metadata?.student_id === student_id ||
      u.user_metadata?.admission_number === admission_number
    );

    return NextResponse.json({
      hasLogin: !!existingUser,
      email: existingUser?.email || '',
      userId: existingUser?.id || ''
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
