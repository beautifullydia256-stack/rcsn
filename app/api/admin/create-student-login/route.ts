import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { admission_number, student_id, email, password } = await request.json();

    // Require at least one identifier to resolve the student row
    if (!student_id && !admission_number) {
      return NextResponse.json(
        { error: 'Provide either student_id or admission_number to create a student login.' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // First, fetch the student data from the students table
    let studentData = null;
    if (student_id) {
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('student_id', student_id)
        .single();
      
      if (studentError) {
        console.warn('Could not fetch student data:', studentError.message);
      } else {
        studentData = student;
      }
    }

    // If not found by student_id, try by admission_number
    if (!studentData && admission_number) {
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('admission_number', admission_number)
        .single();
      
      if (studentError) {
        console.warn('Could not fetch student data by admission number:', studentError.message);
      } else {
        studentData = student;
      }
    }

    // If no student data found, create a basic student record first
    if (!studentData) {
      console.log('No student data found, creating basic student record...');
      
      // Create a basic student record. Ensure we persist admission_number when provided
      const { data: newStudent, error: createStudentError } = await supabaseAdmin
        .from('students')
        .insert({
          name: admission_number || 'Student User',
          current_class: 'N/A',
          status: 'active',
          school_id: null, // Will be set by admin later if needed
          admission_number: admission_number || null
        })
        .select()
        .single();

      if (createStudentError) {
        console.warn('Could not create student record:', createStudentError.message);
      } else {
        studentData = newStudent;
        console.log('Created basic student record:', newStudent);
      }
    }

    // Use provided email/password (no domain fallback). Email is required for auth
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required to create a student login.' },
        { status: 400 }
      );
    }
    const studentEmail = email as string;
    const studentPassword = password || admission_number;

    // Check if email already exists in users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('user_id, email, role, name')
      .eq('email', studentEmail)
      .single();
    
    // If we found a user record, check if it's orphaned
    if (existingUser && !checkError) {
      // Check if the auth user still exists
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(existingUser.user_id);
        
        if (authUser && !authError) {
          // Auth user exists, email is truly in use
          return NextResponse.json(
            { error: 'An account with this email already exists. Please use a different email address.' },
            { status: 400 }
          );
        } else {
          // Auth user doesn't exist, this is an orphaned record - clean it up
          console.log(`Cleaning up orphaned user record for email: ${studentEmail}`);
          const { error: deleteOrphanError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('user_id', existingUser.user_id);
          
          if (deleteOrphanError) {
            console.warn('Failed to delete orphaned user record:', deleteOrphanError.message);
          }
        }
      } catch (error) {
        console.warn('Error checking auth user, assuming orphaned:', error);
        // Try to clean up the orphaned record
        const { error: deleteOrphanError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('user_id', existingUser.user_id);
        
        if (deleteOrphanError) {
          console.warn('Failed to delete orphaned user record:', deleteOrphanError.message);
        }
      }
    }

    // At this point, studentData must exist; derive canonical identifiers
    const canonicalStudentId = studentData?.student_id as string;
    const canonicalAdmission = (studentData as any)?.admission_number || admission_number || 'N/A';

    // Create auth user with complete student data in metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        admission_number: canonicalAdmission,
        student_id: canonicalStudentId,
        role: 'student',
        // Always include student data (we ensure studentData exists above)
        student_name: studentData?.name || canonicalAdmission || 'Student User',
        current_class: studentData?.current_class || 'N/A',
        school_id: studentData?.school_id || null,
        status: studentData?.status || 'active'
      }
    });

    if (error) {
      // Check if it's a duplicate user error
      if (error.message.includes('already registered') || error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Student already has a login account. Use "Reset Password" to change password instead.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Also create a user record in the users table for consistency (link to student_id)
    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          user_id: data.user.id,
          email: studentEmail,
          role: 'student',
          name: studentData?.name || canonicalAdmission || 'Student User',
          school_id: studentData?.school_id || null,
          student_id: canonicalStudentId,
          password_hash: '$2a$10$example_hash_here' // Placeholder hash since Supabase Auth handles the real password
        });

      if (userInsertError) {
        console.error('Failed to create user record:', userInsertError.message);
        // This is critical - if we can't create the user record, the student won't be able to login
        // Delete the auth user we just created to avoid orphaned accounts
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json(
          { error: `Failed to create user record: ${userInsertError.message}` },
          { status: 500 }
        );
      }
      
      console.log('Successfully created user record for student:', {
        user_id: data.user.id,
        email: studentEmail,
        student_id: canonicalStudentId
      });
    } catch (userErr) {
      console.error('Error creating user record:', userErr);
      // Delete the auth user we just created to avoid orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: `Failed to create user record: ${userErr}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student login created successfully!',
      user: data.user
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
