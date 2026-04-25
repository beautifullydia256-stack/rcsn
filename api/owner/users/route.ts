import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withOwnerAuth } from '../../../lib/middleware/ownerAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserFilters {
  role?: 'admin' | 'teacher' | 'parent' | 'student' | 'accountant' | 'librarian' | 'head_teacher';
  schoolId?: string;
  status?: 'active' | 'inactive';
  search?: string;
  limit?: number;
  offset?: number;
}

interface UserData {
  userId: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

async function getUsers(filters: UserFilters): Promise<{
  users: UserData[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalByRole: Record<string, number>;
    activeUsers: number;
    inactiveUsers: number;
  };
}> {
  try {
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Build query with filters
    let query = supabase
      .from('users')
      .select(`
        user_id,
        name,
        email,
        role,
        school_id,
        created_at,
        updated_at,
        schools!inner(name)
      `, { count: 'exact' });

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    if (filters.schoolId) {
      query = query.eq('school_id', filters.schoolId);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Activity filter (users active in last 30 days)
    if (filters.status === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('updated_at', thirtyDaysAgo.toISOString());
    } else if (filters.status === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('updated_at', thirtyDaysAgo.toISOString());
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: usersData, error, count } = await query;

    if (error) {
      console.error('Users query error:', error);
      throw new Error('Failed to fetch users');
    }

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('users')
      .select('role, updated_at');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalByRole: Record<string, number> = {};
    let activeUsers = 0;
    let inactiveUsers = 0;

    (summaryData || []).forEach((user: any) => {
      // Count by role
      totalByRole[user.role] = (totalByRole[user.role] || 0) + 1;

      // Count active/inactive
      const lastActivity = new Date(user.updated_at);
      if (lastActivity >= thirtyDaysAgo) {
        activeUsers++;
      } else {
        inactiveUsers++;
      }
    });

    // Transform user data
    const users: UserData[] = (usersData || []).map((user: any) => {
      const lastActivity = new Date(user.updated_at);
      const isActive = lastActivity >= thirtyDaysAgo;

      return {
        userId: user.user_id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.schools?.name || 'Unknown School',
        status: isActive ? 'active' : 'inactive',
        lastLogin: user.updated_at, // In production, track actual login times
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isActive,
      };
    });

    return {
      users,
      totalCount: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary: {
        totalByRole,
        activeUsers,
        inactiveUsers,
      },
    };

  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: UserFilters = {
      role: searchParams.get('role') as any,
      schoolId: searchParams.get('schoolId') || undefined,
      status: searchParams.get('status') as any,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await getUsers(filters);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Users API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        code: 'USERS_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}

// Export with owner authentication
export const GET = withOwnerAuth(handler, 'users_view', '/api/owner/users');