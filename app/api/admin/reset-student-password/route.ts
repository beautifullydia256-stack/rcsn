import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { admission_number, new_password } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Try to find the user by trying different email formats
    let user = null;
    let users: any[] = [];
    
    try {
      const result = await supabaseAdmin.auth.admin.listUsers();
      if (result.data) {
        users = result.data.users || [];
      }
    } catch (listError) {
      return NextResponse.json(
        { error: 'Unable to access user database' },
        { status: 500 }
      );
    }

    // Try to find user by admission number in metadata first
    user = users.find(u => 
      u.user_metadata?.admission_number === admission_number
    );

    // If not found, try by email format
    if (!user) {
      user = users.find(u => 
        u.email === `${admission_number}@school.local`
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Student login not found. Please create login first.' },
        { status: 404 }
      );
    }

    // Use provided password or default to admission number
    const passwordToSet = new_password || admission_number;

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: passwordToSet }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully. New password: ${passwordToSet}`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
