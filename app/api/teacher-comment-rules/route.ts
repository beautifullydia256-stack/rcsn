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

    // Prefer new report_comment_rules: school-specific first
    const { data: specific, error: specificErr } = await supabase
      .from('report_comment_rules')
      .select('min_percent, max_percent, comment_text')
      .eq('school_id', school_id)
      .eq('class_name', className)
      .order('min_percent');
    if (specificErr) return NextResponse.json({ error: specificErr.message }, { status: 500 });

    let rows = specific && specific.length > 0 ? specific : null;
    if (!rows) {
      // Fallback to global defaults (school_id IS NULL)
      const { data: global, error: globalErr } = await supabase
        .from('report_comment_rules')
        .select('min_percent, max_percent, comment_text')
        .is('school_id', null)
        .eq('class_name', className)
        .order('min_percent');
      if (globalErr) return NextResponse.json({ error: globalErr.message }, { status: 500 });
      rows = global || [];
    }

    // Map to legacy shape expected by UI (min_avg/max_avg/comment)
    const rules = (rows || []).map(r => ({
      min_avg: r.min_percent,
      max_avg: r.max_percent,
      comment: r.comment_text,
    }));
    return NextResponse.json({ rules });
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
    const { class_name, rules } = body || {};
    if (!class_name || !Array.isArray(rules)) {
      return NextResponse.json({ error: 'class_name and rules[] are required' }, { status: 400 });
    }

    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Upsert rules; simplest approach: delete then insert
    await supabase.from('teacher_comment_rules').delete().eq('school_id', school_id).eq('class_name', class_name);
    const payload = rules.map((r: any) => ({
      school_id,
      class_name,
      min_avg: Number(r.min_avg) || 0,
      max_avg: Number(r.max_avg) || 0,
      comment: String(r.comment || '')
    }));
    const { error } = await supabase.from('teacher_comment_rules').insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


