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

    // Use the function we created to get login activity with user details
    const { data: loginActivity, error } = await supabase
      .rpc('get_login_activity_with_users', { limit_count: limit });

    if (error) {
      console.error('Error fetching login activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      loginActivity: loginActivity || [],
      total: loginActivity?.length || 0
    });

  } catch (error) {
    console.error('Login Activity API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}