import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, name')
      .eq('email', email)
      .single();

    let isAvailable = true;
    let reason = '';
    let userDetails = null;

    if (userRecord && !userError) {
      // User record exists, check if auth user also exists
      if (supabaseAdmin) {
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userRecord.user_id);
          
          if (authUser && !authError) {
            // Both user record and auth user exist - email is in use
            isAvailable = false;
            reason = 'Email is currently in use by an active user';
            userDetails = {
              user_id: userRecord.user_id,
              email: userRecord.email,
              role: userRecord.role,
              name: userRecord.name,
              authUserExists: true
            };
          } else {
            // User record exists but auth user doesn't - orphaned record
            isAvailable = false;
            reason = 'Email is associated with an orphaned user record (auth user deleted)';
            userDetails = {
              user_id: userRecord.user_id,
              email: userRecord.email,
              role: userRecord.role,
              name: userRecord.name,
              authUserExists: false,
              isOrphaned: true
            };
          }
        } catch (error) {
          // Error checking auth user - assume orphaned
          isAvailable = false;
          reason = 'Email is associated with a user record but auth user check failed';
          userDetails = {
            user_id: userRecord.user_id,
            email: userRecord.email,
            role: userRecord.role,
            name: userRecord.name,
            authUserExists: false,
            isOrphaned: true,
            error: error.message
          };
        }
      } else {
        // No admin access, assume email is in use
        isAvailable = false;
        reason = 'Email is associated with a user record';
        userDetails = {
          user_id: userRecord.user_id,
          email: userRecord.email,
          role: userRecord.role,
          name: userRecord.name
        };
      }
    }

    return NextResponse.json({
      email: email,
      isAvailable: isAvailable,
      reason: reason,
      userDetails: userDetails,
      canCleanup: userDetails?.isOrphaned || false
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
