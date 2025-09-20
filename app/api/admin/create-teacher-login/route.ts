import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, teacher_id, name, school_id } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Check users table safely (maybeSingle returns null if not found)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (existingUser && !checkError) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please use a different email address.' },
        { status: 400 }
      );
    }

    // Create auth user with complete metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        teacher_id: teacher_id || 'temp',
        role: 'teacher',
        name: name || 'Teacher User',
        school_id: school_id || null,
        // Additional metadata for consistency
        email: email,
        created_by: 'admin'
      }
    });

    if (error) {
      // If duplicate error from auth, report clearly
      if (typeof error.message === 'string' && (error.message.toLowerCase().includes('registered') || error.message.toLowerCase().includes('exists'))) {
        return NextResponse.json({ error: 'An account with this email already exists. Please use a different email address.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create user record in users table (idempotent upsert in case of race)
    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          user_id: data.user.id,
          email: email,
          role: 'teacher',
          name: name,
          school_id: school_id
        }, { onConflict: 'user_id' });

      if (userInsertError) {
        console.warn('Failed to create user record:', userInsertError.message);
        // Don't fail the entire operation, just log the warning
      }
    } catch (userErr) {
      console.warn('Error creating user record:', userErr);
      // Don't fail the entire operation
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher login created successfully!',
      user: data.user
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
