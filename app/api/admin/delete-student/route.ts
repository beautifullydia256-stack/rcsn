import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { student_id } = await request.json();

    if (!student_id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // First, get the student data to find the associated auth user
    const { data: studentData, error: studentFetchError } = await supabase
      .from('students')
      .select('admission_number, name')
      .eq('student_id', student_id)
      .single();

    if (studentFetchError) {
      return NextResponse.json(
        { error: `Student not found: ${studentFetchError.message}` },
        { status: 404 }
      );
    }

    // Find the associated user record
    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('user_id', student_id)
      .single();

    // Delete the student record (this will cascade to related records)
    const { error: deleteStudentError } = await supabase
      .from('students')
      .delete()
      .eq('student_id', student_id);

    if (deleteStudentError) {
      return NextResponse.json(
        { error: `Failed to delete student: ${deleteStudentError.message}` },
        { status: 400 }
      );
    }

    // Delete the user record if it exists
    if (userData && !userFetchError) {
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userData.user_id);

      if (deleteUserError) {
        console.warn('Failed to delete user record:', deleteUserError.message);
        // Don't fail the entire operation, just log the warning
      }

      // Delete the auth user if we have admin access
      if (supabaseAdmin) {
        try {
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userData.user_id);
          if (deleteAuthError) {
            console.warn('Failed to delete auth user:', deleteAuthError.message);
            // Don't fail the entire operation, just log the warning
          }
        } catch (authError) {
          console.warn('Error deleting auth user:', authError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Student and all related data deleted successfully',
      deletedStudent: studentData,
      deletedUser: userData ? { email: userData.email } : null
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
