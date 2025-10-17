import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class');
    if (!className) return NextResponse.json({ error: 'class is required' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const { data, error } = await supabase
      .from('teacher_remarks_defaults')
      .select('default_remark')
      .eq('school_id', school_id)
      .eq('class_name', className)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ default_remark: data?.default_remark || '' });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { class_name, default_remark } = body || {};
    if (!class_name) return NextResponse.json({ error: 'class_name is required' }, { status: 400 });

    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const { error } = await supabase
      .from('teacher_remarks_defaults')
      .upsert({ school_id, class_name, default_remark: default_remark || '' }, { onConflict: 'school_id,class_name' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


