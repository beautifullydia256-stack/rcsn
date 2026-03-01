import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// CORS: allow frontend at www.pwezacore.com (and optional CORS_ORIGIN env) when API is on api.pwezacore.com
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/** Handle CORS preflight so browser allows POST from www.pwezacore.com */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      console.error('Missing Supabase env: URL, anon key, or service role key');
      return withCors(NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      ));
    }

    const cookieStore = await cookies();

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
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    // Get admin's school
    const { data: adminData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    if (!adminData || !['admin', 'owner'].includes(adminData.role)) {
      return withCors(NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 }));
    }

    const body = await request.json();
    const { email, firstName, lastName, role, phone, password, sendEmailInvite, department, position } = body;
    
    // Combine firstName and lastName into name
    const name = `${firstName || ''} ${lastName || ''}`.trim();

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in public.users (fast, indexed) - avoid listUsers() which can timeout on serverless
    const { data: existingUserByEmail } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserByEmail) {
      return withCors(NextResponse.json(
        { error: 'A user with this email address has already been registered' },
        { status: 400 }
      ));
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
        // Email already in auth - return clear message (avoid listUsers which can timeout)
        if (inviteError.message?.toLowerCase().includes('already') || inviteError.message?.toLowerCase().includes('registered')) {
          return withCors(NextResponse.json(
            { error: 'A user with this email address has already been registered' },
            { status: 400 }
          ));
        }
        throw inviteError;
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
        // Email already in auth - return clear message (avoid listUsers which can timeout)
        if (signupError.message?.toLowerCase().includes('already') || signupError.message?.toLowerCase().includes('registered')) {
          return withCors(NextResponse.json(
            { error: 'A user with this email address has already been registered' },
            { status: 400 }
          ));
        }
        throw signupError;
      } else {
        authUserId = data.user?.id;
      }
    }

    // Validate school_id exists before inserting
    if (!adminData.school_id) {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return withCors(NextResponse.json({ 
        error: 'Admin user does not have a school_id. Please contact support.' 
      }, { status: 400 }));
    }

    // Verify school_id exists in schools table before inserting
    // This helps catch the issue early with a better error message
    const { data: schoolCheck, error: schoolCheckError } = await supabaseAdmin
      .from('schools')
      .select('school_id')
      .eq('school_id', adminData.school_id)
      .single();
    
    if (schoolCheckError || !schoolCheck) {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return withCors(NextResponse.json({ 
        error: `The school_id (${adminData.school_id}) does not exist in the schools table. Please verify your school setup.`,
        details: schoolCheckError?.message
      }, { status: 400 }));
    }

    // Create user profile in users table using service role
    // Same pattern as create-teacher-login: direct upsert (no RPC) to avoid FUNCTION_INVOCATION_FAILED
    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          user_id: authUserId,
          email,
          name,
          role,
          school_id: adminData.school_id,
          phone: phone || null,
          department: department || null,
          position: position || null
        }, { onConflict: 'user_id' });

      if (userInsertError) {
        console.warn('Failed to create user record:', userInsertError.message);
        // Don't fail the entire operation (match create-teacher-login); auth user can still log in
      }
    } catch (userErr: any) {
      console.warn('Error creating user record:', userErr);
      // Don't fail the entire operation
    }

    return withCors(NextResponse.json({ 
      success: true,
      message: sendEmailInvite 
        ? "User invited successfully! They will receive an email to set up their account."
        : "User created successfully! They can now log in with their credentials."
    }));

  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    
    // Provide more specific error messages
    let errorMessage = error?.message || 'Failed to create user';
    
    if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
      errorMessage = `Database schema error: ${error.message}. Please ensure all required tables exist. If the error mentions 'schools', run the migration to fix the foreign key constraint.`;
    } else if (error?.code === '23503') {
      errorMessage = `Foreign key constraint violation: The school_id (${adminData?.school_id}) does not exist in the schools table.`;
    } else if (error?.code === '23505') {
      errorMessage = 'A user with this email address already exists.';
    }
    
    return withCors(NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 }));
  }
}

