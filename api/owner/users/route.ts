import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Query users from auth.users and profiles tables
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        school_id,
        created_at,
        last_login,
        login_count,
        status,
        schools!inner(
          id,
          name,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      // If profiles table doesn't exist, fall back to auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      const formattedUsers = authUsers.users.map(user => ({
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        role: user.user_metadata?.role || 'student',
        school_id: user.user_metadata?.school_id || null,
        created_at: user.created_at,
        last_login: user.last_sign_in_at,
        login_count: 0,
        status: 'active',
        schools: {
          name: 'Unknown School'
        }
      }));

      return NextResponse.json({
        success: true,
        users: formattedUsers,
        total: formattedUsers.length
      });
    }

    // Format the response
    const formattedUsers = (users || []).map(user => ({
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      school_id: user.school_id,
      created_at: user.created_at,
      last_login: user.last_login,
      login_count: user.login_count || 0,
      status: user.status || 'active',
      schools: user.schools
    }));

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: totalCount || formattedUsers.length,
      pagination: {
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}