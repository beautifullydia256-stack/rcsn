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
        school_id,
        name,
        status,
        created_at,
        updated_at,
        student_count,
        teacher_count,
        subscription_plan,
        subscription_status,
        trial_ends_at,
        last_activity
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: schools, error } = await query;

    if (error) {
      console.error('Error fetching schools:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting schools count:', countError);
    }

    return NextResponse.json({
      schools: schools || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}