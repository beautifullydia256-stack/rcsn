import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withOwnerAuth } from '../../../lib/middleware/ownerAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SchoolFilters {
  status?: 'active' | 'inactive' | 'trial' | 'suspended';
  subscriptionPlan?: string;
  activityLevel?: 'active' | 'inactive';
  search?: string;
  limit?: number;
  offset?: number;
}

interface SchoolData {
  schoolId: string;
  name: string;
  type: string;
  location: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  studentCount: number;
  userCount: number;
  lastActivity: string;
  storageUsage: number;
  storageLimit: number;
  monthlyRevenue: number;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

async function getSchools(filters: SchoolFilters): Promise<{
  schools: SchoolData[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  try {
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Build query with filters
    let query = supabase
      .from('schools')
      .select(`
        school_id,
        name,
        type,
        location,
        subscription_plan,
        created_at,
        updated_at,
        admin_id,
        users!inner(name, email, role),
        school_subscriptions(plan_name, status, monthly_amount),
        students(count)
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
    }

    if (filters.subscriptionPlan) {
      query = query.eq('subscription_plan', filters.subscriptionPlan);
    }

    // Activity level filter
    if (filters.activityLevel === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('updated_at', thirtyDaysAgo.toISOString());
    } else if (filters.activityLevel === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('updated_at', thirtyDaysAgo.toISOString());
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: schoolsData, error, count } = await query;

    if (error) {
      console.error('Schools query error:', error);
      throw new Error('Failed to fetch schools');
    }

    // Transform data
    const schools: SchoolData[] = (schoolsData || []).map((school: any) => {
      const admin = school.users?.find((u: any) => u.role === 'admin') || {};
      const subscription = school.school_subscriptions?.[0] || {};
      const studentCount = school.students?.[0]?.count || 0;
      const userCount = school.users?.length || 0;

      // Calculate storage usage (simulated - in production, get from storage API)
      const storageUsage = Math.random() * 500 + 100; // MB
      const storageLimit = subscription.plan_name === 'Premium' ? 10000 : 
                          subscription.plan_name === 'Standard' ? 5000 : 
                          subscription.plan_name === 'Basic' ? 2000 : 500;

      return {
        schoolId: school.school_id,
        name: school.name,
        type: school.type || 'Unknown',
        location: school.location || '',
        subscriptionPlan: subscription.plan_name || school.subscription_plan || 'Free (0-20)',
        subscriptionStatus: subscription.status || 'active',
        studentCount,
        userCount,
        lastActivity: school.updated_at,
        storageUsage: Math.round(storageUsage),
        storageLimit,
        monthlyRevenue: parseFloat(subscription.monthly_amount || '0'),
        createdAt: school.created_at,
        adminName: admin.name || 'Unknown',
        adminEmail: admin.email || '',
      };
    });

    return {
      schools,
      totalCount: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    };

  } catch (error) {
    console.error('Error fetching schools:', error);
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
    const filters: SchoolFilters = {
      status: searchParams.get('status') as any,
      subscriptionPlan: searchParams.get('subscriptionPlan') || undefined,
      activityLevel: searchParams.get('activityLevel') as any,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await getSchools(filters);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Schools API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch schools',
        code: 'SCHOOLS_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}

// Export with owner authentication
export const GET = withOwnerAuth(handler, 'schools_view', '/api/owner/schools');