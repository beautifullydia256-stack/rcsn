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

      if (inviteError) throw inviteError;
      authUserId = data.user?.id;
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

      if (signupError) throw signupError;
      authUserId = data.user?.id;
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

    if (profileError) throw profileError;

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

