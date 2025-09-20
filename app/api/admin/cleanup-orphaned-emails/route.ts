import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Find orphaned user records (users without corresponding auth users)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id, email, role, name');

    if (usersError) {
      return NextResponse.json(
        { error: `Failed to fetch users: ${usersError.message}` },
        { status: 500 }
      );
    }

    const orphanedUsers = [];
    const cleanedUsers = [];

    for (const user of allUsers || []) {
      try {
        // Check if auth user exists
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.user_id);
        
        if (authError || !authUser) {
          // Auth user doesn't exist, this is an orphaned record
          orphanedUsers.push({
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            name: user.name
          });

          // Delete the orphaned user record
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('user_id', user.user_id);

          if (deleteError) {
            console.error(`Failed to delete orphaned user ${user.user_id}:`, deleteError);
          } else {
            cleanedUsers.push(user.email);
          }
        }
      } catch (error) {
        console.error(`Error checking auth user ${user.user_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Found ${orphanedUsers.length} orphaned records.`,
      orphanedUsers: orphanedUsers,
      cleanedEmails: cleanedUsers,
      totalOrphaned: orphanedUsers.length,
      totalCleaned: cleanedUsers.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
