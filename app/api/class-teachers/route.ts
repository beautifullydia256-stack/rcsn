import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
    const { class_name, teacher_id } = body || {};
    if (!class_name || !teacher_id) {
      return NextResponse.json({ error: 'class_name and teacher_id are required' }, { status: 400 });
    }

    // Resolve school_id of caller
    const { data: urow, error: uerr } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    if (uerr || !urow?.school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const school_id = urow.school_id as string;

    // Ensure the teacher belongs to same school
    const { data: trow, error: terr } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher_id', teacher_id)
      .eq('school_id', school_id)
      .single();
    if (terr || !trow) return NextResponse.json({ error: 'Teacher not found in this school' }, { status: 400 });

    // Clear any existing class_teacher_id for this class (enforce uniqueness)
    const { error: clearErr } = await supabase
      .from('class_template_settings')
      .update({ class_teacher_id: null })
      .eq('school_id', school_id)
      .eq('class_name', class_name);
    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 });

    // Check if class template setting exists
    const { data: existing } = await supabase
      .from('class_template_settings')
      .select('*')
      .eq('school_id', school_id)
      .eq('class_name', class_name)
      .maybeSingle();

    let setting;
    if (existing) {
      // Update existing record with class teacher
      const { data, error: upErr } = await supabase
        .from('class_template_settings')
        .update({ class_teacher_id: teacher_id })
        .eq('school_id', school_id)
        .eq('class_name', class_name)
        .select('*')
        .single();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      setting = data;
    } else {
      // Create new record with default template
      const { data, error: insErr } = await supabase
        .from('class_template_settings')
        .insert({ 
          school_id, 
          class_name, 
          class_teacher_id: teacher_id,
          template_id: 'template1', // Default template
          is_o_level: false
        })
        .select('*')
        .single();
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      setting = data;
    }

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error('Assign class teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: urow } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    const school_id = urow?.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const { data, error } = await supabase
      .from('class_template_settings')
      .select('class_name, class_teacher_id')
      .eq('school_id', school_id)
      .order('class_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ classes: data || [] });
  } catch (error) {
    console.error('List class teachers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


