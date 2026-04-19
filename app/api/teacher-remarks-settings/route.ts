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
    const subject = searchParams.get('subject') || '';
    const holistic = searchParams.get('holistic') === '1' || searchParams.get('mode') === 'holistic';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    if (holistic) {
      let hq = supabase
        .from('teacher_remarks_settings')
        .select('id, subject, holistic_grade_enum, comment_text')
        .eq('school_id', school_id)
        .not('holistic_grade_enum', 'is', null);
      if (subject) hq = hq.eq('subject', subject);
      const { data, error } = await hq;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ holisticRows: data || [] });
    }

    let query = supabase
      .from('teacher_remarks_settings')
      .select('id, subject, min_percent, max_percent, comment_text')
      .eq('school_id', school_id)
      .is('holistic_grade_enum', null)
      .order('min_percent');
    const { data, error } = subject ? await query.eq('subject', subject) : await query;
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
    const { subject, ranges, holistic, holisticRows } = body || {};
    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    // Get school_id from user metadata instead of users table to avoid 406 errors
    const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    await supabase.from('teacher_remarks_settings').delete().eq('school_id', school_id).eq('subject', subject);

    if (holistic === true && Array.isArray(holisticRows)) {
      const payload = holisticRows.map((r: any) => ({
        school_id,
        subject,
        holistic_grade_enum: String(r.holistic_grade_enum || '').trim(),
        min_percent: null,
        max_percent: null,
        comment_text: String(r.comment_text || ''),
        created_by: user.id,
      }));
      const { error } = await supabase.from('teacher_remarks_settings').insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (!Array.isArray(ranges)) {
      return NextResponse.json({ error: 'ranges[] is required (or holistic + holisticRows[])' }, { status: 400 });
    }

    const payload = ranges.map((r: any) => ({
      school_id,
      subject,
      holistic_grade_enum: null,
      min_percent: Number(r.min_percent) || 0,
      max_percent: Number(r.max_percent) || 0,
      comment_text: String(r.comment_text || ''),
      created_by: user.id,
    }));
    const { error } = await supabase.from('teacher_remarks_settings').insert(payload);
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

    const { error } = await supabase.from('teacher_remarks_settings').delete().eq('id', id).eq('school_id', school_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


