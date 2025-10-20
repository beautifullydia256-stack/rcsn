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

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const { data, error } = await supabase
      .from('class_teacher_comments_settings')
      .select('id, min_percent, max_percent, comment_text')
      .eq('school_id', school_id)
      .eq('class_name', className)
      .order('min_percent');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ranges: data || [] });
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
    const { class_name, ranges } = body || {};
    if (!class_name || !Array.isArray(ranges)) {
      return NextResponse.json({ error: 'class_name and ranges[] are required' }, { status: 400 });
    }

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Use UPSERT to handle existing ranges
    const payload = ranges.map((r: any) => ({
      school_id,
      class_name,
      min_percent: Number(r.min_percent) || 0,
      max_percent: Number(r.max_percent) || 0,
      comment_text: String(r.comment_text || ''),
      created_by: user.id
    }));
    const { error } = await supabase
      .from('class_teacher_comments_settings')
      .upsert(payload, { 
        onConflict: 'school_id,class_name,min_percent,max_percent',
        ignoreDuplicates: false 
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const { error } = await supabase.from('class_teacher_comments_settings').delete().eq('id', id).eq('school_id', school_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


