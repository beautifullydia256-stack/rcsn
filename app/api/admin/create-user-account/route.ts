import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    // Get current admin user
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin's school
    const { data: adminData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    if (!adminData || !['admin', 'owner'].includes(adminData.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, firstName, lastName, role, phone, password, sendEmailInvite, department, position } = body;
    
    // Combine firstName and lastName into name
    const name = `${firstName || ''} ${lastName || ''}`.trim();

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in auth.users
    try {
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);
      
      if (existingAuthUser) {
        // Check if there's a corresponding public.users record
        const { data: existingUserRecord } = await supabaseAdmin
          .from('users')
          .select('user_id')
          .eq('user_id', existingAuthUser.id)
          .single();
        
        if (existingUserRecord) {
          // Both auth user and public.users record exist - email is truly in use
          return NextResponse.json({ 
            error: 'A user with this email address has already been registered' 
          }, { status: 400 });
        } else {
          // Orphaned auth user exists (no public.users record) - delete it first
          console.log(`Cleaning up orphaned auth user for email: ${email}`);
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
        }
      }
    } catch (checkError) {
      console.warn('Error checking for existing auth user:', checkError);
      // Continue with creation attempt - if email exists, Supabase will error
    }

    let authUserId = null;

    if (sendEmailInvite) {
      // Send email invite
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          name,
          role,
          school_id: adminData.school_id,
          department,
          position,
          phone
        }
      });

      if (inviteError) {
        // Check if error is due to email already existing
        if (inviteError.message?.toLowerCase().includes('already') || inviteError.message?.toLowerCase().includes('registered')) {
          // Try to find and clean up orphaned auth user
          try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const orphanedUser = authUsers?.users?.find(u => u.email === email);
            if (orphanedUser) {
              const { data: userRecord } = await supabaseAdmin
                .from('users')
                .select('user_id')
                .eq('user_id', orphanedUser.id)
                .single();
              
              if (!userRecord) {
                // Orphaned auth user - delete it and retry
                console.log(`Cleaning up orphaned auth user and retrying for email: ${email}`);
                await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
                // Retry the invite
                const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                  data: {
                    name,
                    role,
                    school_id: adminData.school_id,
                    department,
                    position,
                    phone
                  }
                });
                if (retryError) throw retryError;
                authUserId = retryData.user?.id;
              } else {
                throw inviteError; // Email is truly in use
              }
            } else {
              throw inviteError; // Email exists but we couldn't find it
            }
          } catch (cleanupError) {
            throw inviteError; // Throw original error if cleanup fails
          }
        } else {
          throw inviteError;
        }
      } else {
        authUserId = data.user?.id;
      }
    } else {
      // Create user with password
      const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          school_id: adminData.school_id,
          department,
          position,
          phone
        }
      });

      if (signupError) {
        // Check if error is due to email already existing
        if (signupError.message?.toLowerCase().includes('already') || signupError.message?.toLowerCase().includes('registered')) {
          // Try to find and clean up orphaned auth user
          try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const orphanedUser = authUsers?.users?.find(u => u.email === email);
            if (orphanedUser) {
              const { data: userRecord } = await supabaseAdmin
                .from('users')
                .select('user_id')
                .eq('user_id', orphanedUser.id)
                .single();
              
              if (!userRecord) {
                // Orphaned auth user - delete it and retry
                console.log(`Cleaning up orphaned auth user and retrying for email: ${email}`);
                await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
                // Retry the creation
                const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
                  email,
                  password,
                  email_confirm: true,
                  user_metadata: {
                    name,
                    role,
                    school_id: adminData.school_id,
                    department,
                    position,
                    phone
                  }
                });
                if (retryError) throw retryError;
                authUserId = retryData.user?.id;
              } else {
                throw signupError; // Email is truly in use
              }
            } else {
              throw signupError; // Email exists but we couldn't find it
            }
          } catch (cleanupError) {
            throw signupError; // Throw original error if cleanup fails
          }
        } else {
          throw signupError;
        }
      } else {
        authUserId = data.user?.id;
      }
    }

    // Create user profile in users table using service role
    // Note: phone, department, and position are also stored in user_metadata for auth purposes
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      user_id: authUserId,
      email,
      name,
      role,
      school_id: adminData.school_id,
      phone: phone || null,
      department: department || null,
      position: position || null
    });

    if (profileError) {
      // If public.users insert fails, clean up the auth user we just created
      if (authUserId) {
        console.error('Failed to create user profile, cleaning up auth user:', profileError);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user after profile creation failure:', cleanupError);
        }
      }
      throw profileError;
    }

    return NextResponse.json({ 
      success: true,
      message: sendEmailInvite 
        ? "User invited successfully! They will receive an email to set up their account."
        : "User created successfully! They can now log in with their credentials."
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to create user' 
    }, { status: 500 });
  }
}

