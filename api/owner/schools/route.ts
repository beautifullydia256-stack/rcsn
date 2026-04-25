import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('schools')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        status,
        subscription_plan,
        student_count,
        teacher_count,
        created_at,
        last_active,
        monthly_fee
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: schools, error, count } = await query;

    if (error) {
      console.error('Error fetching schools:', error);
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: schools || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Schools API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch schools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data: school, error } = await supabase
      .from('schools')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating school:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: school
    });

  } catch (error) {
    console.error('Create school API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create school',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}