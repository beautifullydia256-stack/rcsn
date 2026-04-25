import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get schools data with basic metrics
    const { data: schools, error } = await supabase
      .from('schools')
      .select(`
        *,
        profiles!schools_admin_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schools:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schools data' },
        { status: 500 }
      );
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting schools count:', countError);
    }

    // Enhance schools data with additional metrics
    const enhancedSchools = schools?.map(school => ({
      ...school,
      student_count: Math.floor(Math.random() * 500) + 50, // Mock data
      teacher_count: Math.floor(Math.random() * 30) + 5,   // Mock data
      subscription_status: 'active', // Mock data
      last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    })) || [];

    return NextResponse.json({
      schools: enhancedSchools,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in schools API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}