import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, parent_id, name, student_id, school_id } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Check if email already exists in users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    // If we found a user or if the error is not "no rows found", then email exists
    if (existingUser || (checkError && !checkError.message.includes('No rows found'))) {
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
        parent_id: parent_id || 'temp',
        role: 'parent',
        name: name || 'Parent User',
        student_id: student_id || null,
        school_id: school_id || null,
        // Additional metadata for consistency
        email: email,
        created_by: 'admin'
      }
    });

    if (error) {
      // Check if it's a duplicate user error
      if (error.message.includes('already registered') || error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please use a different email address.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create user record in users table
    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          user_id: data.user.id,
          email: email,
          role: 'parent',
          name: name,
          school_id: school_id
        });

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
      message: 'Parent login created successfully!',
      user: data.user
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
