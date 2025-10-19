import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Get all auth users with student role
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: `Failed to list auth users: ${listError.message}` },
        { status: 500 }
      );
    }

    const studentUsers = authUsers.users.filter(user => 
      user.user_metadata?.role === 'student' || 
      user.user_metadata?.student_id
    );

    const results = {
      total: studentUsers.length,
      fixed: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const authUser of studentUsers) {
      try {
        // Check if user record exists
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (userError && userError.message.includes('No rows found')) {
          // User record doesn't exist, create it
          const userMetadata = authUser.user_metadata || {};
          const studentId = userMetadata.student_id;
          const admissionNumber = userMetadata.admission_number;
          
          // Try to get student data
          let studentData = null;
          if (studentId) {
            const { data: student } = await supabaseAdmin
              .from('students')
              .select('*')
              .eq('student_id', studentId)
              .single();
            studentData = student;
          } else if (admissionNumber) {
            const { data: student } = await supabaseAdmin
              .from('students')
              .select('*')
              .eq('admission_number', admissionNumber)
              .single();
            studentData = student;
          }

          if (studentData) {
            // Create user record
            const { error: insertError } = await supabaseAdmin
              .from('users')
              .insert({
                user_id: authUser.id,
                email: authUser.email || '',
                role: 'student',
                name: studentData.name || userMetadata.student_name || 'Student User',
                school_id: studentData.school_id,
                student_id: studentData.student_id
              });

            if (insertError) {
              results.errors++;
              results.details.push({
                email: authUser.email,
                error: `Failed to create user record: ${insertError.message}`
              });
            } else {
              results.fixed++;
              results.details.push({
                email: authUser.email,
                action: 'Created user record',
                student_id: studentData.student_id
              });
            }
          } else {
            results.errors++;
            results.details.push({
              email: authUser.email,
              error: 'No student data found for this user'
            });
          }
        } else if (existingUser) {
          results.details.push({
            email: authUser.email,
            action: 'User record already exists'
          });
        } else {
          results.errors++;
          results.details.push({
            email: authUser.email,
            error: `Error checking user record: ${userError?.message}`
          });
        }
      } catch (error: any) {
        results.errors++;
        results.details.push({
          email: authUser.email,
          error: `Unexpected error: ${error.message}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.fixed} student logins out of ${results.total}`,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
