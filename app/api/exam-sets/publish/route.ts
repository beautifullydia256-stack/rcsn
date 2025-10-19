import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const { exam_set_id, class_name, publish } = await request.json();
    if (!exam_set_id || !class_name) return NextResponse.json({ error: 'exam_set_id and class_name are required' }, { status: 400 });

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

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('exam_set_publications')
      .upsert({
        school_id,
        exam_set_id,
        class_name,
        published: !!publish,
        published_at: publish ? now : null,
        published_by: user.id
      }, { onConflict: 'school_id,exam_set_id,class_name' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, publication: data });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


